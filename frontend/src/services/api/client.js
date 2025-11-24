import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Create an axios instance with base URL
export const apiClient = axios.create({
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

// Helper method to create SSE requests with automatic token handling
apiClient.createSSERequest = (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  const fetchOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers
    }
  };
  
  return fetch(`${apiClient.defaults.baseURL}${url}`, fetchOptions);
};

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response ? error.response.data : error.message);
    return Promise.reject(error);
  }
);