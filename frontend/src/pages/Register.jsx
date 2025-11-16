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
import { LockOutlined, LightMode, DarkMode } from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Copyright(props) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="#">
        智能代码审查系统
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const Register = ({ onThemeToggle, isDarkMode }) => {
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

    // 验证密码
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
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
      setError('注册失败，请稍后再试');
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
              注册
            </Typography>
          </Box>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="邮箱地址"
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
              label="用户名"
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
              label="密码"
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
              label="确认密码"
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
              {loading ? <CircularProgress size={24} /> : '注册'}
            </Button>
            
            <Grid container>
              <Grid item>
                <Link component="button" variant="body2" onClick={() => navigate('/login')}>
                  {"已有账户？登录"}
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