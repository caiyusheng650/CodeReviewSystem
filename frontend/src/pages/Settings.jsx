import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import SettingsMain from '../components/Settings/SettingsMain';
import { useSnackbar } from '../contexts/SnackbarContext';
import PageLayout from '../components/Layout/PageLayout';

const Settings = ({ isDarkMode }) => {
  const { showSnackbar } = useSnackbar();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if there's a success message from Jira callback
    if (location.state && location.state.message) {
      showSnackbar(t(location.state.message), 'success');
    }
  }, [location.state, showSnackbar, t]);

  return (
    <PageLayout
      title={t('settings.pageTitle')}
      breadcrumbs={[
        {
          label: t('settings.pageTitle'),
          onClick: () => navigate('/settings')
        }
      ]}
    >
      <SettingsMain />
    </PageLayout>
  );
};

export default Settings;