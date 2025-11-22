import React, { useState, useEffect, useMemo } from 'react'
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Switch,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
  Breadcrumbs,
  Link,
  TablePagination
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CopyAll as CopyAllIcon
} from '@mui/icons-material'
import { authAPI } from '../services/api/authAPI'
import { formatSmartTime } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext'
import { apikeyAPI } from '../services/api/apikeyAPI'
import { useTranslation } from 'react-i18next'

const Settings = ({ isDarkMode }) => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [apiKeyName, setApiKeyName] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [generatedApiKey, setGeneratedApiKey] = useState(null); // To show API key only once
  const [page, setPage] = useState(0); // 0-based page index
  const [rowsPerPage, setRowsPerPage] = useState(10); // 每页显示10条数据
  const { t, i18n } = useTranslation();

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
      // 重置到第一页当数据更新时
      setPage(0);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      showSnackbar(t('settings.fetchApiKeysFailed'), 'error');
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
      showSnackbar(t('settings.generateApiKeySuccess'), 'success');
    } catch (error) {
      console.error('Failed to generate API key:', error);
      showSnackbar(t('settings.generateApiKeyFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle toggling API key status
  const handleToggleApiKeyStatus = async (apiKeyId, currentStatus) => {
    try {
      setLoading(true);
      const newStatus = currentStatus === 'active' ? 'active' : 'inactive';
      await apikeyAPI.updateApiKeyStatus(apiKeyId, newStatus);
      // Update the local state
      setApiKeys(apiKeys.map(key =>
        key._id === apiKeyId ? { ...key, status: newStatus } : key
      ));
      showSnackbar(t('settings.updateApiKeyStatusSuccess'), 'success');
    } catch (error) {
      console.error('Failed to update API key status:', error);
      showSnackbar(t('settings.updateApiKeyStatusFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle copying API key to clipboard
  const handleCopyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(generatedApiKey.api_key);
      showSnackbar(t('settings.copyApiKeySuccess'), 'success');
    } catch (error) {
      console.error('Failed to copy API key:', error);
      showSnackbar(t('settings.copyApiKeyFailed'), 'error');
    }
  };

  // Handle deleting an API key
  const handleDeleteApiKey = async (apiKeyId) => {
    try {
      setLoading(true);
      await apikeyAPI.deleteApiKey(apiKeyId);
      // Update the local state
      setApiKeys(apiKeys.filter(key => key._id !== apiKeyId));
      showSnackbar(t('settings.deleteApiKeySuccess'), 'success');
    } catch (error) {
      console.error('Failed to delete API key:', error);
      showSnackbar(t('settings.deleteApiKeyFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // 处理页面切换
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // 处理每页显示数量变化
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // 重置到第一页
  };

  // 分页后的数据
  const paginatedApiKeys = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return apiKeys.slice(startIndex, startIndex + rowsPerPage);
  }, [apiKeys, page, rowsPerPage]);

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
    setOpenDialog(false)
    setApiKeyName('')
    setGeneratedApiKey(null) // Clear generated key when dialog closes
  }

  // Get status chip color
  const getStatusColor = (status) => {
    return status === 'active' ? 'success' : 'error'
  }

  // 将状态转换为中文显示
  const getStatusText = (status) => {
    return status === 'active' ? t('settings.active') : t('settings.inactive');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    );
  }
  return (
    <Container maxWidth="1200">
      <Box sx={{ mt: 6, mb: 4, height: '100vh' }}>
        {/* 面包屑导航 */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          
          <Typography color="text.primary">{t('settings.settings')}</Typography>
        </Breadcrumbs>

        <Typography variant="h4" component="h1" gutterBottom>
          {t('settings.settings')}
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h2">
              {t('settings.apiKeys')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              disabled={loading}
            >
              {t('settings.generateNewApiKey')}
            </Button>
          </Box>

          <TableContainer>
            <Table sx={{ minWidth: 1050 }} aria-label="API keys table">
              <TableHead>
                <TableRow>
                  <TableCell>{t('settings.name')}</TableCell>
                  <TableCell>{t('settings.keyPreview')}</TableCell>
                  <TableCell>{t('settings.status')}</TableCell>
                  <TableCell>{t('settings.createdAt')}</TableCell>
                  <TableCell>{t('settings.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedApiKeys.map((apiKey) => (
                  <TableRow
                    key={apiKey._id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {apiKey.name || t('settings.unnamed')}
                    </TableCell>
                    <TableCell>{apiKey.key_preview}</TableCell>
                    <TableCell>
                      <Chip
                        label={apiKey.status === 'active' ? t('settings.active') : t('settings.inactive')}
                        color={getStatusColor(apiKey.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatSmartTime(apiKey.created_at, t)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleToggleApiKeyStatus(apiKey._id, apiKey.status === 'active' ? 'inactive' : 'active')}
                            disabled={loading}
                          >
                            {apiKey.status === 'active' ? t('settings.disable') : t('settings.enable')}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleDeleteApiKey(apiKey._id)}
                            disabled={loading}
                          >
                            {t('settings.delete')}
                          </Button>
                        </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 分页控件 */}
          <TablePagination
            component="div"
            count={apiKeys.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]} // 可选择的每页显示数量
            labelRowsPerPage={t('common.rowsPerPage')}
            labelDisplayedRows={({ from, to, count }) => {
              return `${from}-${to} ${t('common.of')} ${count !== -1 ? count : `>${to}`}`;
            }}
          />

          {/* 统计信息 */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('common.displayedRecords', { 
                from: apiKeys.length > 0 ? (page * rowsPerPage + 1) : 0, 
                to: Math.min((page + 1) * rowsPerPage, apiKeys.length), 
                total: apiKeys.length 
              })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('common.totalRecords', { count: apiKeys.length })}
            </Typography>
          </Box>

        </Paper>
      </Box>

      {/* Generate API Key Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('settings.generateNewApiKey')}</DialogTitle>
        <DialogContent>
          {!generatedApiKey && (
            <TextField
              autoFocus
              margin="dense"
              label={t('settings.apiKeyName')}
              type="text"
              fullWidth
              value={apiKeyName}
              onChange={(e) => setApiKeyName(e.target.value)}
              helperText={t('settings.apiKeyNameHelper')}
            />
          )}
          {generatedApiKey && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('settings.yourApiKey')}
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
                    {t('settings.copy')}
                  </Button>
                </Box>
              </Paper>
              <Alert severity="info" sx={{ mt: 2 }}>
                {t('settings.apiKeyWarning')}
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            {t('settings.cancel')}
          </Button>
          {!generatedApiKey ? (
            <Button
              onClick={handleGenerateApiKey}
              variant="contained"
              disabled={loading}
            >
              {t('settings.generate')}
            </Button>
          ) : (
            <Button
              onClick={handleCloseDialog}
              variant="contained"
              disabled={loading}
            >
              {t('settings.done')}
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