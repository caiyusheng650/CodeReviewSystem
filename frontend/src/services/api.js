import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000';

// Create an axios instance with base URL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add token
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response ? error.response.data : error.message);
    return Promise.reject(error);
  }
);

export const apikeyAPI = {
  // List all API keys for the current user
  listApikeys: async () => {
    const response = await apiClient.get('/api/apikeys');
    return response.data;
  },

  // Generate a new API key
  generateApiKey: async (name) => {
    const response = await apiClient.post('/api/apikeys/create', null, {
      params: { name }
    });
    return response.data;
  },

  // Update API key status
  updateApiKeyStatus: async (apiKeyId, status) => {
    const response = await apiClient.put(`/api/apikeys/${apiKeyId}/status`, { status });
    return response.data;
  },

  // Delete an API key
  deleteApiKey: async (apiKeyId) => {
    const response = await apiClient.delete(`/api/apikeys/${apiKeyId}`, {
      data: { confirm_delete: true }
    });
    return response.data;
  }
};

export const authAPI = {
  // User login
  login: async (email, password) => {
    const response = await apiClient.post('/api/auth/login', {
      username: email,
      password
    });
    return response.data;
  },

  // User registration
  register: async (email, password, username) => {
    const response = await apiClient.post('/api/auth/register', {
      email,
      password,
      username
    });
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
  }
};

export const codeReviewAPI = {
  // Submit a code review request
  submitReview: async (codeData) => {
    const response = await apiClient.post('/api/codereview/submit', codeData);
    return response.data;
  },

  // Get review results
  getReview: async (reviewId) => {
    const response = await apiClient.get(`/api/codereview/${reviewId}`);
    return response.data;
  },

  // Get review history
  getReviewHistory: async (filters) => {
    const response = await apiClient.get('/api/codereview/history', { params: filters });
    return response.data;
  }
};