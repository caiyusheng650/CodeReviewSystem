import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Switch,
  Chip,
  Snackbar,
  Alert
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, VpnKey as VpnKeyIcon, CopyAll as CopyAllIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { apikeyAPI } from '../services/api';

const Settings = ({ isDarkMode }) => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [apiKeyName, setApiKeyName] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [generatedApiKey, setGeneratedApiKey] = useState(null); // To show API key only once

  // Fetch API keys when component mounts
  useEffect(() => {
    fetchApiKeys();
  }, []);

  // Fetch all API keys for the current user
  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const keys = await apikeyAPI.listApikeys();
      // Sort keys with active ones first
      const sortedKeys = keys.sort((a, b) => b.is_active - a.is_active);
      setApiKeys(sortedKeys);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      showSnackbar('获取 API 密钥失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle generating a new API key
  const handleGenerateApiKey = async () => {
    try {
      setLoading(true);
      const newKey = await apikeyAPI.generateApiKey(apiKeyName || 'My API Key');
      // Show the generated key only once
      setGeneratedApiKey(newKey);
      // Refresh the API keys list
      fetchApiKeys();
      // Reset the dialog form
      setApiKeyName('');
      showSnackbar('API 密钥生成成功', 'success');
    } catch (error) {
      console.error('Failed to generate API key:', error);
      showSnackbar('API 密钥生成失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle toggling API key status
  const handleToggleApiKeyStatus = async (apiKeyId, currentStatus) => {
    try {
      setLoading(true);
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await apikeyAPI.updateApiKeyStatus(apiKeyId, newStatus);
      // Update the local state
      setApiKeys(apiKeys.map(key =>
        key._id === apiKeyId ? { ...key, status: newStatus } : key
      ));
      showSnackbar('API 密钥状态更新成功', 'success');
    } catch (error) {
      console.error('Failed to update API key status:', error);
      showSnackbar('API 密钥状态更新失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle copying API key to clipboard
  const handleCopyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(generatedApiKey.api_key);
      showSnackbar('API 密钥已复制到剪贴板', 'success');
    } catch (error) {
      console.error('Failed to copy API key:', error);
      showSnackbar('API 密钥复制失败', 'error');
    }
  };

  // Handle deleting an API key
  const handleDeleteApiKey = async (apiKeyId) => {
    try {
      setLoading(true);
      await apikeyAPI.deleteApiKey(apiKeyId);
      // Update the local state
      setApiKeys(apiKeys.filter(key => key._id !== apiKeyId));
      showSnackbar('API 密钥删除成功', 'success');
    } catch (error) {
      console.error('Failed to delete API key:', error);
      showSnackbar('API 密钥删除失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Show snackbar message
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  // Close snackbar
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setApiKeyName('');
    setGeneratedApiKey(null); // Clear generated key when dialog closes
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '从未';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get status chip color
  const getStatusColor = (status) => {
    return status === 'active' ? 'success' : 'error';
  };

  // 将状态转换为中文显示
  const getStatusText = (status) => {
    return status === 'active' ? '已启用' : '已禁用';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    );
  }
  return (
    <Container maxWidth="1050">
      <Box sx={{ mt: 4, mb: 4, height: 'calc(100vh - 200px)' }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              API 密钥
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              disabled={loading}
            >
              生成新 API 密钥
            </Button>
          </Box>

          <TableContainer>
            <Table sx={{ minWidth: 1050 }} aria-label="API keys table">
              <TableHead>
                <TableRow>
                  <TableCell>名称</TableCell>
                  <TableCell>密钥预览</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>使用次数</TableCell>
                  <TableCell>速率限制</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell>最后使用</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {apiKeys.map((apiKey) => (
                  <TableRow
                    key={apiKey._id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {apiKey.name || '未命名'}
                    </TableCell>
                    <TableCell>{apiKey.key_preview}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(apiKey.status)}
                        color={getStatusColor(apiKey.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{apiKey.usage_count || 0}</TableCell>
                    <TableCell>{apiKey.rate_limit || 1000}</TableCell>
                    <TableCell>{formatDate(apiKey.created_at)}</TableCell>
                    <TableCell>{formatDate(apiKey.last_used)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Switch
                          checked={apiKey.status === 'active'}
                          onChange={() => handleToggleApiKeyStatus(apiKey._id, apiKey.status)}
                          disabled={loading}
                          color="primary"
                        />
                        <Button
                          size="small"
                          color="error"
                          variant="contained"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteApiKey(apiKey._id)}
                          disabled={loading}
                        >
                          删除
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

        </Paper>
      </Box>

      {/* Generate API Key Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>生成新 API 密钥</DialogTitle>
        <DialogContent>
          {!generatedApiKey && (
            <TextField
              autoFocus
              margin="dense"
              label={"API 密钥名称"}
              type="text"
              fullWidth
              value={apiKeyName}
              onChange={(e) => setApiKeyName(e.target.value)}
              helperText="为您的 API 密钥输入一个描述性名称"
            />
          )}
          {generatedApiKey && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                您的 API 密钥:（立即复制，您将不会再次看到它！请认真记住它！）
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" sx={{ flex: 1, wordBreak: 'break-all' }}>
                    {generatedApiKey.api_key}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CopyAllIcon />}
                    onClick={handleCopyApiKey}
                    disabled={loading}
                  >
                    复制
                  </Button>
                </Box>
              </Paper>
              <Alert severity="info" sx={{ mt: 2 }}>
                这是您此生唯一一次机会来看到此 API 密钥。请安全存储！
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            取消
          </Button>
          {!generatedApiKey ? (
            <Button
              onClick={handleGenerateApiKey}
              variant="contained"
              disabled={loading}
            >
              生成
            </Button>
          ) : (
            <Button
              onClick={handleCloseDialog}
              variant="contained"
              disabled={loading}
            >
              完成
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
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