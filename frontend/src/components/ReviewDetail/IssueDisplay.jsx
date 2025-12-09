import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
  Grid,
  Tooltip,
  IconButton,
  TableContainer,
  Table,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import WarningIcon from '@mui/icons-material/Warning';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Star as StarIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from '../../contexts/SnackbarContext';
import jiraAPI from '../../services/api/jiraAPI';
import codeReviewAPI from '../../services/api/codeReviewAPI';

const IssueDisplay = ({
  issue,
  isDarkMode,
  markedIssues,
  handleMarkIssue,
  reviewId,
  prNumber,
  prTitle,
  repository
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showSnackbar } = useSnackbar();
  // 从主题中获取严重程度映射
  const SeverityMap = theme.severityMap;

  // Jira同步相关状态
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [jiraConnections, setJiraConnections] = useState([]);
  const [jiraFields, setJiraFields] = useState({
    projectkey: '',
    summary: '',
    description: '',
    issuetype: 'Bug',
    priority: 'Medium',
    assignee: ''
  });
  const [loading, setLoading] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [jiraUrls, setJiraUrls] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState([]);

  // 获取Jira连接
  const fetchJiraConnections = async () => {
    try {
      const connections = await jiraAPI.getConnections();

      setJiraConnections(connections);

      // 收集所有accessible_resources中的URL
      const allUrls = connections.flatMap(conn => 
        conn.accessible_resources.map(resource => [conn._id,resource.url,resource.id])
      ).filter(Boolean);
      
      setJiraUrls(allUrls);

      // 检查是否有可用的连接
      if (!allUrls || allUrls.length === 0) {
        // 显示snackbar提醒
        showSnackbar(t('settings.noJiraConnectionFound'), 'warning');

        // 3秒后关闭对话框
        setTimeout(() => {
          setSyncDialogOpen(false);
        }, 3000);

        return;
      }

      // 如果有连接，默认选择第一个
      if (jiraUrls && jiraUrls.length > 0) {
        setSelectedUrl(jiraUrls[0]);
      }
    } catch (err) {
      console.error('Failed to fetch Jira connections:', err);
      setError(t('settings.fetchJiraConnectionsFailed'));
      showSnackbar(t('settings.fetchJiraConnectionsFailed'), 'error');
    }
  };

  // 处理同步按钮点击
  const handleSyncClick = () => {
    setSelectedUrl(jiraUrls[0]);
    setLoading(true);
    setError('');

    // 生成简洁的summary，包含关键信息
    const summaryText = `[${issue.bug_type}] ${issue.file}:${issue.line} - ${issue.description.substring(0, 50)}${issue.description.length > 50 ? '...' : ''}`;

    const frontendURL = import.meta.env.VITE_FRONTEND_URL;
    // 生成详细的description，包含完整的bug信息
    const descriptionText = `# 智能代码审查系统 - 问题报告
${repository ? `
**仓库**: ${repository}` : ''}${prNumber && prTitle ? `
**PR** #${prNumber} - ${prTitle}` : ''}

## 基本信息
- **文件**: ${issue.file}
- **行号**: ${issue.line}
- **问题类型**: ${issue.bug_type}
- **严重程度**: ${issue.severity}
- **历史提及**: ${issue.historical_mention ? '是' : '否'}
## 问题描述
${issue.description}
## 修复建议
${issue.suggestion}
## 查看详情
点击链接查看完整审查详情: ${frontendURL}/reviews/${reviewId}

---
*此问题由智能代码审查系统自动检测生成*`

    // 设置默认值
    setJiraFields({

      summary: summaryText.substring(0, 255), // Jira summary 长度限制
      description: descriptionText,
      issuetype: 'Bug',
      priority: issue.severity === '严重' ? 'High' : issue.severity === '中等' ? 'Medium' : 'Low',
      assignee: ''
    });

    // 先打开对话框（会显示加载状态）
    setSyncDialogOpen(true);

    fetchJiraConnections().then(() => {
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  };

  // 处理同步提交
  const handleSyncSubmit = async () => {
    if (!selectedUrl) {
      setError(t('settings.jiraConnectionRequired'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const result = await codeReviewAPI.syncIssueToJira(
        reviewId,
        issue.id || issue.index.toString(),
        selectedUrl,
        jiraFields
      );

      setSyncSuccess(true);
      setSyncDialogOpen(false);

      // 显示成功提示
      showSnackbar(t('settings.syncToJiraSuccess') + ' - ' + result.jira_issue.key, 'success');

    } catch (err) {
      console.error('Failed to sync issue to Jira:', err);
      setError(t('settings.syncToJiraFailed') + ': ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 处理字段变化
  const handleFieldChange = (field, value) => {
    // Jira项目键自动转换为大写
    if (field === 'projectkey') {
      value = value.toUpperCase();
    }
    
    setJiraFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 处理连接选择变化
  const handleUrlChange = (event) => {
    setSelectedUrl(event.target.value);
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
          <Box display="flex" justifyContent="center" gap={2}>
            <Tooltip title={t('common.markIssue')} placement="top">
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
            </Tooltip>
            <Tooltip title={t('common.syncToJira')} placement="top">
              <IconButton
                size="small"
                onClick={handleSyncClick}
                color="success"
              >
                <SyncIcon />
              </IconButton>
            </Tooltip>
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
              whiteSpace: 'pre',
              maxWidth: '800px'
            }}>
              <Typography sx={{ textAlign: 'left', overflowX: 'auto' }}>{issue.bug_code_example}</Typography>
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
              whiteSpace: 'pre',
              maxWidth: '800px'
            }}>
              <Typography sx={{ textAlign: 'left', overflowX: 'auto' }}>
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
          {error ? (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          ) : (
            <>
              {/* 选择Jira连接 */}
              <FormControl fullWidth sx={{ mb: 2, mt: 2 }}>
                <InputLabel>{t('jira.connections')}</InputLabel>
                <Select
                  value={selectedUrl || ''}
                  label={t('jira.connections')}
                  onChange={handleUrlChange}
                  disabled={loading || jiraUrls.length === 0}
                  required
                >
                  {jiraUrls.length === 0 ? (
                    <MenuItem disabled value="">
                      {t('jiraNoConnections')}
                    </MenuItem>
                  ) : (
                    jiraUrls.map(jiraUrl => {
                      // 获取所有资源URL用于显示
                      
                      return (
                        <MenuItem key={jiraUrl} value={jiraUrl}>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {jiraUrl[1]}
                            </Typography>
                            
                          </Box>
                        </MenuItem>
                      );
                    })
                  )}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label={t('jira.projectkey')}
                value={jiraFields.projectkey}
                onChange={(e) => handleFieldChange('projectkey', e.target.value)}
                disabled={loading}
                helperText={t('settings.jiraProjectKeyHelper')}
                required
              />

              {/* Jira Issue字段配置 */}
              <TextField
                fullWidth
                label={t('jira.summary')}
                value={jiraFields.summary}
                onChange={(e) => handleFieldChange('summary', e.target.value)}
                sx={{ mb: 2 }}
                disabled={loading}
                helperText={t('settings.jiraSummaryHelper')}
                required
              />

              <TextField
                fullWidth
                multiline
                rows={6}
                label={t('jira.description')}
                value={jiraFields.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                sx={{ mb: 2 }}
                disabled={loading}
                helperText={t('settings.jiraDescriptionHelper')}
                required
              />

              <Button
                size="small"
                onClick={() => setShowPreview(!showPreview)}
                sx={{ mb: 2 }}
                disabled={loading}
              >
                {showPreview ? t('settings.hidePreview') : t('settings.showPreview')}
              </Button>

              {showPreview && (
                <Box
                  sx={{
                    maxHeight: '300px',
                    overflow: 'auto',
                    p: 1,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ node, ...props }) => <Typography variant="h6" component="h1" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }} {...props} />,
                      h2: ({ node, ...props }) => <Typography variant="subtitle1" component="h2" sx={{ mt: 1.5, mb: 0.5, fontWeight: 'bold' }} {...props} />,
                      h3: ({ node, ...props }) => <Typography variant="subtitle2" component="h3" sx={{ mt: 1, mb: 0.5, fontWeight: 'bold' }} {...props} />,
                      p: ({ node, ...props }) => <Typography variant="body2" sx={{ mb: 1 }} {...props} />,
                      code: ({ node, inline, ...props }) =>
                        inline ? (
                          <Typography
                            component="code"
                            sx={{
                              bgcolor: 'action.selected',
                              px: 0.5,
                              py: 0.25,
                              borderRadius: 0.5,
                              fontFamily: 'monospace',
                              fontSize: '0.875rem'
                            }}
                            {...props}
                          />
                        ) : (
                          <Box
                            component="pre"
                            sx={{
                              bgcolor: 'action.selected',
                              p: 1.5,
                              borderRadius: 1,
                              overflow: 'auto',
                              fontFamily: 'monospace',
                              fontSize: '0.875rem',
                              mb: 1
                            }}
                          >
                            <Typography component="code" {...props} />
                          </Box>
                        ),
                      ul: ({ node, ...props }) => <Box component="ul" sx={{ pl: 3, mb: 1 }} {...props} />,
                      li: ({ node, ...props }) => <Typography component="li" variant="body2" {...props} />,
                      strong: ({ node, ...props }) => <Typography component="strong" sx={{ fontWeight: 'bold' }} {...props} />,
                      em: ({ node, ...props }) => <Typography component="em" sx={{ fontStyle: 'italic' }} {...props} />
                    }}
                  >
                    {jiraFields.description}
                  </ReactMarkdown>
                </Box>
              )}
              

              <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>{t('jira.issuetype')}</InputLabel>
                  <Select
                    value={jiraFields.issuetype}
                    label={t('jira.issuetype')}
                    onChange={(e) => handleFieldChange('issuetype', e.target.value)}
                    disabled={loading}
                    required
                  >
                    <MenuItem value="Bug">Bug</MenuItem>
                    <MenuItem value="Task">Task</MenuItem>
                    <MenuItem value="Story">Story</MenuItem>
                    <MenuItem value="Improvement">Improvement</MenuItem>
                    <MenuItem value="Sub-task">Sub-task</MenuItem>
                  </Select>
                </FormControl>

                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>{t('jira.priority')}</InputLabel>
                  <Select
                    value={jiraFields.priority}
                    label={t('jira.priority')}
                    onChange={(e) => handleFieldChange('priority', e.target.value)}
                    disabled={loading}
                    required
                  >
                    <MenuItem value="Highest">Highest</MenuItem>
                    <MenuItem value="High">High</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="Low">Low</MenuItem>
                    <MenuItem value="Lowest">Lowest</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <TextField
                fullWidth
                label={t('jira.assignee')}
                value={jiraFields.assignee}
                onChange={(e) => handleFieldChange('assignee', e.target.value)}
                disabled={loading}
                helperText={t('settings.jiraAssigneeHelper')}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          {error ? (
            <Button onClick={() => setSyncDialogOpen(false)}>
              {t('common.close')}
            </Button>
          ) : (
            <>
              <Button onClick={() => setSyncDialogOpen(false)} disabled={loading}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSyncSubmit} color="primary" variant="contained" disabled={loading || !selectedUrl}>
                {loading ? t('common.loading') : t('common.sync')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IssueDisplay;