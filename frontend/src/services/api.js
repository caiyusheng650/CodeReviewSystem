// API基础配置
const API_BASE_URL = 'http://localhost:8000/api';

// 通用请求函数
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // 获取token并添加到请求头
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers,
  };
  
  try {
    const response = await fetch(url, config);
    
    // 如果响应状态码不是2xx，抛出错误
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `请求失败: ${response.status}`);
    }
    
    // 尝试解析JSON响应
    return await response.json();
  } catch (error) {
    console.error('API请求错误:', error);
    throw error;
  }
};

// 认证相关API
export const authAPI = {
  // 用户登录
  login: async (email, password) => {
    const formData = new FormData();
    formData.append('username', email); // FastAPI OAuth2PasswordRequestForm 使用username字段
    formData.append('password', password);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        body: formData,
        // 不设置Content-Type，让浏览器自动设置multipart/form-data边界
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `请求失败: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('登录请求错误:', error);
      throw error;
    }
  },
  
  // 用户注册
  register: async (userData) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  // 获取当前用户信息
  getCurrentUser: async () => {
    return apiRequest('/auth/me', {
      method: 'GET',
    });
  },
};

// 通用受保护API
export const protectedAPI = {
  // 访问受保护的路由
  getProtectedData: async () => {
    return apiRequest('/protected', {
      method: 'GET',
    });
  },
};

// API密钥管理API
export const apikeyAPI = {
  // 生成新的API密钥
  generateNewApikey: async () => {
    return apiRequest('/apikeys', {
      method: 'POST',
    });
  },
  
  // 列出所有API密钥
  listApikeys: async () => {
    return apiRequest('/apikeys', {
      method: 'GET',
    });
  },
  
  // 禁用API密钥
  disableApikey: async (apikey) => {
    return apiRequest(`/apikeys/${apikey}/disable`, {
      method: 'PUT',
    });
  },
  
  // 启用API密钥
  enableApikey: async (apikey) => {
    return apiRequest(`/apikeys/${apikey}/enable`, {
      method: 'PUT',
    });
  },
  
  // 删除API密钥
  deleteApikey: async (apikey) => {
    return apiRequest(`/apikeys/${apikey}`, {
      method: 'DELETE',
    });
  },
};

export default apiRequest;