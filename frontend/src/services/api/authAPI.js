import { apiClient } from './client';

export const authAPI = {
  // User login
  login: async (email, password) => {
    // 使用URLSearchParams发送表单数据，符合OAuth2PasswordRequestForm格式
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await apiClient.post('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  },

  // User registration
  register: async (userData) => {
    const response = await apiClient.post('/api/auth/register', userData);
    return response.data;
  },

  // Get current user information
  getCurrentUser: async () => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },

  // Update user information
  updateUser: async (userData) => {
    const response = await apiClient.put('/api/auth/me', userData);
    return response.data;
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await apiClient.post('/api/auth/change-password', passwordData);
    return response.data;
  }
};