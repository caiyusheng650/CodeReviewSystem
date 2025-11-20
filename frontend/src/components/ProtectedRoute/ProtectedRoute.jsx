import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { CircularProgress, Box } from '@mui/material'

/**
 * ProtectedRoute 高阶组件
 * 用于保护需要认证的路由
 * 
 * @param {Object} props - 组件属性
 * @param {React.Component} props.component - 需要保护的路由组件
 * @param {Object} props.props - 传递给路由组件的属性
 * @param {string} props.redirectTo - 未认证时重定向的路径，默认为 '/login'
 * @param {boolean} props.requireAuth - 是否需要认证，默认为 true
 * @returns {JSX.Element}
 */
const ProtectedRoute = ({ 
  component: Component, 
  props = {}, 
  redirectTo = '/login',
  requireAuth = true 
}) => {
  const { isAuthenticated, isLoading } = useAuth()

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
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
    )
  }

  // 如果不需要认证，直接渲染组件
  if (!requireAuth) {
    return <Component {...props} />
  }

  // 如果需要认证但用户未认证，重定向到登录页
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  // 用户已认证，渲染受保护的组件
  return <Component {...props} />
}

export default ProtectedRoute