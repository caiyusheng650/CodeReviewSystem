import React from 'react';
import { Container, Typography, Paper, Box, CssBaseline } from '@mui/material';
import { useTranslation } from 'react-i18next';
import ApiKeyManager from './ApiKeyManager';
import JiraConnectionManager from './JiraConnectionManager';

const SettingsMain = () => {
  const { t } = useTranslation();

  return (
    <Container component="main" maxWidth="xl" sx={{ mb: 4 }}>
      <CssBaseline />
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('settings.pageTitle')}
        </Typography>
        
        {/* API Keys Management */}
        <ApiKeyManager />
        
        {/* Jira Connections Management */}
        <JiraConnectionManager />
      </Box>
    </Container>
  );
};

export default SettingsMain;