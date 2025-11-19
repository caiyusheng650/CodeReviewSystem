import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, Box, CircularProgress, Typography } from '@mui/material'
import { theme, darkTheme } from './theme'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
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
  const [isDarkMode, setIsDarkMode] = useState(false)
  const { isAuthenticated, isLoading, user } = useAuth()

  // 切换主题
  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode)
  }

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
          <CircularProgress size={60} />
          <Typography variant="h6">加载中...</Typography>
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
                <Home isDarkMode={isDarkMode} user={user} /> : 
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
