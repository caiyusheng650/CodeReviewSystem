import React from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const NotFound = ({ isDarkMode = false }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <Container 
      maxWidth="sm" 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        textAlign: 'center',
        py: 4
      }}
    >
      <Typography 
        variant="h1" 
        component="h1" 
        sx={{ 
          fontSize: '6rem', 
          fontWeight: 'bold', 
          color: 'primary.main',
          mb: 2
        }}
      >
        404
      </Typography>
      
      <Typography variant="h4" component="h2" gutterBottom>
        {t('notFound.pageNotFound')}
      </Typography>
      
      <Typography 
        variant="body1" 
        sx={{ 
          mb: 4,
          color: isDarkMode ? 'text.secondary' : 'text.primary'
        }}
      >
        {t('notFound.pageNotFoundMessage')}
      </Typography>
      
      <Button
        variant="contained"
        size="large"
        startIcon={<HomeIcon />}
        onClick={handleGoHome}
        sx={{
          px: 4,
          py: 1.5
        }}
      >
        {t('notFound.backToHome')}
      </Button>
    </Container>
  );
};

export default NotFound;