import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Paper,
  LinearProgress,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import {
  Code,
  Assignment,
  People,
  TrendingUp,
  Notifications,
  Schedule,
  CheckCircle,
  Cancel,
  Warning,
  BugReport,
  Security,
  CodeOff
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { codeReviewAPI } from '../services/api/codeReviewAPI';

const Home = ({ onThemeToggle, isDarkMode, user: propUser }) => {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const [user, setUser] = useState(propUser || authUser);
  const [latestReview, setLatestReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 使用传入的用户或认证上下文中的用户
    setUser(propUser || authUser);

    // 获取最近一条代码审查记录
    const fetchLatestReview = async () => {
      try {
        setLoading(true);
        setError(null);
        const review = await codeReviewAPI.getLatestReview();
        setLatestReview(review);
      } catch (err) {
        if (err.response?.status === 404) {
          // 用户暂无审查记录，这是正常情况
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { label: '仪表板', path: '/' },
    { label: '代码评审', path: '/reviews' },
    { label: '项目', path: '/projects' },
    { label: '团队', path: '/team' }
  ];

  // 获取问题类型的图标
  const getIssueTypeIcon = (bugType) => {
    switch (bugType?.toLowerCase()) {
      case 'security':
      case '安全':
        return <Security color="error" />;
      case 'performance':
      case '性能':
        return <TrendingUp color="warning" />;
      case 'bug':
      case '错误':
        return <BugReport color="error" />;
      case 'style':
      case '代码风格':
        return <CodeOff color="info" />;
      default:
        return <Warning color="warning" />;
    }
  };

  // 获取严重程度的颜色
  const getSeverityColor = (severity) => {
    switch (severity) {
      case '严重':
        return 'error';
      case '中等':
        return 'warning';
      case '轻微':
        return 'info';
      default:
        return 'default';
    }
  };

  // 获取合并建议的图标和颜色
  const getConclusionIcon = (conclusion) => {
    if (conclusion === '建议合并') {
      return { icon: <CheckCircle />, color: 'success' };
    } else {
      return { icon: <Cancel />, color: 'error' };
    }
  };

  // 格式化时间显示
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 12, mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ mt: 12, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          欢迎回来，{user?.username || '用户'}！
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          这是您的AI代码审查系统仪表板，您可以在这里查看最近的代码审查结果。
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {latestReview ? (
          <>
            {/* 审查概览卡片 */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                        <Code />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">
                          {latestReview.pr_title || '代码审查'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {latestReview.repo_owner}/{latestReview.repo_name} • PR #{latestReview.pr_number}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box display="flex" alignItems="center" mb={2}>
                      {getConclusionIcon(latestReview.final_result?.conclusion || '建议合并').icon}
                      <Typography variant="h6" color={getConclusionIcon(latestReview.final_result?.conclusion || '建议合并').color} sx={{ ml: 1 }}>
                        {latestReview.final_result?.conclusion || '建议合并'}
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                      审查时间: {formatTime(latestReview.created_at)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      审查统计
                    </Typography>
                    
                    {latestReview.final_result?.issues ? (
                      <Stack spacing={2}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">问题总数:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {Object.keys(latestReview.final_result.issues).length}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">严重问题:</Typography>
                          <Typography variant="body2" color="error" fontWeight="bold">
                            {Object.values(latestReview.final_result.issues).filter(issue => issue.severity === '严重').length}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">中等问题:</Typography>
                          <Typography variant="body2" color="warning" fontWeight="bold">
                            {Object.values(latestReview.final_result.issues).filter(issue => issue.severity === '中等').length}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">轻微问题:</Typography>
                          <Typography variant="body2" color="info" fontWeight="bold">
                            {Object.values(latestReview.final_result.issues).filter(issue => issue.severity === '轻微').length}
                          </Typography>
                        </Box>
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        暂无审查问题
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* 问题列表 */}
            {latestReview.final_result?.issues && Object.keys(latestReview.final_result.issues).length > 0 && (
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    审查问题详情
                  </Typography>
                  
                  <List>
                    {Object.entries(latestReview.final_result.issues).map(([issueId, issue], index) => (
                      <React.Fragment key={issueId}>
                        <ListItem alignItems="flex-start">
                          <ListItemAvatar>
                            <Avatar>
                              {getIssueTypeIcon(issue.bug_type)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" mb={1}>
                                <Typography variant="subtitle1" sx={{ mr: 2 }}>
                                  {issue.file}:{issue.line}
                                </Typography>
                                <Chip
                                  label={issue.bug_type}
                                  size="small"
                                  sx={{ mr: 1 }}
                                />
                                <Chip
                                  label={issue.severity}
                                  color={getSeverityColor(issue.severity)}
                                  size="small"
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.primary" gutterBottom>
                                  {issue.description}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>建议:</strong> {issue.suggestion}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < Object.keys(latestReview.final_result.issues).length - 1 && (
                          <Divider variant="inset" component="li" />
                        )}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Code sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                暂无代码审查记录
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                您还没有进行过代码审查，开始您的第一次AI代码审查吧！
              </Typography>
              <Button
                variant="contained"
                startIcon={<Code />}
                onClick={() => navigate('/reviews')}
              >
                开始代码审查
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 快速操作 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              快速操作
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Button
                variant="contained"
                startIcon={<Code />}
                onClick={() => navigate('/reviews')}
              >
                开始代码评审
              </Button>
              <Button
                variant="outlined"
                startIcon={<Assignment />}
                onClick={() => navigate('/reviews')}
              >
                查看审查历史
              </Button>
              <Button
                variant="outlined"
                startIcon={<People />}
                onClick={() => navigate('/team')}
              >
                团队管理
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default Home;