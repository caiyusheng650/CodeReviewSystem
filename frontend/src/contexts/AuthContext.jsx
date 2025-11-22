import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authAPI } from '../services/api/authAPI';

// 创建认证上下文
const AuthContext = createContext();

// 自定义hook，用于使用认证上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const hasCheckedAuth = useRef(false);

  // 检查用户是否已登录
  useEffect(() => {
    const checkAuthStatus = async () => {
      // 防止在StrictMode下重复检查
      if (hasCheckedAuth.current) return;
      hasCheckedAuth.current = true;
      
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await authAPI.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('验证用户身份失败:', error);
          localStorage.removeItem('token');
        }
      }
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  // 登录函数
  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      
      // 保存token
      localStorage.setItem('token', response.access_token);
      
      // 设置用户信息
      setUser(response.user);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      console.error('登录失败:', error);
      return { 
        success: false, 
        error: error.message || '登录失败，请检查您的凭据' 
      };
    }
  };

  // 注册函数
  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      
      // 注册成功后自动登录
      const loginResult = await login(userData.email || userData.username, userData.password);
      
      return { 
        success: true, 
        user: response,
        loginResult 
      };
    } catch (error) {
      console.error('注册失败:', error);
      return { 
        success: false, 
        error: error.message || '注册失败，请稍后再试' 
      };
    }
  };

  // 登出函数
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  // 提供的值
  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;