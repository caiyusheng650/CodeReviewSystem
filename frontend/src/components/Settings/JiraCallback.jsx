import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container, Paper, Typography, CircularProgress, Box } from '@mui/material';
import jiraAPI from '../../services/api/jiraAPI';
import { useSnackbar } from '../../contexts/SnackbarContext';

const JiraCallback = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    const handleCallback = async () => {
      // Get URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (!code) {
        // Handle missing parameters
        showSnackbar(t('settings.jiraOAuthMissingParams'), 'error');
        navigate('/settings');
        return;
      }

      // Check if we've already handled this code (to prevent duplicate requests)
      const processedCode = localStorage.getItem('jira_oauth_processed_code');
      if (processedCode === code) {
        // We've already processed this code, navigate to settings
        navigate('/settings');
        return;
      }

      try {
        // Exchange authorization code for access token and create connection
        const response = await jiraAPI.exchangeToken(
          code,
          import.meta.env.VITE_JIRA_REDIRECT_URI
        );

        // Mark this code as processed to prevent duplicate requests
        localStorage.setItem('jira_oauth_processed_code', code);

        // Wait 2 seconds to ensure backend has time to update database
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Navigate back to Jira settings with success message
        navigate('/settings', { state: { message: t('settings.jiraConnectionSuccess') } });
      } catch (error) {
        console.error('Jira OAuth token exchange failed:', error);
        const errorMessage = error.response?.data?.detail || error.message || t('settings.jiraOAuthFailed');
        navigate('/settings');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {t('settings.jiraOAuthProcessing')}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {t('settings.jiraOAuthRedirectMessage')}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default JiraCallback;