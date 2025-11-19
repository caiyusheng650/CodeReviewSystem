import { apiClient } from './client';

export const codeReviewAPI = {
  // Get review results
  getReview: async (reviewId) => {
    const response = await apiClient.get(`/api/codereview/reviews/${reviewId}`);
    return response.data;
  },

  // Get review history
  getReviewHistory: async (filters) => {
    const response = await apiClient.get('/api/codereview/reviews', { params: filters });
    return response.data;
  },

  // Get latest review for current user
  getLatestReview: async () => {
    const response = await apiClient.get('/api/codereview/review-latest');
    return response.data;
  }
};