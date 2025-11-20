import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { CircularProgress, Box } from '@mui/material'

/**
 * PublicRoute 高阶组件
 * 用于处理公共路由（如登录/注册），已认证用户访问时重定向到指定页面
 * 
 * @param {Object} props - 组件属性
 * @param {React.Component} props.component - 公共路由组件
 * @param {Object} props.props - 传递给路由组件的属性
 * @param {string} props.redirectTo - 已认证时重定向的路径，默认为 '/'
 * @param {boolean} props.allowAuthenticated - 是否允许已认证用户访问，默认为 false
 * @returns {JSX.Element}
 */
const PublicRoute = ({ 
  component: Component, 
  props = {}, 
  redirectTo = '/',
  allowAuthenticated = false 
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

  // 如果允许已认证用户访问，直接渲染组件
  if (allowAuthenticated) {
    return <Component {...props} />
  }

  // 如果用户已认证，重定向到指定页面
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  // 用户未认证，渲染公共组件
  return <Component {...props} />
}

export default PublicRoute