import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { codeReviewAPI } from '../services/api/codeReviewAPI';
import { useTranslation } from 'react-i18next';
import {
  Box, Breadcrumbs, Button, Card, CardContent, Chip, CircularProgress,
  Accordion, AccordionSummary, AccordionDetails, Tabs, Tab, Typography,
  Grid, Alert, Divider, IconButton, Tooltip, Paper, TextField,
  Table, TableBody, TableCell, TableContainer, TableRow
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon, Refresh as RefreshIcon,
  Download as DownloadIcon, Search as SearchIcon,
  Warning as WarningIcon, CheckCircle as CheckCircleIcon,
  Error as ErrorIcon, Info as InfoIcon, Star as StarIcon
} from '@mui/icons-material';

// 审查状态枚举映射（对应后端ReviewStatus）
const StatusMap = {
  pending: { label: 'reviews.pending', color: 'default', icon: <InfoIcon /> },
  processing: { label: 'reviews.inProgress', color: 'primary', icon: <CircularProgress size={16} /> },
  completed: { label: 'reviews.completed', color: 'success', icon: <CheckCircleIcon /> },
  failed: { label: 'reviews.failed', color: 'error', icon: <ErrorIcon /> }
};

// 严重程度样式映射函数
const getSeverityMap = (t) => ({
  严重: { color: 'error', bgColor: '#ffebee', label: t('home.severity.critical') },
  中等: { color: 'warning', bgColor: '#fff8e1', label: t('home.severity.medium') },
  轻微: { color: 'info', bgColor: '#e3f2fd', label: t('home.severity.minor') },
  表扬: { color: 'success', bgColor: '#e8f5e9', label: t('home.severity.praise') }
});



const Home = ({ isDarkMode, user: propUser }) => {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState(propUser || authUser);
  const [latestReview, setLatestReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0:按文件分类 1:按问题类型分类 2:按严重程度分类
  const [searchText, setSearchText] = useState('');
  const [parsedFinalResult, setParsedFinalResult] = useState([]); // 解析后的最终结果
  const [groupedByFile, setGroupedByFile] = useState({}); // 按文件分组的问题
  const [groupedByType, setGroupedByType] = useState({}); // 按问题类型分组的问题
  const [groupedBySeverity, setGroupedBySeverity] = useState({}); // 按严重程度分组的问题
  const [groupedByMarked, setGroupedByMarked] = useState({}); // 按标记分组的问题
  const [groupedByHistorical, setGroupedByHistorical] = useState({}); // 按顽固问题分组的问题
  const [markedIssues, setMarkedIssues] = useState([]); // 标记的问题项序号列表

  // 从final_result解析JSON数据
  useEffect(() => {
    if (latestReview?.final_result) {
      try {
        const resultArr = Object.values(latestReview.final_result);
        setParsedFinalResult(resultArr);
        console.log('解析后的最终结果:', resultArr);

        // 获取标记的问题列表
        if (latestReview.marked_issues) {
          setMarkedIssues(latestReview.marked_issues);
        }

        console.log('标记的问题项序号列表:', markedIssues);

        // 按文件分组
        const fileGroup = resultArr.reduce((acc, item) => {
          const key = item.file || '未知文件';
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        }, {});
        setGroupedByFile(fileGroup);

        // 按问题类型分组
        const typeGroup = resultArr.reduce((acc, item) => {
          const key = item.bug_type || '未知类型';
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        }, {});
        setGroupedByType(typeGroup);

        // 按严重程度分组
        const severityGroup = resultArr.reduce((acc, item) => {
          const key = item.severity || '未知程度';
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        }, {});
        setGroupedBySeverity(severityGroup);

        // 按标记分组
        const markedGroup = resultArr.reduce((acc, item, index) => {
          const isMarked = latestReview.marked_issues?.includes(index.toString());
          const key = isMarked ? '已标记' : '未标记';
          if (!acc[key]) acc[key] = [];
          acc[key].push({ ...item, index });
          return acc;
        }, {});
        setGroupedByMarked(markedGroup);

        // 按顽固问题分组
        const historicalGroup = resultArr.reduce((acc, item, index) => {
          const isHistorical = item.historical_mention;
          const key = isHistorical ? '顽固问题' : '普通问题';
          if (!acc[key]) acc[key] = [];
          acc[key].push({ ...item, index });
          return acc;
        }, {});
        setGroupedByHistorical(historicalGroup);
      } catch (err) {
        setError('解析审查结果失败：' + err.message);
      }
    }
  }, [latestReview]);

  // 获取最近审查记录（复用你的原有逻辑）
  useEffect(() => {
    setUser(propUser || authUser);

    const fetchLatestReview = async () => {
      try {
        setLoading(true);
        setError(null);
        const review = await codeReviewAPI.getLatestReview();
        setLatestReview(review);
      } catch (err) {
        if (err.response?.status === 404) {
          setLatestReview(null);
        } else {
          setError('获取最近审查记录失败：' + (err.response?.data?.message || err.message));
        }
      } finally {
        setLoading(false);
      }
    };

    if (authUser) {
      fetchLatestReview();
    }
  }, [propUser, authUser]);



  // 导出审查报告
  const handleExportReport = () => {
    if (!latestReview) return;
    const content = JSON.stringify(latestReview, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PR-${latestReview.pr_number}-审查报告.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 标记问题
  const handleMarkIssue = async (issueId, marked) => {
    if (!latestReview) return;
    console.log(latestReview._id, issueId, marked);
    
    try {
      // 调用API标记问题
      const response = await codeReviewAPI.markIssue(latestReview._id, issueId, marked);
      
      // 更新本地标记状态
      setMarkedIssues(response.marked_issues);

      
      // 更新latestReview中的标记状态
      setLatestReview({
        ...latestReview,
        marked_issues: response.marked_issues
      });
      
      console.log(`问题 ${issueId} ${marked ? '标记' : '取消标记'}成功`);
    } catch (err) {
      console.error('标记问题失败：', err);
      setError('标记问题失败：' + (err.response?.data?.message || err.message));
    }
  };

  // 过滤问题（根据搜索框）
  const filterIssues = (issues) => {
    if (!searchText.trim()) return issues;
    const text = searchText.toLowerCase();
    return issues.filter(item =>
      item.file?.toLowerCase().includes(text) ||
      item.description?.toLowerCase().includes(text) ||
      item.suggestion?.toLowerCase().includes(text) ||
      item.bug_type?.toLowerCase().includes(text)
    );
  };

  // 统计问题数量
  const getIssueCount = () => {
    return {
      [t('sidebar.criticalIssues')]: parsedFinalResult.filter(item => item.severity === '严重').length,
      [t('sidebar.moderateIssues')]: parsedFinalResult.filter(item => item.severity === '中等').length,
      [t('sidebar.minorIssues')]: parsedFinalResult.filter(item => item.severity === '轻微').length,
      [t('sidebar.highPraise')]: parsedFinalResult.filter(item => item.severity === '表扬').length,
      历史未修复: parsedFinalResult.filter(item => item.historical_mention).length
    };
  };

  // 获取合并建议
  const getMergeSuggestion = () => {
    const issueCount = getIssueCount();
    const criticalIssues = issueCount[t('sidebar.criticalIssues')];
    const moderateIssues = issueCount[t('sidebar.moderateIssues')];
    if (criticalIssues > 0 || moderateIssues > 0) {
      return { suggestion: t('sidebar.notRecommended'), color: 'error' };
    }
    return { suggestion: t('sidebar.recommended'), color: 'success' };
  };

  const issueCount = getIssueCount();
  const mergeSuggestion = getMergeSuggestion();

  // 加载中状态
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" icon={<ErrorIcon />}>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          {t('common.retry')}
        </Button>
      </Box>
    );
  }

  // 无审查记录状态
  if (!latestReview) {
    return (
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Typography linkComponent="button" onClick={() => navigate('/')} sx={{ cursor: 'pointer' }}>
            {t('navigation.home')}
          </Typography>
          <Typography>{t('reviews.reviewRecords')}</Typography>
          <Typography>{t('reviews.noRecords')}</Typography>
        </Breadcrumbs>
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('home.noReviewRecords')}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {t('home.submitPRPrompt')}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')}>
            {t('common.back')} {t('navigation.home')}
          </Button>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, mx: 'auto', mt: 4 }}>
      {/* 面包屑导航 */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Typography linkComponent="button" onClick={() => navigate('/')} sx={{ cursor: 'pointer' }}>
          {t('navigation.home')}
        </Typography>
        <Typography linkComponent="button" onClick={() => navigate('/reviews')} sx={{ cursor: 'pointer' }}>
          {t('reviews.reviewRecords')}
        </Typography>
        <Typography>PR #{latestReview.pr_number}</Typography>
      </Breadcrumbs>

      {/* 页面标题+操作按钮 */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          PR #{latestReview.pr_number} {t('home.intelligentCodeReview')}
        </Typography>
        <Box display="flex" gap={2}>
          
          <Tooltip title={t('home.exportReport')}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportReport}
            >
              {t('home.exportReport')}
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* 两列布局 */}
      <Box sx={{ display: 'flex', gap: 3, position: 'relative' }}>
        {/* 左侧列 - 仓库基本信息 */}
        <Box sx={{ 
          width: { xs: '100%', md: '25%', lg: '25%' },
          position: { xs: 'static', md: 'sticky' },
          top: { xs: 0, md: 80 },
          height: { xs: 'auto', md: 'calc(100vh - 100px)' },
          overflowY: { xs: 'visible', md: 'auto' },
          zIndex: 10
          }}>
          {/* PR基础信息卡片 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              {/* 表格形式展示仓库信息 */}
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold' }}>{t('home.repository')}</TableCell>
                      <TableCell sx={{ border: 'none', padding: '4px 0', textAlign: 'right', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Tooltip title={`https://github.com/${latestReview.repo_owner}/${latestReview.repo_name}`}>
                          <a 
                            href={`https://github.com/${latestReview.repo_owner}/${latestReview.repo_name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ 
                              color: 'inherit', 
                              textDecoration: 'none',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                          >
                            {latestReview.repo_owner}/{latestReview.repo_name}
                          </a>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold' }}>{t('reviews.prTitle')}</TableCell>
                      <TableCell sx={{ border: 'none', padding: '4px 0', textAlign: 'right', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Tooltip title={`${latestReview.pr_title} `}>
                          <a 
                            href={`https://github.com/${latestReview.repo_owner}/${latestReview.repo_name}/pull/${latestReview.pr_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ 
                              color: 'inherit', 
                              textDecoration: 'none',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                          >
                            {latestReview.pr_title}
                          </a>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold' }}>{t('reviews.author')}</TableCell>
                      <TableCell sx={{ border: 'none', padding: '4px 0', textAlign: 'right', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Tooltip title={`https://github.com/${latestReview.author}`}>
                          <a 
                            href={`https://github.com/${latestReview.author}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ 
                              color: 'inherit', 
                              textDecoration: 'none',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                          >
                            {latestReview.author}
                          </a>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold' }}>{t('reviews.status')}</TableCell>
                      <TableCell sx={{ border: 'none', padding: '4px 0', textAlign: 'right' }}>
                        <Chip
                          icon={StatusMap[latestReview.status]?.icon}
                          label={t(StatusMap[latestReview.status]?.label) || latestReview.status}
                          color={StatusMap[latestReview.status]?.color}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold' }}>{t('reviews.creationTime')}</TableCell>
                      <TableCell sx={{ border: 'none', padding: '4px 0', textAlign: 'right', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Tooltip title={new Date(latestReview.created_at).toLocaleString()}>
                          <span>{new Date(latestReview.created_at).toLocaleString()}</span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* 合并建议 */}
          <Alert severity={mergeSuggestion.color} sx={{ mb: 3 }}>
            <Typography variant="h6">{mergeSuggestion.suggestion}</Typography>
          </Alert>
          
          {/* 审查汇总统计 */}
          <Grid container spacing={2} sx={{ mb: 3 }} direction="column">
            <Grid size={12}>
              <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#ffebee' }}>
                <Typography color="text.secondary">{t('home.severity.critical')}</Typography>
                <Typography color="error" variant="h5">
                  {issueCount.严重}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={12}>
              <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fff8e1' }}>
                <Typography color="text.secondary">{t('home.severity.medium')}</Typography>
                <Typography color="warning" variant="h5">
                  {issueCount.中等}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={12}>
              <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#e3f2fd' }}>
                <Typography color="text.secondary">{t('home.severity.minor')}</Typography>
                <Typography color="info" variant="h5">
                  {issueCount.轻微}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={12}>
              <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#e8f5e9' }}>
                <Typography color="text.secondary">{t('home.severity.praise')}</Typography>
                <Typography color="success" variant="h5">
                  {issueCount.表扬}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={12}>
              <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f3e5f5' }}>
                <Typography color="text.secondary">{t('home.persistentIssues')}</Typography>
                <Typography color="purple" variant="h5">
                  {issueCount.历史未修复}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* 右侧列 - 主要内容 */}
        <Box sx={{ 
          flex: 1,
          minWidth: 0,
        }}>
          {/* 搜索框 */}
          <Box sx={{ mb: 3, width: '100%' }}>
            <TextField
              fullWidth
              placeholder="搜索文件/问题描述/建议..."
              variant="outlined"
              size="small"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
          </Box>

          {/* 问题详情标签页 */}
          <Box sx={{ mb: 4 }}>
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
              <Tab label={t('tabPanels.byType')} />
              <Tab label={t('tabPanels.byFile')} />
              <Tab label={t('tabPanels.bySeverity')} />
              <Tab label={t('tabPanels.persistentIssues')} />
              <Tab label={t('tabPanels.markedIssues')} />
            </Tabs>
            <Divider sx={{ mb: 2 }} />

            {/* 按文件分类标签页 */}
            {activeTab === 1 && (
              <Box>
                {Object.entries(groupedByFile).map(([file, issues], index) => {
                  const filteredIssues = filterIssues(issues);
                  if (filteredIssues.length === 0) return (
                    <Box display="flex" alignItems="center" width="922px"/>
                  );;

                  return (
                    <Accordion key={index} sx={{ mb: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box display="flex" alignItems="center" width="100%">
                          <Typography variant="h6" sx={{ flex: 1 }}>
                            {file}
                          </Typography>
                          <Box display="flex" gap={1}>
                            {Object.entries(SeverityMap).map(([severity, { color, label }]) => {
                              const count = filteredIssues.filter(item => item.severity === severity).length;
                              if (count === 0) return null;
                              return (
                                <Chip
                                  key={severity}
                                  label={`${label}(${count})`}
                                  color={color}
                                  size="small"
                                />
                              );
                            })}
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box>
                          {filteredIssues.map((issue, idx) => (
                            <Box key={idx} sx={{ mb: 3, p: 2, bgcolor: SeverityMap[issue.severity]?.bgColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                              {/* 顽固标记 */}
                              {issue.historical_mention && (
                                <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                                  <WarningIcon color="error" sx={{ mr: 1 }} />
                                  <Typography color="error" fontWeight="bold">
                                    顽固问题
                                  </Typography>
                                </Box>
                              )}

                              <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>文件</Typography>
                                  <Tooltip title={issue.file} placement="top">
                                    <Typography 
                                      sx={{ 
                                        maxWidth: '200px', 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        whiteSpace: 'nowrap',
                                        direction: 'rtl',
                                        textAlign: 'left'
                                      }}
                                    >
                                      {issue.file}
                                    </Typography>
                                  </Tooltip>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>程度</Typography>
                                  <Chip
                                    label={issue.severity}
                                    color={SeverityMap[issue.severity]?.color}
                                    size="small"
                                  />
                                </Grid>

                                
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>{t('reviewDetail.lineNumber')}</Typography>
                                  <Typography>{issue.line || t('reviewDetail.none')}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>标记</Typography>
                                  <IconButton 
                                    size="small"
                                    onClick={() => handleMarkIssue(idx.toString(), !markedIssues.includes(idx.toString()))}
                                    color={markedIssues.includes(idx.toString()) ? 'primary' : 'default'}
                                  >
                                    <StarIcon 
                                      color={markedIssues.includes(idx.toString()) ? 'primary' : 'action'} 
                                      sx={{ 
                                        fill: markedIssues.includes(idx.toString()) ? '#1976d2' : 'none',
                                        stroke: markedIssues.includes(idx.toString()) ? '#1976d2' : 'currentColor'
                                      }}
                                    />
                                  </IconButton>
                                </Grid>

                                <Grid size={12}>
                                  <TableContainer>
                                    <Table size="small">
                                      <TableBody>
                                        <TableRow>
                                          <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold', width: '80px' }}>问题描述</TableCell>
                                          <TableCell sx={{ border: 'none', padding: '4px 0' }}>{issue.description}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                          <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold', width: '80px' }}>修复建议</TableCell>
                                          <TableCell sx={{ border: 'none', padding: '4px 0' }}>{issue.suggestion}</TableCell>
                                        </TableRow>
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </Grid>

                                {/* 代码示例 */}
                                {(issue.bug_code_example || issue.optimized_code_example || issue.good_code_example) && (
                                  <Grid size={12}>
                                    <Typography color="text.secondary" sx={{ mb: 0.5 }}>代码示例</Typography>
                                    <Box sx={{ bgcolor: isDarkMode ? '#333' : '#f5f5f5', p: 2, borderRadius: 1, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                      {issue.bug_code_example && (
                                        <Box sx={{ mb: 2 }}>
                                          <Typography color="error" sx={{ mb: 1 }}>问题代码：</Typography>
                                          <Typography>{issue.bug_code_example}</Typography>
                                        </Box>
                                      )}
                                      {(issue.optimized_code_example || issue.good_code_example) && (
                                        <Box>
                                          <Typography color="success" sx={{ mb: 1 }}>
                                            {issue.optimized_code_example ? '优化代码：' : '优质代码：'}
                                          </Typography>
                                          <Typography>
                                            {issue.optimized_code_example || issue.good_code_example}
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Grid>
                                )}
                              </Grid>
                            </Box>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Box>
            )}

            
            {activeTab === 0 && (
              <Box>
                {Object.entries(groupedByType).map(([type, issues], index) => {
                  const filteredIssues = filterIssues(issues);
                  if (filteredIssues.length === 0) return (
                    <Box display="flex" alignItems="center" width="922px"/>
                  );

                  return (
                    <Accordion key={index} sx={{ mb: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box display="flex" alignItems="center" width="100%">
                          <Typography variant="h6" sx={{ flex: 1 }}>
                            {type}
                          </Typography>
                          <Box display="flex" gap={1}>
                            {Object.entries(SeverityMap).map(([severity, { color, label }]) => {
                              const count = filteredIssues.filter(item => item.severity === severity).length;
                              if (count === 0) return null;
                              return (
                                <Chip
                                  key={severity}
                                  label={`${label}(${count})`}
                                  color={color}
                                  size="small"
                                />
                              );
                            })}
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box>
                          {filteredIssues.map((issue, idx) => (
                            <Box key={idx} sx={{ mb: 3, p: 2, bgcolor: SeverityMap[issue.severity]?.bgColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                              {issue.historical_mention && (
                                <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                                  <WarningIcon color="error" sx={{ mr: 1 }} />
                                  <Typography color="error" fontWeight="bold">
                                    顽固问题
                                  </Typography>
                                </Box>
                              )}

                              <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>文件</Typography>
                                  <Tooltip title={issue.file} placement="top">
                                    <Typography 
                                      sx={{ 
                                        maxWidth: '200px', 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        whiteSpace: 'nowrap',
                                        direction: 'rtl',
                                        textAlign: 'left'
                                      }}
                                    >
                                      {issue.file}
                                    </Typography>
                                  </Tooltip>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>行号</Typography>
                                  <Typography>{issue.line || '无'}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>程度</Typography>
                                  <Chip
                                    label={issue.severity}
                                    color={SeverityMap[issue.severity]?.color}
                                    size="small"
                                  />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>标记</Typography>
                                  <IconButton 
                                    size="small"
                                    onClick={() => handleMarkIssue(idx.toString(), !markedIssues.includes(idx.toString()))}
                                    color={markedIssues.includes(idx.toString()) ? 'primary' : 'default'}
                                  >
                                    <StarIcon 
                                      color={markedIssues.includes(idx.toString()) ? 'primary' : 'action'} 
                                      sx={{ 
                                        fill: markedIssues.includes(idx.toString()) ? '#1976d2' : 'none',
                                        stroke: markedIssues.includes(idx.toString()) ? '#1976d2' : 'currentColor'
                                      }}
                                    />
                                  </IconButton>
                                </Grid>

                                <Grid size={12}>
                                  <TableContainer>
                                    <Table size="small">
                                      <TableBody>
                                        <TableRow>
                                          <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold', width: '80px' }}>描述</TableCell>
                                          <TableCell sx={{ border: 'none', padding: '4px 0' }}>{issue.description}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                          <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold', width: '80px' }}>建议</TableCell>
                                          <TableCell sx={{ border: 'none', padding: '4px 0' }}>{issue.suggestion}</TableCell>
                                        </TableRow>
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </Grid>

                                {(issue.bug_code_example || issue.optimized_code_example || issue.good_code_example) && (
                                  <Grid size={12}>
                                    <Typography color="text.secondary" sx={{ mb: 0.5 }}>代码示例</Typography>
                                    <Box sx={{ bgcolor: isDarkMode ? '#333' : '#f5f5f5', p: 2, borderRadius: 1, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                      {issue.bug_code_example && (
                                        <Box sx={{ mb: 2 }}>
                                          <Typography color="error" sx={{ mb: 1 }}>问题代码：</Typography>
                                          <Typography>{issue.bug_code_example}</Typography>
                                        </Box>
                                      )}
                                      {(issue.optimized_code_example || issue.good_code_example) && (
                                        <Box>
                                          <Typography color="success" sx={{ mb: 1 }}>
                                            {issue.optimized_code_example ? '优化代码：' : '优质代码：'}
                                          </Typography>
                                          <Typography>
                                            {issue.optimized_code_example || issue.good_code_example}
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Grid>
                                )}
                              </Grid>
                            </Box>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Box>
            )}

            {/* 按严重程度分类标签页 */}
            
            {activeTab === 2 && Object.keys(groupedBySeverity).length > 0 && (
              <Box>
                {Object.entries(groupedBySeverity).map(([severity, issues], index) => {
                  const filteredIssues = filterIssues(issues);
                  if (filteredIssues.length === 0) return (
                    <Box display="flex" alignItems="center" width="922px"/>
                  );

                  return (
                    <Accordion key={index} sx={{ mb: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box display="flex" alignItems="center" width="100%">
                          <Chip
                            label={severity}
                            color={SeverityMap[severity]?.color}
                            size="medium"
                            sx={{ mr: 2 }}
                          />
                          <Typography variant="h6" sx={{ flex: 1 }}>
                            {SeverityMap[severity]?.label || severity}
                          </Typography>
                          <Box display="flex" gap={1}>
                            <Chip
                              label={`${filteredIssues.length}个问题`}
                              color="default"
                              size="small"
                            />
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box>
                          {filteredIssues.map((issue, idx) => (
                            <Box key={idx} sx={{ mb: 3, p: 2, bgcolor: SeverityMap[issue.severity]?.bgColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                              {issue.historical_mention && (
                                <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                                  <WarningIcon color="error" sx={{ mr: 1 }} />
                                  <Typography color="error" fontWeight="bold">
                                    顽固问题
                                  </Typography>
                                </Box>
                              )}

                              <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>文件</Typography>
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
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>类型</Typography>
                                  <Typography>{issue.bug_type}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>行号</Typography>
                                  <Typography>{issue.line || '无'}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>标记</Typography>
                                  <IconButton 
                                    size="small"
                                    onClick={() => handleMarkIssue(idx.toString(), !markedIssues.includes(idx.toString()))}
                                    color={markedIssues.includes(idx.toString()) ? 'primary' : 'default'}
                                  >
                                    <StarIcon 
                                      color={markedIssues.includes(idx.toString()) ? 'primary' : 'action'} 
                                      sx={{ 
                                        fill: markedIssues.includes(idx.toString()) ? '#1976d2' : 'none',
                                        stroke: markedIssues.includes(idx.toString()) ? '#1976d2' : 'currentColor'
                                      }}
                                    />
                                  </IconButton>
                                </Grid>

                                <Grid size={12}>
                                  <TableContainer>
                                    <Table size="small">
                                      <TableBody>
                                        <TableRow>
                                          <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold', width: '80px' }}>描述</TableCell>
                                          <TableCell sx={{ border: 'none', padding: '4px 0' }}>{issue.description}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                          <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold', width: '80px' }}>建议</TableCell>
                                          <TableCell sx={{ border: 'none', padding: '4px 0' }}>{issue.suggestion}</TableCell>
                                        </TableRow>
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </Grid>

                                {(issue.bug_code_example || issue.optimized_code_example || issue.good_code_example) && (
                                  <Grid size={12}>
                                    <Typography color="text.secondary" sx={{ mb: 0.5 }}>代码示例</Typography>
                                    <Box sx={{ bgcolor: isDarkMode ? '#333' : '#f5f5f5', p: 2, borderRadius: 1, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                      {issue.bug_code_example && (
                                        <Box sx={{ mb: 2 }}>
                                          <Typography color="error" sx={{ mb: 1 }}>问题代码：</Typography>
                                          <Typography>{issue.bug_code_example}</Typography>
                                        </Box>
                                      )}
                                      {(issue.optimized_code_example || issue.good_code_example) && (
                                        <Box>
                                          <Typography color="success" sx={{ mb: 1 }}>
                                            {issue.optimized_code_example ? '优化代码：' : '优质代码：'}
                                          </Typography>
                                          <Typography>
                                            {issue.optimized_code_example || issue.good_code_example}
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Grid>
                                )}
                              </Grid>
                            </Box>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Box>
            )}

            
            {/* 已标记问题标签页 - 使用groupedByMarked状态实现 */}
            {activeTab === 4 && (
              <Box>
                {Object.entries(groupedByMarked).map(([markStatus, issues], index) => {
                  const filteredIssues = filterIssues(issues);
                  
                  // 如果没有已标记的问题，显示空状态
                  if (markStatus === '已标记' && filteredIssues.length === 0) {
                    return (
                    <Box display="flex" alignItems="center" width="922px"/>
                  );
                  }
                  
                  if (filteredIssues.length === 0) return null;

                  return (
                    <Accordion key={index} sx={{ mb: 2 }} defaultExpanded={markStatus === '已标记'}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box display="flex" alignItems="center" width="100%">
                          <Chip
                            label={markStatus}
                            color={markStatus === '已标记' ? 'primary' : 'default'}
                            size="medium"
                            sx={{ mr: 2 }}
                          />
                          <Typography variant="h6" sx={{ flex: 1 }}>
                            {markStatus === '已标记' ? '已标记问题' : '未标记问题'}
                          </Typography>
                          <Box display="flex" gap={1}>
                            <Chip
                              label={`${filteredIssues.length}个问题`}
                              color="default"
                              size="small"
                            />
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box>
                          {filteredIssues.map((issue, idx) => (
                            <Box key={idx} sx={{ mb: 3, p: 2, bgcolor: SeverityMap[issue.severity]?.bgColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                              {issue.historical_mention && (
                                <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                                  <WarningIcon color="error" sx={{ mr: 1 }} />
                                  <Typography color="error" fontWeight="bold">
                                    顽固问题
                                  </Typography>
                                </Box>
                              )}

                              <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>文件</Typography>
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
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>类型</Typography>
                                  <Typography>{issue.bug_type}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>行号</Typography>
                                  <Typography>{issue.line || '无'}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>标记</Typography>
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
                                </Grid>

                                <Grid size={12}>
                                  <TableContainer>
                                    <Table size="small">
                                      <TableBody>
                                        <TableRow>
                                          <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold', width: '80px' }}>描述</TableCell>
                                          <TableCell sx={{ border: 'none', padding: '4px 0' }}>{issue.description}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                          <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold', width: '80px' }}>建议</TableCell>
                                          <TableCell sx={{ border: 'none', padding: '4px 0' }}>{issue.suggestion}</TableCell>
                                        </TableRow>
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </Grid>

                                {(issue.bug_code_example || issue.optimized_code_example || issue.good_code_example) && (
                                  <Grid size={12}>
                                    <Typography color="text.secondary" sx={{ mb: 0.5 }}>代码示例</Typography>
                                    <Box sx={{ bgcolor: isDarkMode ? '#333' : '#f5f5f5', p: 2, borderRadius: 1, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                      {issue.bug_code_example && (
                                        <Box sx={{ mb: 2 }}>
                                          <Typography color="error" sx={{ mb: 1 }}>问题代码：</Typography>
                                          <Typography>{issue.bug_code_example}</Typography>
                                        </Box>
                                      )}
                                      {(issue.optimized_code_example || issue.good_code_example) && (
                                        <Box>
                                          <Typography color="success" sx={{ mb: 1 }}>
                                            {issue.optimized_code_example ? '优化代码：' : '优质代码：'}
                                          </Typography>
                                          <Typography>
                                            {issue.optimized_code_example || issue.good_code_example}
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Grid>
                                )}
                              </Grid>
                            </Box>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Box>
            )}

            {/* 顽固问题标签页 - 使用groupedByHistorical状态实现 */}
            {activeTab === 3 && (
              <Box>
                {Object.entries(groupedByHistorical).map(([historicalStatus, issues], index) => {
                  const filteredIssues = filterIssues(issues);
                  
                  if (filteredIssues.length === 0) return (
                    <Box display="flex" alignItems="center" width="922px"/>
                  );;

                  return (
                    <Accordion key={index} sx={{ mb: 2 }} defaultExpanded={historicalStatus === '顽固问题'}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box display="flex" alignItems="center" width="100%">
                          <Chip
                            label={historicalStatus}
                            color={historicalStatus === '顽固问题' ? 'error' : 'default'}
                            size="medium"
                            sx={{ mr: 2 }}
                          />
                          <Typography variant="h6" sx={{ flex: 1 }}>
                            {historicalStatus === '顽固问题' ? '顽固问题' : '普通问题'}
                          </Typography>
                          <Box display="flex" gap={1}>
                            <Chip
                              label={`${filteredIssues.length}个问题`}
                              color="default"
                              size="small"
                            />
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box>
                          {filteredIssues.map((issue, idx) => (
                            <Box key={idx} sx={{ mb: 3, p: 2, bgcolor: SeverityMap[issue.severity]?.bgColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                              {issue.historical_mention && (
                                <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                                  <WarningIcon color="error" sx={{ mr: 1 }} />
                                  <Typography color="error" fontWeight="bold">
                                    顽固问题
                                  </Typography>
                                </Box>
                              )}

                              <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>文件</Typography>
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
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>类型</Typography>
                                  <Typography>{issue.bug_type}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>行号</Typography>
                                  <Typography>{issue.line || '无'}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>标记</Typography>
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
                                </Grid>

                                <Grid size={12}>
                                  <TableContainer>
                                    <Table size="small">
                                      <TableBody>
                                        <TableRow>
                                          <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold', width: '80px' }}>描述</TableCell>
                                          <TableCell sx={{ border: 'none', padding: '4px 0' }}>{issue.description}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                          <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold', width: '80px' }}>建议</TableCell>
                                          <TableCell sx={{ border: 'none', padding: '4px 0' }}>{issue.suggestion}</TableCell>
                                        </TableRow>
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </Grid>

                                {(issue.bug_code_example || issue.optimized_code_example || issue.good_code_example) && (
                                  <Grid size={12}>
                                    <Typography color="text.secondary" sx={{ mb: 0.5 }}>代码示例</Typography>
                                    <Box sx={{ bgcolor: isDarkMode ? '#333' : '#f5f5f5', p: 2, borderRadius: 1, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                      {issue.bug_code_example && (
                                        <Box sx={{ mb: 2 }}>
                                          <Typography color="error" sx={{ mb: 1 }}>问题代码：</Typography>
                                          <Typography>{issue.bug_code_example}</Typography>
                                        </Box>
                                      )}
                                      {(issue.optimized_code_example || issue.good_code_example) && (
                                        <Box>
                                          <Typography color="success" sx={{ mb: 1 }}>
                                            {issue.optimized_code_example ? '优化代码：' : '优质代码：'}
                                          </Typography>
                                          <Typography>
                                            {issue.optimized_code_example || issue.good_code_example}
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Grid>
                                )}
                              </Grid>
                            </Box>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Home;