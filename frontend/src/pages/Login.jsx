import React, { useState } from 'react';
import {
  Avatar,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
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
import { useSnackbar } from '../contexts/SnackbarContext';


const Login = ({ onThemeToggle, isDarkMode, onLanguageToggle }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t, i18n } = useTranslation();
  const { showSnackbar } = useSnackbar();

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
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'remember' ? checked : value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 使用认证上下文的登录函数
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        // 登录成功，跳转到首页
        navigate('/');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(t('auth.loginFailed'));
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
        <Tooltip title={t('app.switchLanguage')}>
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
              {t('auth.login')}
            </Typography>
          </Box>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label={t('auth.emailOrUsername')}
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
              name="password"
              label={t('auth.password')}
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="remember"
                  color="primary"
                  checked={formData.remember}
                  onChange={handleChange}
                />
              }
              label={t('auth.rememberMe')}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : t('auth.login')}
            </Button>
            <Grid container>
              <Grid>
                <Link href="/register" variant="body2">
                  {t('auth.noAccount')}
                </Link>
              </Grid>
            </Grid>
            
            {/* SSO登录分割线和按钮 */}
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ flexGrow: 1, height: 1, bgcolor: 'divider' }} />
                <Typography variant="body2" sx={{ mx: 2, color: 'text.secondary' }}>
                  {t('auth.or')}
                </Typography>
                <Box sx={{ flexGrow: 1, height: 1, bgcolor: 'divider' }} />
              </Box>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => showSnackbar(t('auth.ssoLoginInDevelopment'), 'info')}
              >
                {t('auth.ssoLogin')}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;