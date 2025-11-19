import { apiClient } from './client';

export const apikeyAPI = {
  // List all API keys for the current user
  listApikeys: async () => {
    const response = await apiClient.get('/api/apikeys/list');
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