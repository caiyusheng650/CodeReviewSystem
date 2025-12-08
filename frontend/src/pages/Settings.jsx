import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import SettingsMain from '../components/Settings/SettingsMain';
import { Breadcrumbs, Typography, Box } from '@mui/material';
import { useSnackbar } from '../contexts/SnackbarContext';

const Settings = ({ isDarkMode }) => {
  const { showSnackbar } = useSnackbar();
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    // Check if there's a success message from Jira callback
    if (location.state && location.state.message) {
      showSnackbar(t(location.state.message), 'success');
    }
  }, [location.state, showSnackbar, t]);

  return (
    <Box sx={{ p: 3, mx: 'auto', mt: 6, position: 'relative' }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Typography linkComponent="button" onClick={() => navigate('/settings')} sx={{ cursor: 'pointer' }}>
          {t('settings.pageTitle')}
        </Typography>
      </Breadcrumbs>
      <SettingsMain />
    </Box>
  );
};

export default Settings;