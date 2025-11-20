import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();

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
  } = useHomeData(authUser, propUser, t);

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
      [t('sidebar.criticalIssues')]: parsedFinalResult.filter(item => item.severity === '严重').length,
      [t('sidebar.moderateIssues')]: parsedFinalResult.filter(item => item.severity === '中等').length,
      [t('sidebar.minorIssues')]: parsedFinalResult.filter(item => item.severity === '轻度').length,
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
          <Typography>{t('navigation.reviews')}</Typography>
          <Typography>{t('home.noRecords')}</Typography>
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

  if (latestReview.status !== 'completed') {
    return (
      <Box sx={{ p: 3, mx: 'auto', mt: 4, minWidth: 1200 }}>
        {/* 面包屑导航 */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Typography linkComponent="button" onClick={() => navigate('/')} sx={{ cursor: 'pointer' }}>
            {t('navigation.home')}
          </Typography>
          <Typography linkComponent="button" onClick={() => navigate('/reviews')} sx={{ cursor: 'pointer' }}>
            {t('navigation.reviews')}
          </Typography>
          <Typography>PR #{latestReview.pr_number}</Typography>
        </Breadcrumbs>

        {/* 页面标题 */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            PR #{latestReview.pr_number} {t('home.intelligentCodeReview')}
          </Typography>
        </Box>

        {/* 审查进行中状态 */}
        <Card sx={{ p: 4, textAlign: 'center', mb: 4 }}>
          <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
            {/* 加载动画 */}
            <CircularProgress size={60} thickness={4} />
            
            {/* 状态标题 */}
            <Typography variant="h5" color="primary">
              {t('home.reviewInProgress')}
            </Typography>
            

          </Box>
        </Card>

        {/* PR基本信息 */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('home.prBasicInfo')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={3}>
            {/* PR编号 */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary">{t('home.prNumber')}</Typography>
              <Typography variant="body1">#{latestReview.pr_number}</Typography>
            </Box>
            
            {/* 仓库名称 */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary">{t('home.repository')}</Typography>
              <Typography variant="body1">{latestReview.repo_name || t('home.unknown')}</Typography>
            </Box>
                
            {/* 创建时间 */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary">{t('home.creationTime')}</Typography>
              <Typography variant="body1">
                {latestReview.created_at ? new Date(latestReview.created_at).toLocaleString() : t('home.unknown')}
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* 自动刷新提示 */}
        <Box sx={{ mt: 3, textAlign: 'center',mb : '100vh'}}>
          <Typography variant="body2" color="text.secondary">
            {t('home.autoRefreshPrompt')}
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
          {t('navigation.home')}
        </Typography>
        <Typography linkComponent="button" onClick={() => navigate('/reviews')} sx={{ cursor: 'pointer' }}>
          {t('navigation.reviews')}
        </Typography>
        <Typography>PR #{latestReview.pr_number}</Typography>
      </Breadcrumbs>

      {/* 页面标题+操作按钮 */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          PR #{latestReview.pr_number} {t('home.intelligentCodeReview')} {t('home.reviewResults')}
        </Typography>
        <Box display="flex" gap={2}>
          <Tooltip title={t('home.exportReport')}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExportReport(latestReview)}
            >
              {t('home.exportReport')}
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
              placeholder={t('home.searchPlaceholder')}
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
              <Tab label={t('home.byType')} />
              <Tab label={t('home.byFile')} />
              <Tab label={t('home.bySeverity')} />
              <Tab label={t('home.persistentIssues')} />
              <Tab label={t('home.markedIssues')} />
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