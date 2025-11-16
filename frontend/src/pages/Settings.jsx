import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  VpnKey as VpnKeyIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { apikeyAPI } from '../services/api';

const Settings = ({ isDarkMode }) => {
  const { user, setUser } = useAuth();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // 获取用户的API密钥
  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const keys = await apikeyAPI.listApikeys();
      // 按is_active排序，活跃的密钥在前面
      const sortedKeys = keys.sort((a, b) => b.is_active - a.is_active);
      setApiKeys(sortedKeys);
    } catch (error) {
      showSnackbar('获取API密钥失败: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 显示提示消息
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // 关闭提示消息
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // 生成新的API密钥
  const handleGenerateApiKey = async () => {
    try {
      const updatedUser = await apikeyAPI.generateNewApikey();
      showSnackbar('新的API密钥已生成');
      fetchApiKeys(); // 重新获取API密钥列表
    } catch (error) {
      showSnackbar('生成API密钥失败: ' + error.message, 'error');
    }
  };



  // 禁用API密钥
  const handleDisableApiKey = async (apiKey) => {
    try {
      const updatedUser = await apikeyAPI.disableApikey(apiKey.key);
      showSnackbar('API密钥已禁用');
      fetchApiKeys(); // 重新获取API密钥列表
    } catch (error) {
      showSnackbar('禁用API密钥失败: ' + error.message, 'error');
    }
  };

  // 启用API密钥
  const handleEnableApiKey = async (apiKey) => {
    try {
      const updatedUser = await apikeyAPI.enableApikey(apiKey.key);
      showSnackbar('API密钥已启用');
      fetchApiKeys(); // 重新获取API密钥列表
    } catch (error) {
      showSnackbar('启用API密钥失败: ' + error.message, 'error');
    }
  };

  // 组件挂载时获取API密钥
  useEffect(() => {
    if (user) {
      fetchApiKeys();
    }
  }, [user]);

  // 格式化日期显示
  const formatDate = (dateString) => {
    if (!dateString) return '无';
    const date = new Date(dateString);
    // 使用中文格式显示年月日时分秒
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}年${month}月${day}日`;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <>
          
          {/* API密钥列表 */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    我的API密钥
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleGenerateApiKey}
                  >
                    生成新的API密钥
                  </Button>
                </Box>
                
                {apiKeys.length === 0 ? (
                  <Alert severity="info">
                    您还没有API密钥。点击"生成新的API密钥"按钮创建一个。
                  </Alert>
                ) : (
                  <TableContainer sx={{ 
                    maxHeight: 400,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    '@media (max-width: 768px)': {
                      '& .MuiTableCell-root': {
                        padding: '6px 8px',
                        fontSize: '0.875rem'
                      }
                    }
                  }}>
                    <Table stickyHeader sx={{ 
                      minWidth: 750,
                      '@media (max-width: 768px)': {
                        minWidth: 500
                      }
                    }} aria-label="API密钥表">
                      <TableHead>
                        <TableRow>
                          <TableCell>API密钥</TableCell>
                          <TableCell align="center">状态</TableCell>
                          <TableCell align="center">创建时间</TableCell>
                          <TableCell align="center">禁用时间</TableCell>
                          <TableCell align="center">操作</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {apiKeys.map((apiKey) => (
                          <TableRow
                            key={apiKey.key}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                          >
                            <TableCell component="th" scope="row">
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span>*************</span>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={apiKey.is_active ? '活跃' : '已禁用'}
                                color={apiKey.is_active ? 'success' : 'default'}
                                size="small"
                                icon={apiKey.is_active ? <CheckCircleIcon /> : <CancelIcon />}
                              />
                            </TableCell>
                            <TableCell align="center">{formatDate(apiKey.created_at)}</TableCell>
                            <TableCell align="center">
                              {apiKey.disabled_at ? formatDate(apiKey.disabled_at) : '无'}
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                sx={{ mr: 1 }}
                                onClick={() => navigator.clipboard.writeText(apiKey.key).then(() => {
                                  showSnackbar('API密钥已复制到剪贴板');
                                })}
                              >
                                复制
                              </Button>
                              {apiKey.is_active ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<DeleteIcon />}
                                  onClick={() => handleDisableApiKey(apiKey)}
                                >
                                  禁用
                                </Button>
                              ) : (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  onClick={() => handleEnableApiKey(apiKey)}
                                >
                                  启用
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
      
      {/* 提示消息 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;