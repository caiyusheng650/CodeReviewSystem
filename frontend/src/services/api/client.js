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

// Response interceptor to handle errors and token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // 检查是否是401错误（令牌过期）
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // 检查是否是Jira相关的请求
      const isJiraRequest = originalRequest.url.includes('/api/jira/');
      
      if (isJiraRequest) {
        // 提取连接ID（从URL中提取）
        const connectionIdMatch = originalRequest.url.match(/\/api\/jira\/(?:connections|accessible-resources|switch-resource)\/([^\/]+)/);
        const connectionId = connectionIdMatch ? connectionIdMatch[1] : null;
        
        if (connectionId && !isRefreshing) {
          originalRequest._retry = true;
          isRefreshing = true;

          try {
            // 调用Jira令牌刷新API
            const response = await apiClient.post(`/api/jira/oauth/refresh-token`, { 
              connection_id: connectionId 
            });
            
            if (response.data.success) {
              processQueue(null, response.data.access_token);
              // 重试原请求
              return apiClient(originalRequest);
            }
          } catch (refreshError) {
            processQueue(refreshError, null);
            // 刷新失败，可能需要重新授权
            console.error('Jira令牌刷新失败:', refreshError);
            
            // 可以在这里触发重新授权流程
            // 例如：window.location.href = '/settings?reauth=jira';
            
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        } else if (isRefreshing) {
          // 如果正在刷新，将请求加入队列等待
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          }).catch(err => {
            return Promise.reject(err);
          });
        }
      }
    }
    
    return Promise.reject(error);
  }
);