import React from 'react';
import { Typography, Paper, Box, CssBaseline } from '@mui/material';
import { useTranslation } from 'react-i18next';
import ApiKeyManager from './ApiKeyManager';
import JiraConnectionManager from './JiraConnectionManager';
import AccountManager from './AccountManager';

const SettingsMain = () => {
  const { t } = useTranslation();

  return (
    <Box>
      {/* Account Management */}
      <AccountManager />
      
      {/* API Keys Management */}
      <ApiKeyManager />
      
      {/* Jira Connections Management */}
      <JiraConnectionManager />
    </Box>
  );
};

export default SettingsMain;