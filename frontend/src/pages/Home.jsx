import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Box, Breadcrumbs, Button, Card, CardContent, Chip, CircularProgress,
  Tabs, Tab, Typography, Alert, Divider, IconButton, Tooltip, TextField,
  useMediaQuery, useTheme
} from '@mui/material';
import {
  Download as DownloadIcon, Search as SearchIcon, Error as ErrorIcon
} from '@mui/icons-material';

// 导入模块化组件
import {
  IssueDisplay,
  TabPanels,
  SidebarPanel,
  useHomeData,
  handleExportReport,
  filterIssues,
  StatusMap
} from '../components/Home';

const Home = ({ isDarkMode, user: propUser }) => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [searchText, setSearchText] = useState('');

  // 从主题中获取严重程度映射
  const SeverityMap = theme.severityMap;

  // 检测屏幕宽度是否小于1300px
  const isSmallScreen = useMediaQuery('(max-width:1299px)');

  // 使用自定义钩子管理数据
  const {
    user,
    latestReview,
    loading,
    error,
    parsedFinalResult,
    markedIssues,
    groupedData,
    handleMarkIssue,
    setError
  } = useHomeData(authUser, propUser);

  // 自动刷新逻辑 - 当审查未完成时，每30秒刷新页面
  useEffect(() => {
    if (latestReview && latestReview.status !== 'completed') {
      const refreshInterval = setInterval(() => {
        window.location.reload();
      }, 30000); // 30秒

      // 清理定时器
      return () => clearInterval(refreshInterval);
    }
  }, [latestReview]);

  // 统计问题数量
  const getIssueCount = () => {
    return {
      严重: parsedFinalResult.filter(item => item.severity === '严重').length,
      中等: parsedFinalResult.filter(item => item.severity === '中等').length,
      轻微: parsedFinalResult.filter(item => item.severity === '轻度').length,
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

  if (latestReview.status !== 'completed') {
    return (
      <Box sx={{ p: 3, mx: 'auto', mt: 4, minWidth: 1200 }}>
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

        {/* 页面标题 */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            PR #{latestReview.pr_number} 智能代码审查
          </Typography>
        </Box>

        {/* 审查进行中状态 */}
        <Card sx={{ p: 4, textAlign: 'center', mb: 4 }}>
          <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
            {/* 加载动画 */}
            <CircularProgress size={60} thickness={4} />
            
            {/* 状态标题 */}
            <Typography variant="h5" color="primary">
              智能代码审查进行中...
            </Typography>
            

          </Box>
        </Card>

        {/* PR基本信息 */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            PR 基本信息
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={3}>
            {/* PR编号 */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary">PR编号</Typography>
              <Typography variant="body1">#{latestReview.pr_number}</Typography>
            </Box>
            
            {/* 仓库名称 */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary">仓库</Typography>
              <Typography variant="body1">{latestReview.repo_name || '未指定'}</Typography>
            </Box>
                
            {/* 创建时间 */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary">创建时间</Typography>
              <Typography variant="body1">
                {latestReview.created_at ? new Date(latestReview.created_at).toLocaleString('zh-CN') : '未知'}
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* 自动刷新提示 */}
        <Box sx={{ mt: 3, textAlign: 'center',mb : '100vh'}}>
          <Typography variant="body2" color="text.secondary">
            页面会自动刷新，请勿关闭
          </Typography>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, mx: 'auto', mt: 4 }}>
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
          PR #{latestReview.pr_number} 智能代码审查结果
        </Typography>
        <Box display="flex" gap={2}>
          <Tooltip title="导出审查报告">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExportReport(latestReview)}
            >
              导出报告
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* 两列布局 */}
      <Box sx={{ display: 'flex', gap: 3, position: 'relative' }}>
        {/* 左侧列 - 仓库基本信息（屏幕宽度小于1300px时隐藏） */}
        {!isSmallScreen && (
          <SidebarPanel
            latestReview={latestReview}
            setActiveTab={setActiveTab}
          />
        )}

        {/* 右侧列 - 主要内容 */}
        <Box sx={{
          flex: 1,
          minHeight: '100vh',
          // 小屏幕时左侧边栏隐藏，右侧内容占满宽度
          width: isSmallScreen ? '100%' : 'auto'
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
              <Tab label="按类型分类" />
              <Tab label="按文件分类" />
              <Tab label="按程度分类" />
              <Tab label="顽固问题" />
              <Tab label="已标记问题" />
            </Tabs>
            <Divider sx={{ mb: 2 }} />

            {/* 标签页内容 */}
            <TabPanels
              activeTab={activeTab}
              groupedData={groupedData}
              filterIssues={filterIssues}
              searchText={searchText}
              markedIssues={markedIssues}
              handleMarkIssue={handleMarkIssue}
              isDarkMode={isDarkMode}
              SeverityMap={SeverityMap}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Home;