import React, { useState } from 'react';
import {
  Avatar,
  Button,
  TextField,
  Link,
  Grid,
  Box,
  Typography,
  Container,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import { LockOutlined, LightMode, DarkMode, Language as LanguageIcon } from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

function Copyright(props) {
  const { t, i18n } = useTranslation();
  
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="#">
        {t('app.title')}
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const Register = ({ onThemeToggle, isDarkMode, onLanguageToggle }) => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t, i18n } = useTranslation();

  // 语言切换处理函数
  const handleLanguageToggle = () => {
    const currentLang = i18n.language
    const newLang = currentLang === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(newLang)
    
    // 如果有外部语言切换回调，则调用
    if (onLanguageToggle) {
      onLanguageToggle(newLang)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    // 表单验证
    if (!formData.email || !formData.username || !formData.password || !formData.confirmPassword) {
      setError(t('auth.fillAllFields'));
      setLoading(false);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.passwordMismatch'));
      setLoading(false);
      return;
    }
    
    if (formData.password.length < 6) {
      setError(t('auth.passwordMinLength'));
      setLoading(false);
      return;
    }

    try {
      // 使用认证上下文的注册函数
      const result = await register({
        email: formData.email,
        username: formData.username,
        password: formData.password
      });
      
      if (result.success) {
        // 注册成功，跳转到首页
        navigate('/');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      {/* 主题切换按钮和语言切换按钮 */}
      <Box sx={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 1 }}>
        <Tooltip title={isDarkMode ? t('app.switchToLight') : t('app.switchToDark')}>
          <IconButton color="inherit" onClick={onThemeToggle}>
            {isDarkMode ? <LightMode /> : <DarkMode />}
          </IconButton>
        </Tooltip>
        <Tooltip title={t('language.switch')}>
          <IconButton color="inherit" onClick={handleLanguageToggle}>
            <LanguageIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            
            <Typography component="h1" variant="h4">
              {t('app.title')}
            </Typography>
            <Typography component="h2" variant="h5" sx={{ mt: 2 }}>
              {t('auth.register')}
            </Typography>
          </Box>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label={t('auth.email')}
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label={t('auth.username')}
              name="username"
              autoComplete="username"
              value={formData.username}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label={t('auth.password')}
              type="password"
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label={t('auth.confirmPassword')}
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : t('auth.register')}
            </Button>
            
            <Grid container>
              <Grid>
                <Link href="/login" variant="body2">
                  {t('auth.haveAccount')}
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;