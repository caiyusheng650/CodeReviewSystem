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
import { LockOutlined, LightMode, DarkMode } from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';


const Login = ({ onThemeToggle, isDarkMode }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

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
      setError('登录失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      {/* 主题切换按钮 */}
      <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
        <Tooltip title={isDarkMode ? '切换到浅色主题' : '切换到深色主题'}>
          <IconButton color="inherit" onClick={onThemeToggle}>
            {isDarkMode ? <LightMode /> : <DarkMode />}
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
              智能代码审查系统
            </Typography>
            <Typography component="h2" variant="h5" sx={{ mt: 2 }}>
              登录
            </Typography>
          </Box>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="邮箱地址或用户名"
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
              label="密码"
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
              label="记住我"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : '登录'}
            </Button>
            <Grid container>
              <Grid item>
                <Link component="button" variant="body2" onClick={() => navigate('/register')}>
                  {"没有账户？注册"}
                </Link>
              </Grid>
            </Grid>
          </Box>
          
          
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;