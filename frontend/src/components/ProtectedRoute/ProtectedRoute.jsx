import React from 'react'
import { Box, CircularProgress } from '@mui/material'
import { useAuth } from '../../contexts/AuthContext'
import { Navigate } from 'react-router-dom'

// 创建memo化的LoadingSpinner组件
const LoadingSpinner = React.memo(() => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh'
    }}
  >
    <CircularProgress />
  </Box>
))

const ProtectedRoute = ({ component: Component, props = {} }) => {
  const { isAuthenticated, isLoading } = useAuth()

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return <LoadingSpinner />
  }

  // 如果用户未认证，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // 如果用户已认证，渲染受保护组件
  return <Component {...props} />
}

export default ProtectedRoute