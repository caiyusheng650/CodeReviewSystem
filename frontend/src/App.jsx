import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
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
import Documentation from './pages/Documentation'
import NotFound from './pages/NotFound'
import JiraCallback from './components/Settings/JiraCallback'
import AppBar from './components/AppBar/AppBar'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SnackbarProvider } from './contexts/SnackbarContext'
import { I18nextProvider, useTranslation } from 'react-i18next'
import i18n from './i18n'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import PublicRoute from './components/PublicRoute/PublicRoute'
import './App.css'

// 内部应用组件，使用认证上下文
// 创建一个带AppBar的布局组件
function Layout({ children, onThemeToggle, isDarkMode }) {
  const location = useLocation();
  const { t } = useTranslation();
  const showAppBar = !['/login', '/register'].includes(location.pathname);

  // 使用useTranslation钩子创建响应式的menuItems
  const menuItems = [
    { label: t('navigation.home'), path: '/' },
    { label: t('navigation.reviews'), path: '/reviews' },
    { label: t('navigation.documentation'), path: '/documentation' },
    { label: t('navigation.settings'), path: '/settings' },
  ];

  // 语言切换处理函数
  const handleLanguageToggle = (newLang) => {
  };

  return (
    <>
      {showAppBar && (
        <AppBar
          title={t('app.title')}
          menuItems={menuItems}
          showSearch={true}
          showNotifications={true}
          onThemeToggle={onThemeToggle}
          isDarkMode={isDarkMode}
          onLanguageToggle={handleLanguageToggle}
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



  // 如果是小屏幕，显示提醒信息
  if (false && isSmallScreen) {
    return (
      <I18nextProvider i18n={i18n}>
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
                {i18n.t('app.screenSizeWarning')}
              </Typography>
            </Box>


            <Typography variant="body1" color="text.secondary" >
              {i18n.t('app.screenSizeMessage')}
            </Typography>
          </Box>
        </ThemeProvider>
      </I18nextProvider>
    )
  }

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={isDarkMode ? darkTheme : theme}>
        <CssBaseline />
        <Router>
          <Layout onThemeToggle={handleThemeToggle} isDarkMode={isDarkMode}>
            <Routes>
              {/* 登录页面路由 - 使用PublicRoute */}
              <Route
                path="/login"
                element={
                  <PublicRoute
                    component={Login}
                    props={{ onThemeToggle: handleThemeToggle, isDarkMode }}
                  />
                }
              />

              {/* 注册页面路由 - 使用PublicRoute */}
              <Route
                path="/register"
                element={
                  <PublicRoute
                    component={Register}
                    props={{ onThemeToggle: handleThemeToggle, isDarkMode }}
                  />
                }
              />

              {/* 受保护的路由 - 使用ProtectedRoute */}
              <Route
                path="/"
                element={
                  <ProtectedRoute
                    component={Home}
                    props={{ onThemeToggle: handleThemeToggle, isDarkMode, user }}
                  />
                }
              />

              {/* 设置页面路由 - 使用ProtectedRoute */}
              <Route
                path="/settings"
                element={
                  <ProtectedRoute
                    component={Settings}
                    props={{ isDarkMode, user }}
                  />
                }
              />

              {/* 审查列表页面路由 - 使用ProtectedRoute */}
              <Route
                path="/reviews"
                element={
                  <ProtectedRoute
                    component={Reviews}
                    props={{ isDarkMode }}
                  />
                }
              />

              {/* 审查详情页面路由 - 使用ProtectedRoute */}
              <Route
                path="/reviews/:reviewId"
                element={
                  <ProtectedRoute
                    component={ReviewDetail}
                    props={{ isDarkMode }}
                  />
                }
              />

              {/* 文档页面路由 - 使用ProtectedRoute */}
              <Route
                path="/documentation"
                element={
                  <ProtectedRoute
                    component={Documentation}
                    props={{ isDarkMode }}
                  />
                }
              />
              
              {/* Jira OAuth回调路由 - 使用ProtectedRoute */}
              <Route
                path="/settings/jira/callback"
                element={
                  <ProtectedRoute
                    component={JiraCallback}
                    props={{ isDarkMode }}
                  />
                }
              />

              

              <Route
                path="/not-found"
                element={<NotFound isDarkMode={isDarkMode} />}
              />
              
              {/* 404页面 - 不需要认证 */}
              <Route
                path="*"
                element={<NotFound isDarkMode={isDarkMode} />}
              />

              
              
            </Routes>
          </Layout>
        </Router>
      </ThemeProvider>
    </I18nextProvider>
  )
}

// 主应用组件，包装认证提供者和Snackbar提供者
function App() {
  return (
    <AuthProvider>
      <SnackbarProvider>
        <AppContent />
      </SnackbarProvider>
    </AuthProvider>
  )
}

export default App
