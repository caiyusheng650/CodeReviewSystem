import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, Box, CircularProgress, Typography } from '@mui/material'
import { Warning, Devices, ArrowForward } from '@mui/icons-material'
import { theme, darkTheme } from './theme'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Reviews from './pages/Reviews'
import ReviewDetail from './pages/ReviewDetail'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import AppBar from './components/AppBar/AppBar'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import './App.css'

// 内部应用组件，使用认证上下文
// 创建一个带AppBar的布局组件
function Layout({ children, onThemeToggle, isDarkMode }) {
  const location = useLocation();
  const showAppBar = !['/login', '/register'].includes(location.pathname);

  const menuItems = [
    { label: '首页', path: '/' },
    { label: '审查', path: '/reviews' },
    { label: '设置', path: '/settings' },
  ];

  return (
    <>
      {showAppBar && (
        <AppBar
          title="智能代码审查系统"
          menuItems={menuItems}
          showSearch={true}
          showNotifications={true}
          onThemeToggle={onThemeToggle}
          isDarkMode={isDarkMode}
        />
      )}
      {children}
    </>
  );
}

function AppContent() {
  // 从localStorage获取dark mode设置，如果没有则默认为false
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const { isAuthenticated, isLoading, user } = useAuth()

  // 切换主题并保存到localStorage
  const handleThemeToggle = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    localStorage.setItem('darkMode', JSON.stringify(newMode))
  }

  // 检测屏幕尺寸
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768) // 小于768px视为小屏幕
    }

    // 初始检测
    checkScreenSize()

    // 监听窗口大小变化
    window.addEventListener('resize', checkScreenSize)

    return () => {
      window.removeEventListener('resize', checkScreenSize)
    }
  }, [])

  // 如果正在加载，显示加载指示器
  if (isLoading) {
    return (
      <ThemeProvider theme={isDarkMode ? darkTheme : theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    )
  }

  // 如果是小屏幕，显示提醒信息
  if (isSmallScreen) {
    return (
      <ThemeProvider theme={isDarkMode ? darkTheme : theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column',
            gap: 3,
            padding: 4,
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Warning
              sx={{
                fontSize: 64,
                color: 'warning.main',
              }}
            />
            <Typography variant="h4" color="warning.main" fontWeight="bold">
              屏幕尺寸提醒
            </Typography>
          </Box>


          <Typography variant="body1" color="text.secondary" >
            请移步电脑
          </Typography>
        </Box>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : theme}>
      <CssBaseline />
      <Router>
        <Layout onThemeToggle={handleThemeToggle} isDarkMode={isDarkMode}>
          <Routes>
            {/* 登录页面路由 */}
            <Route
              path="/login"
              element={
                isAuthenticated ?
                  <Navigate to="/" replace /> :
                  <Login onThemeToggle={handleThemeToggle} isDarkMode={isDarkMode} />
              }
            />

            {/* 注册页面路由 */}
            <Route
              path="/register"
              element={
                isAuthenticated ?
                  <Navigate to="/" replace /> :
                  <Register onThemeToggle={handleThemeToggle} isDarkMode={isDarkMode} />
              }
            />

            {/* 受保护的路由 */}
            <Route
              path="/"
              element={
                isAuthenticated ?
                  <Home onThemeToggle={handleThemeToggle} isDarkMode={isDarkMode} user={user} /> :
                  <Navigate to="/login" replace />
              }
            />

            {/* 设置页面路由 */}
            <Route
              path="/settings"
              element={
                isAuthenticated ?
                  <Settings isDarkMode={isDarkMode} user={user} /> :
                  <Navigate to="/login" replace />
              }
            />

            {/* 审查列表页面路由 */}
            <Route
              path="/reviews"
              element={
                isAuthenticated ?
                  <Reviews isDarkMode={isDarkMode} /> :
                  <Navigate to="/login" replace />
              }
            />

            {/* 审查详情页面路由（带reviewId参数） */}
            <Route
              path="/reviews/:reviewId"
              element={
                isAuthenticated ?
                  <ReviewDetail isDarkMode={isDarkMode} /> :
                  <Navigate to="/login" replace />
              }
            />

            {/* 404页面 - 需要放在最后 */}
            <Route
              path="*"
              element={<NotFound isDarkMode={isDarkMode} />}
            />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  )
}

// 主应用组件，包装认证提供者
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
