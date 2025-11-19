import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { codeReviewAPI } from '../services/api/codeReviewAPI';
import {
  Box, Breadcrumbs, Button, Card, CardContent, Chip, CircularProgress,
  Accordion, AccordionSummary, AccordionDetails, Tabs, Tab, Typography,
  Grid, Alert, Divider, IconButton, Tooltip, Paper, TextField
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon, Refresh as RefreshIcon,
  Download as DownloadIcon, Search as SearchIcon,
  Warning as WarningIcon, CheckCircle as CheckCircleIcon,
  Error as ErrorIcon, Info as InfoIcon, Star as StarIcon
} from '@mui/icons-material';

// 审查状态枚举映射（对应后端ReviewStatus）
const StatusMap = {
  pending: { label: '待审查', color: 'default', icon: <InfoIcon /> },
  processing: { label: '审查中', color: 'primary', icon: <CircularProgress size={16} /> },
  completed: { label: '已完成', color: 'success', icon: <CheckCircleIcon /> },
  failed: { label: '审查失败', color: 'error', icon: <ErrorIcon /> }
};

// 严重程度样式映射
const SeverityMap = {
  严重: { color: 'error', bgColor: '#ffebee', label: '严重' },
  中等: { color: 'warning', bgColor: '#fff8e1', label: '中等' },
  轻微: { color: 'info', bgColor: '#e3f2fd', label: '轻微' },
  表扬: { color: 'success', bgColor: '#e8f5e9', label: '表扬' }
};



const Home = ({ isDarkMode, user: propUser }) => {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const [user, setUser] = useState(propUser || authUser);
  const [latestReview, setLatestReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0:按文件分类 1:按问题类型分类
  const [searchText, setSearchText] = useState('');
  const [parsedFinalResult, setParsedFinalResult] = useState([]); // 解析后的最终结果
  const [groupedByFile, setGroupedByFile] = useState({}); // 按文件分组的问题
  const [groupedByType, setGroupedByType] = useState({}); // 按问题类型分组的问题

  // 从final_result解析JSON数据
  useEffect(() => {
    if (latestReview?.final_result) {
      try {
        const resultObj = JSON.parse(latestReview.final_result);
        const resultArr = Object.values(resultObj);
        setParsedFinalResult(resultArr);
        console.log('解析后的最终结果:', resultArr);
        
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
        console.log(review.final_result);
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

  // 重新触发审查
  const handleRefreshReview = async () => {
    if (!latestReview) return;
    try {
      setLoading(true);
      const newReview = await codeReviewAPI.retriggerReview(latestReview._id); // 假设后端有重新触发接口
      setLatestReview(newReview);
    } catch (err) {
      setError('重新触发审查失败：' + err.message);
    } finally {
      setLoading(false);
    }
  };

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
      严重: parsedFinalResult.filter(item => item.severity === '严重').length,
      中等: parsedFinalResult.filter(item => item.severity === '中等').length,
      轻微: parsedFinalResult.filter(item => item.severity === '轻微').length,
      表扬: parsedFinalResult.filter(item => item.severity === '表扬').length,
      历史未修复: parsedFinalResult.filter(item => item.historical_mention).length
    };
  };

  // 获取合并建议
  const getMergeSuggestion = () => {
    const { 严重, 中等 } = getIssueCount();
    if (严重 > 0 || 中等 > 0) {
      return { suggestion: '不建议合并', color: 'error' };
    }
    return { suggestion: '建议合并', color: 'success' };
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
          重试
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
            首页
          </Typography>
          <Typography>审查记录</Typography>
          <Typography>暂无记录</Typography>
        </Breadcrumbs>
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            暂无代码审查记录
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            提交PR后将自动触发AI代码审查，审查完成后可在此查看结果
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')}>
            返回首页
          </Button>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* 面包屑导航 */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Typography linkComponent="button" onClick={() => navigate('/')} sx={{ cursor: 'pointer' }}>
          首页
        </Typography>
        <Typography linkComponent="button" onClick={() => navigate('/reviews')} sx={{ cursor: 'pointer' }}>
          审查记录
        </Typography>
        <Typography>PR #{latestReview.pr_number}</Typography>
      </Breadcrumbs>

      {/* 页面标题+操作按钮 */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          PR #{latestReview.pr_number} 代码审查结果
        </Typography>
        <Box display="flex" gap={2}>
          <Tooltip title="重新触发审查">
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefreshReview}
              disabled={latestReview.status === 'processing'}
            >
              重新审查
            </Button>
          </Tooltip>
          <Tooltip title="导出审查报告">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportReport}
            >
              导出报告
            </Button>
          </Tooltip>
          
        </Box>
      </Box>

      {/* PR基础信息卡片 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography color="text.secondary" sx={{ mb: 0.5 }}>仓库信息</Typography>
              <Typography variant="body1">
                {latestReview.repo_owner}/{latestReview.repo_name}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography color="text.secondary" sx={{ mb: 0.5 }}>PR作者</Typography>
              <Typography variant="body1">{latestReview.author}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography color="text.secondary" sx={{ mb: 0.5 }}>审查状态</Typography>
              <Chip
                icon={StatusMap[latestReview.status]?.icon}
                label={StatusMap[latestReview.status]?.label}
                color={StatusMap[latestReview.status]?.color}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography color="text.secondary" sx={{ mb: 0.5 }}>审查时间</Typography>
              <Typography variant="body1">
                {new Date(latestReview.created_at).toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
              <Typography color="text.secondary" sx={{ mb: 0.5 }}>PR标题</Typography>
              <Typography variant="body1">{latestReview.pr_title}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
              <Typography color="text.secondary" sx={{ mb: 0.5 }}>参与审查Agent数量</Typography>
              <Typography variant="body1">{latestReview.agent_count} 个</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 审查汇总统计 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* 统计卡片 */}
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee' }}>
            <Typography color="error" variant="h5" sx={{ mb: 1 }}>
              {issueCount.严重}
            </Typography>
            <Typography color="text.secondary">严重问题</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff8e1' }}>
            <Typography color="warning" variant="h5" sx={{ mb: 1 }}>
              {issueCount.中等}
            </Typography>
            <Typography color="text.secondary">中等问题</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
            <Typography color="info" variant="h5" sx={{ mb: 1 }}>
              {issueCount.轻微}
            </Typography>
            <Typography color="text.secondary">轻微问题</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
            <Typography color="success" variant="h5" sx={{ mb: 1 }}>
              {issueCount.表扬}
            </Typography>
            <Typography color="text.secondary">表扬项</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f3e5f5' }}>
            <Typography color="purple" variant="h5" sx={{ mb: 1 }}>
              {issueCount.历史未修复}
            </Typography>
            <Typography color="text.secondary">历史未修复</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <Alert severity={mergeSuggestion.color} sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6">合并建议：{mergeSuggestion.suggestion}</Typography>
          </Alert>
        </Grid>
      </Grid>

      {/* 搜索框 */}
      <Box sx={{ mb: 3 }}>
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
          <Tab label="按文件分类" />
          <Tab label="按问题类型分类" />
        </Tabs>
        <Divider sx={{ mb: 2 }} />

        {/* 按文件分类标签页 */}
        {activeTab === 0 && (
          <Box>
            {Object.entries(groupedByFile).map(([file, issues], index) => {
              const filteredIssues = filterIssues(issues);
              if (filteredIssues.length === 0) return null;

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
                        <Box key={idx} sx={{ mb: 3, p: 2, bgcolor: SeverityMap[issue.severity]?.bgColor, borderRadius: 1 }}>
                          {/* 历史未修复标记 */}
                          {issue.historical_mention && (
                            <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                              <WarningIcon color="error" sx={{ mr: 1 }} />
                              <Typography color="error" fontWeight="bold">
                                历史未修复问题
                              </Typography>
                            </Box>
                          )}

                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography color="text.secondary" sx={{ mb: 0.5 }}>问题类型</Typography>
                              <Typography>{issue.bug_type}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography color="text.secondary" sx={{ mb: 0.5 }}>严重程度</Typography>
                              <Chip
                                label={issue.severity}
                                color={SeverityMap[issue.severity]?.color}
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography color="text.secondary" sx={{ mb: 0.5 }}>行号</Typography>
                              <Typography>{issue.line || '无'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography color="text.secondary" sx={{ mb: 0.5 }}>标记</Typography>
                              <IconButton size="small">
                                <StarIcon color="action" />
                              </IconButton>
                            </Grid>

                            <Grid item xs={12}>
                              <Typography color="text.secondary" sx={{ mb: 0.5 }}>问题描述</Typography>
                              <Typography>{issue.description}</Typography>
                            </Grid>

                            <Grid item xs={12}>
                              <Typography color="text.secondary" sx={{ mb: 0.5 }}>修复建议</Typography>
                              <Typography>{issue.suggestion}</Typography>
                            </Grid>

                            {/* 代码示例 */}
                            {(issue.bug_code_example || issue.optimized_code_example || issue.good_code_example) && (
                              <Grid item xs={12}>
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

        {/* 按问题类型分类标签页 */}
        {activeTab === 1 && (
          <Box>
            {Object.entries(groupedByType).map(([type, issues], index) => {
              const filteredIssues = filterIssues(issues);
              if (filteredIssues.length === 0) return null;

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
                        <Box key={idx} sx={{ mb: 3, p: 2, bgcolor: SeverityMap[issue.severity]?.bgColor, borderRadius: 1 }}>
                          {issue.historical_mention && (
                            <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                              <WarningIcon color="error" sx={{ mr: 1 }} />
                              <Typography color="error" fontWeight="bold">
                                历史未修复问题
                              </Typography>
                            </Box>
                          )}

                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography color="text.secondary" sx={{ mb: 0.5 }}>文件路径</Typography>
                              <Typography>{issue.file}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography color="text.secondary" sx={{ mb: 0.5 }}>行号</Typography>
                              <Typography>{issue.line || '无'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography color="text.secondary" sx={{ mb: 0.5 }}>严重程度</Typography>
                              <Chip
                                label={issue.severity}
                                color={SeverityMap[issue.severity]?.color}
                                size="small"
                              />
                            </Grid>

                            <Grid item xs={12}>
                              <Typography color="text.secondary" sx={{ mb: 0.5 }}>问题描述</Typography>
                              <Typography>{issue.description}</Typography>
                            </Grid>

                            <Grid item xs={12}>
                              <Typography color="text.secondary" sx={{ mb: 0.5 }}>修复建议</Typography>
                              <Typography>{issue.suggestion}</Typography>
                            </Grid>

                            {(issue.bug_code_example || issue.optimized_code_example || issue.good_code_example) && (
                              <Grid item xs={12}>
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

      {/* 原始数据区 */}
      <Box sx={{ mb: 4 }}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">原始数据（技术人员查看）</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography variant="h7" sx={{ mb: 2 }}>Agent输出记录</Typography>
              {latestReview.agent_outputs.map((output, idx) => {
                try {
                  const parsed = JSON.parse(output);
                  return (
                    <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Agent #{idx + 1}
                      </Typography>
                      <Typography>{JSON.stringify(parsed, null, 2)}</Typography>
                    </Box>
                  );
                } catch (err) {
                  return (
                    <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#ffebee', borderRadius: 1 }}>
                      <Typography variant="body2" color="error">
                        Agent #{idx + 1} 输出格式错误
                      </Typography>
                    </Box>
                  );
                }
              })}

              <Typography variant="h7" sx={{ mb: 2, mt: 4 }}>最终聚合结果</Typography>
              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                <Typography>{JSON.stringify(parsedFinalResult, null, 2)}</Typography>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
};

export default Home;