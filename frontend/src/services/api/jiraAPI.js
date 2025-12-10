// Jira API service
import { apiClient } from './client.js';

const jiraAPI = {
  // 获取Jira连接列表
  getConnections: async () => {
    const response = await apiClient.get('/api/jira/connections');
    return response.data;
  },

  // 创建Jira连接
  createConnection: async (connectionData) => {
    const response = await apiClient.post('/api/jira/connections', connectionData);
    return response.data;
  },

  // 更新Jira连接
  updateConnection: async (id, connectionData) => {
    const response = await apiClient.put(`/api/jira/connections/${id}`, connectionData);
    return response.data;
  },

  // 删除Jira连接
  deleteConnection: async (id) => {
    // 将字符串ID转换为ObjectId格式
    const response = await apiClient.delete(`/api/jira/connections/${id}`);
    return response.data;
  },

  // 测试Jira连接
  testConnection: async (connectionData) => {
    const response = await apiClient.post('/api/jira/connections/test', connectionData);
    return response.data;
  },

  // 获取支持的认证方式
  getAuthTypes: async () => {
    const response = await apiClient.get('/api/jira/config/auth-types');
    return response.data;
  },

  // 获取Jira字段配置
  getFields: async () => {
    const response = await apiClient.get('/api/jira/config/fields');
    return response.data;
  },

  // 获取OAuth授权URL
  getAuthUrl: async (connectionData) => {
    const response = await apiClient.get('/api/jira/oauth/auth-url', { params: connectionData });
    return response.data;
  },

  // 手动刷新OAuth令牌
  refreshToken: async (refreshToken, clientId, clientSecret) => {
    const response = await apiClient.post('/api/jira/oauth/refresh-token', {
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    });
    return response.data;
  },



  // 撤销OAuth令牌
  revokeToken: async (token, clientId, clientSecret) => {
    const response = await apiClient.post('/api/jira/oauth/revoke-token', {
      token: token,
      client_id: clientId,
      client_secret: clientSecret
    });
    return response.data;
  },

  // 交换授权码获取访问令牌
  exchangeToken(code, redirectUri) {
    return apiClient.post('/api/jira/oauth/exchange-token', {
      code: code,
      redirect_uri: redirectUri
    });
  },

  // 刷新OAuth令牌
  refreshToken: async (connectionId) => {
    const response = await apiClient.post('/api/jira/oauth/refresh-token', { connection_id: connectionId });
    return response.data;
  },

  // 获取可访问的Jira资源
  getAccessibleResources: async (connectionId) => {
    const response = await apiClient.get(`/api/jira/accessible-resources/${connectionId}`);
    return response.data;
  },

  // 切换Jira资源
  switchResource: async (connectionId, resourceId) => {
    const response = await apiClient.post(`/api/jira/switch-resource/${connectionId}`, { resource_id: resourceId });
    return response.data;
  },
  // 获取Jira连接状态
  getConnectionStatus: async (connectionId) => {
    const response = await apiClient.get(`/api/jira/connection-status/${connectionId}`);
    return response.data;
  }
};

export default jiraAPI;