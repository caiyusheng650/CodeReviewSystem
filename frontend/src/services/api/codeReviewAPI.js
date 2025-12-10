import { apiClient } from './client';

const codeReviewAPI = {
  // Get review results - 基础信息（不包含大字段）
  getReviewBase: async (reviewId) => {
    const response = await apiClient.get(`/api/codereview/reviews/${reviewId}/base`);
    return response.data;
  },

  // Get review results - 详细信息（包含所有字段）
  getReviewDetail: async (reviewId) => {
    const response = await apiClient.get(`/api/codereview/reviews/${reviewId}/detail`);
    return response.data;
  },

  // Get review results - 兼容版本（保持向后兼容）
  getReview: async (reviewId) => {
    const response = await apiClient.get(`/api/codereview/reviews/${reviewId}`);
    return response.data;
  },

  // Get review by GitHub Action ID - 基础信息
  getReviewByGitHubActionBase: async (githubActionId) => {
    const response = await apiClient.get(`/api/codereview/reviews/github-action/${githubActionId}/base`);
    return response.data;
  },

  // Get review by GitHub Action ID - 详细信息
  getReviewByGitHubActionDetail: async (githubActionId) => {
    const response = await apiClient.get(`/api/codereview/reviews/github-action/${githubActionId}/detail`);
    return response.data;
  },

  // Get review by GitHub Action ID - 兼容版本
  getReviewByGitHubAction: async (githubActionId) => {
    const response = await apiClient.get(`/api/codereview/reviews/github-action/${githubActionId}`);
    return response.data;
  },

  // Get review history
  getReviewHistory: async (filters) => {
    const response = await apiClient.get('/api/codereview/reviews', { params: filters });
    return response.data;
  },

  // Get latest review for current user - 基础信息
  getLatestReviewBase: async () => {
    const response = await apiClient.get('/api/codereview/review-latest/base');
    return response.data;
  },

  // Get latest review for current user - 详细信息
  getLatestReviewDetail: async () => {
    const response = await apiClient.get('/api/codereview/review-latest/detail');
    return response.data;
  },

  // Get latest review for current user - 兼容版本
  getLatestReview: async () => {
    const response = await apiClient.get('/api/codereview/review-latest');
    return response.data;
  },

  // Mark/unmark an issue
  markIssue: async (reviewId, issueId, marked) => {
    const response = await apiClient.post(`/api/codereview/reviews/${reviewId}/mark-issue`, {
      issue_id: issueId,
      marked: marked
    });
    return response.data;
  },

  // 同步问题到Jira
  syncIssueToJira: async (reviewId, issueId, connectionId, jiraFields) => {
    const response = await apiClient.post(`/api/codereview/reviews/${reviewId}/issues/${issueId}/sync-to-jira`, {
      connection_id: connectionId,
      jira_fields: jiraFields
    });
    return response.data;
  }
};

export default codeReviewAPI;