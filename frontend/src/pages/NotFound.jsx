import React from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon } from '@mui/icons-material';

const NotFound = ({ isDarkMode = false }) => {
  const navigate = useNavigate();

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
        页面未找到
      </Typography>
      
      <Typography 
        variant="body1" 
        sx={{ 
          mb: 4,
          color: isDarkMode ? 'text.secondary' : 'text.primary'
        }}
      >
        抱歉，您访问的页面不存在或已被移除。
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
        返回首页
      </Button>
    </Container>
  );
};

export default NotFound;