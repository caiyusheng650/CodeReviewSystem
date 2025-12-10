import React, { useState, useEffect, useMemo } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Tooltip,
  TablePagination
} from '@mui/material';
import {
  Link as LinkIcon,
  Science as TestTubeIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import jiraAPI from '../../services/api/jiraAPI';
import { formatSmartTime } from '../../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from '../../contexts/SnackbarContext';

const JiraConnectionManager = () => {
  const { showSnackbar } = useSnackbar();
  const { t } = useTranslation();
  const [jiraConnections, setJiraConnections] = useState([]);
  // Get Jira OAuth configuration from environment variables
  const jiraClientId = import.meta.env.VITE_JIRA_CLIENT_ID || '';
  const jiraClientSecret = import.meta.env.VITE_JIRA_CLIENT_SECRET || '';
  const jiraRedirectUri = import.meta.env.VITE_JIRA_REDIRECT_URI || '';
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch Jira connections when component mounts
  useEffect(() => {
    fetchJiraConnections();
  }, []);

  // Jira Connection Functions
  const fetchJiraConnections = async () => {
    try {
      setLoading(true);
      const connections = await jiraAPI.getConnections();
      // Ensure connections is always an array
      const connectionsArray = Array.isArray(connections) ? connections : [];
      setJiraConnections(connectionsArray);
      // 重置到第一页当数据更新时
      setPage(0);
    } catch (error) {
      console.error('Failed to fetch Jira connections:', error);
      showSnackbar(t('settings.jiraFetchFailed'), 'error');
      // Ensure jiraConnections is an array even on error
      setJiraConnections([]);
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
  const paginatedJiraConnections = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return jiraConnections.slice(startIndex, startIndex + rowsPerPage);
  }, [jiraConnections, page, rowsPerPage]);

  const handleDeleteJiraConnection = async (connectionId) => {
    try {
      setLoading(true);
      await jiraAPI.deleteConnection(connectionId);
      setJiraConnections(jiraConnections.filter(conn => conn._id !== connectionId));
      showSnackbar(t('settings.jiraDeleteSuccess'), 'success');
    } catch (error) {
      showSnackbar(t('settings.jiraDeleteFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJiraOAuth = async () => {
    try {
      setLoading(true);
      // Construct the authorization URL according to Atlassian OAuth 2.0 (3LO) documentation
      const state = `jira_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Define the scopes needed for Jira API access
      const scopes = ['read:jira-work', 'write:jira-work', 'read:jira-user'];

      // Construct the authorization URL
      const authUrl = new URL('https://auth.atlassian.com/authorize');
      authUrl.searchParams.append('audience', 'api.atlassian.com');
      authUrl.searchParams.append('client_id', jiraClientId);
      authUrl.searchParams.append('scope', scopes.join(' '));
      authUrl.searchParams.append('redirect_uri', jiraRedirectUri);
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('prompt', 'consent');

      // Redirect the user to the authorization URL
      window.location.href = authUrl.toString();
    } catch (error) {
      showSnackbar(t('settings.jiraOAuthFailed'), 'error');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Paper sx={{ p: 3, mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            {t('settings.jiraConnections')}
          </Typography>
          <Tooltip title={t('settings.jiraOAuthTooltip')} placement="top">
            <Button
              variant="contained"
              startIcon={<LinkIcon />}
              onClick={handleJiraOAuth}
              disabled={loading}
            >
              {t('settings.connectToJira')}
            </Button>
          </Tooltip>
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 1050 }} aria-label="Jira connections table">
            <TableHead>
              <TableRow>
                <TableCell>{t('settings.name')}</TableCell>
                <TableCell>{t('settings.jiraUrl')}</TableCell>
                <TableCell>{t('settings.createdAt')}</TableCell>
                <TableCell>{t('settings.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedJiraConnections.map((connection) => (
                <TableRow
                  key={connection.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {connection.name}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ maxWidth: 300 }}>
                      <Box>
                        {connection.accessible_resources.map((resource, index) => (
                          <Box key={resource.id} sx={{ mb: 0.5 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '0.875rem'
                              }}
                              title={resource.url}
                            >
                              {resource.url}
                            </Typography>

                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{formatSmartTime(connection.created_at, t)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>

                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleDeleteJiraConnection(connection._id)}
                        disabled={loading}
                      >
                        {t('settings.delete')}
                      </Button>

                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {jiraConnections.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary">
                      {t('settings.jiraNoConnections')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 分页控件 */}
        <TablePagination
          component="div"
          count={jiraConnections.length}
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
              from: jiraConnections.length > 0 ? (page * rowsPerPage + 1) : 0,
              to: Math.min((page + 1) * rowsPerPage, jiraConnections.length),
              total: jiraConnections.length
            })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('common.totalRecords', { count: jiraConnections.length })}
          </Typography>
        </Box>
      </Paper>

    </>
  );
};

export default JiraConnectionManager;