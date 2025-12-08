import React, { useState } from 'react';
import {
  Box, Chip, Typography, Grid, TableContainer, Table, TableBody, TableRow, TableCell,
  IconButton, Tooltip, useTheme, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { Warning as WarningIcon, Star as StarIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import * as jiraAPI from '../../services/api/jiraAPI';
import * as codeReviewAPI from '../../services/api/codeReviewAPI';

const IssueDisplay = ({
  issue,
  isDarkMode,
  markedIssues,
  handleMarkIssue,
  reviewId
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  // 从主题中获取严重程度映射
  const SeverityMap = theme.severityMap;
  
  // Jira同步相关状态
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [jiraConnections, setJiraConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState('');
  const [jiraFields, setJiraFields] = useState({
    summary: '',
    description: '',
    issuetype: 'Bug',
    priority: 'Medium',
    assignee: ''
  });
  const [loading, setLoading] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // 获取Jira连接
  const fetchJiraConnections = async () => {
    try {
      const connections = await jiraAPI.getConnections();
      setJiraConnections(connections);
    } catch (err) {
      console.error('Failed to fetch Jira connections:', err);
      setError('获取Jira连接失败');
    }
  };
  
  // 处理同步按钮点击
  const handleSyncClick = () => {
    setLoading(true);
    setError('');
    fetchJiraConnections().then(() => {
      setLoading(false);
      setSyncDialogOpen(true);
    }).catch(() => {
      setLoading(false);
    });
  };
  
  // 处理同步提交
  const handleSyncSubmit = async () => {
    if (!selectedConnection) {
      setError('请选择Jira连接');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // 使用问题描述作为默认摘要
      const finalFields = {
        ...jiraFields,
        summary: jiraFields.summary || `代码审查问题: ${issue.description}`
      };
      
      const result = await codeReviewAPI.syncIssueToJira(
        reviewId,
        issue.id || issue.index.toString(),
        selectedConnection,
        finalFields
      );
      
      setSyncSuccess(true);
      setSyncDialogOpen(false);
      
      // 可以在这里添加一个通知或状态更新
      console.log('Sync successful:', result);
      
    } catch (err) {
      console.error('Failed to sync issue to Jira:', err);
      setError('同步到Jira失败: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };
  
  // 处理字段变化
  const handleFieldChange = (field, value) => {
    setJiraFields(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // 处理连接选择变化
  const handleConnectionChange = (event) => {
    setSelectedConnection(event.target.value);
  };

  // 根据当前主题模式获取背景颜色
  const getBgColor = () => {
    const severityConfig = SeverityMap[issue.severity];
    if (!severityConfig) return isDarkMode ? '#1a1a1a' : '#ffffff';

    return isDarkMode ? severityConfig.bgColor.dark : severityConfig.bgColor.light;
  };

  return (
    <Box key={issue.index} sx={{
      mb: 3,
      p: 2,
      bgcolor: getBgColor(),
      borderRadius: 1,
      border: '1px solid',
      borderColor: 'divider'
    }}>
      {issue.historical_mention && (
        <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
          <WarningIcon color="error" sx={{ mr: 1 }} />
          <Typography color="error" fontWeight="bold">
            {t('home.persistentIssues')}
          </Typography>
        </Box>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Typography color="text.secondary" sx={{ mb: 0.5 }}>{t('common.file')}</Typography>
          <Tooltip title={issue.file} placement="top">
            <Typography
              sx={{
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {issue.file}
            </Typography>
          </Tooltip>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Typography color="text.secondary" sx={{ mb: 0.5 }}>{t('common.type')}</Typography>
          <Typography>{issue.bug_type}</Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Typography color="text.secondary" sx={{ mb: 0.5 }}>{t('common.lineNumber')}</Typography>
          <Typography>{issue.line || t('common.none')}</Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Typography color="text.secondary" sx={{ mb: 0.5 }}>{t('common.mark')}</Typography>
          <Box display="flex" gap={1}>
            <IconButton
              size="small"
              onClick={() => handleMarkIssue(issue.index.toString(), !markedIssues.includes(issue.index.toString()))}
              color={markedIssues.includes(issue.index.toString()) ? 'primary' : 'default'}
            >
              <StarIcon
                color={markedIssues.includes(issue.index.toString()) ? 'primary' : 'action'}
                sx={{
                  fill: markedIssues.includes(issue.index.toString()) ? '#1976d2' : 'none',
                  stroke: markedIssues.includes(issue.index.toString()) ? '#1976d2' : 'currentColor'
                }}
              />
            </IconButton>
            {markedIssues.includes(issue.index.toString()) && (
              <IconButton
                size="small"
                onClick={handleSyncClick}
                color="success"
                aria-label={t('common.syncToJira')}
              >
                <CloudUploadIcon />
              </IconButton>
            )}
          </Box>
        </Grid>

        <Grid size={12}>
          <TableContainer>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold', width: '80px' }}>{t('common.description')}</TableCell>
                  <TableCell sx={{ border: 'none', padding: '4px 0' }}>{issue.description}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold', width: '80px' }}>{t('common.suggestion')}</TableCell>
                  <TableCell sx={{ border: 'none', padding: '4px 0' }}>{issue.suggestion}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {issue.bug_code_example && (
          <Grid size={12}>
            <Typography color="error" sx={{ mb: 0.5, textAlign: 'left', fontWeight: 'bold' }}>{t('common.problemCode')}</Typography>
            <Box sx={{ 
              bgcolor: isDarkMode ? '#333' : '#f5f5f5', 
              p: 2, 
              borderRadius: 1, 
              fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", "Source Code Pro", Consolas, monospace',
              overflowX: 'auto',
              whiteSpace: 'pre'
            }}>
              <Typography sx={{ textAlign: 'left' }}>{issue.bug_code_example}</Typography>
            </Box>
          </Grid>
        )}

        {(issue.optimized_code_example || issue.good_code_example) && (
          <Grid size={12}>
            <Typography color="success" sx={{ mb: 0.5, textAlign: 'left', fontWeight: 'bold' }}>
              {issue.optimized_code_example ? t('common.optimizedCode') : t('common.goodCode')}
            </Typography>
            <Box sx={{ 
              bgcolor: isDarkMode ? '#333' : '#f5f5f5', 
              p: 2, 
              borderRadius: 1, 
              fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", "Source Code Pro", Consolas, monospace',
              overflowX: 'auto',
              whiteSpace: 'pre'
            }}>
              <Typography sx={{ textAlign: 'left' }}>
                {issue.optimized_code_example || issue.good_code_example}
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Jira同步对话框 */}
      <Dialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{t('common.syncToJira')}</DialogTitle>
        <DialogContent>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          
          {/* 选择Jira连接 */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t('jira.connections')}</InputLabel>
            <Select
              value={selectedConnection}
              label={t('jira.connections')}
              onChange={handleConnectionChange}
              disabled={loading || jiraConnections.length === 0}
            >
              {jiraConnections.map(connection => (
                <MenuItem key={connection.id} value={connection.id}>
                  {connection.name} ({connection.jira_url})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Jira Issue字段配置 */}
          <TextField
            fullWidth
            label={t('jira.summary')}
            value={jiraFields.summary}
            onChange={(e) => handleFieldChange('summary', e.target.value)}
            sx={{ mb: 2 }}
            disabled={loading}
            placeholder={`代码审查问题: ${issue.description}`}
          />
          
          <TextField
            fullWidth
            label={t('jira.issuetype')}
            value={jiraFields.issuetype}
            onChange={(e) => handleFieldChange('issuetype', e.target.value)}
            sx={{ mb: 2 }}
            disabled={loading}
          />
          
          <TextField
            fullWidth
            label={t('jira.priority')}
            value={jiraFields.priority}
            onChange={(e) => handleFieldChange('priority', e.target.value)}
            sx={{ mb: 2 }}
            disabled={loading}
          />
          
          <TextField
            fullWidth
            label={t('jira.assignee')}
            value={jiraFields.assignee}
            onChange={(e) => handleFieldChange('assignee', e.target.value)}
            sx={{ mb: 2 }}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncDialogOpen(false)} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSyncSubmit} color="primary" variant="contained" disabled={loading || !selectedConnection}>
            {loading ? t('common.loading') : t('common.sync')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IssueDisplay;