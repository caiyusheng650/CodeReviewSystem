import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { codeReviewAPI } from '../services/api/codeReviewAPI';
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
  TabPanels,
  SidebarPanel,
  handleExportReport,
  filterIssues,
  StatusMap
} from '../components/Home';

const ReviewDetail = ({ isDarkMode }) => {
  const navigate = useNavigate();
  const { reviewId } = useParams();
  const { user } = useAuth();
  const theme = useTheme();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [markedIssues, setMarkedIssues] = useState([]);

  // 检测屏幕宽度是否小于1300px
  const isSmallScreen = useMediaQuery('(max-width:1299px)');

  // 从主题中获取严重程度映射
  const SeverityMap = theme.severityMap;

  // 根据reviewId加载审查详情
  useEffect(() => {
    const fetchReviewDetail = async () => {
      if (!reviewId) {
        setError('无效的审查ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const reviewDetail = await codeReviewAPI.getReviewBase(reviewId);
        setReview(reviewDetail);
      } catch (err) {
        console.error('获取审查详情失败:', err);
        setError('获取审查详情失败：' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchReviewDetail();
    }
  }, [reviewId, user]);

  // 标记问题处理函数
  const handleMarkIssue = (issue) => {
    setMarkedIssues(prev => {
      const isMarked = prev.some(marked => marked.index === issue.index);
      if (isMarked) {
        return prev.filter(marked => marked.index !== issue.index);
      } else {
        return [...prev, { ...issue, marked: true }];
      }
    });
  };

  // 解析final_result数据
  const parseFinalResult = (finalResult) => {
    if (!finalResult) return [];
    try {
      return Object.values(finalResult);
    } catch (err) {
      console.error('解析final_result失败:', err);
      return [];
    }
  };

  // 统计问题数量
  const getIssueCount = (parsedFinalResult) => {
    return {
      严重: parsedFinalResult.filter(item => item.severity === '严重').length,
      中等: parsedFinalResult.filter(item => item.severity === '中等').length,
      轻微: parsedFinalResult.filter(item => item.severity === '轻度').length,
      表扬: parsedFinalResult.filter(item => item.severity === '表扬').length,
      历史未修复: parsedFinalResult.filter(item => item.historical_mention).length
    };
  };

  // 获取合并建议
  const getMergeSuggestion = (issueCount) => {
    const { 严重, 中等 } = issueCount;
    if (严重 > 0 || 中等 > 0) {
      return { suggestion: '不建议合并', color: 'error' };
    }
    return { suggestion: '建议合并', color: 'success' };
  };

  // 分组问题数据
  const groupIssues = (issues) => {
    const groupedByFile = {};
    const groupedByType = {};
    const groupedBySeverity = {};
    const groupedByMarked = {};
    const groupedByHistorical = {};

    issues.forEach((issue, index) => {
      // 按文件分组
      if (!groupedByFile[issue.file]) {
        groupedByFile[issue.file] = [];
      }
      groupedByFile[issue.file].push({ ...issue, index });

      // 按类型分组
      if (!groupedByType[issue.bug_type]) {
        groupedByType[issue.bug_type] = [];
      }
      groupedByType[issue.bug_type].push({ ...issue, index });

      // 按严重程度分组
      if (!groupedBySeverity[issue.severity]) {
        groupedBySeverity[issue.severity] = [];
      }
      groupedBySeverity[issue.severity].push({ ...issue, index });

      // 按标记状态分组
      const markedStatus = issue.marked ? '已标记' : '未标记';
      if (!groupedByMarked[markedStatus]) {
        groupedByMarked[markedStatus] = [];
      }
      groupedByMarked[markedStatus].push({ ...issue, index });

      // 按历史状态分组
      const historicalStatus = issue.historical_mention ? '顽固问题' : '普通问题';
      if (!groupedByHistorical[historicalStatus]) {
        groupedByHistorical[historicalStatus] = [];
      }
      groupedByHistorical[historicalStatus].push({ ...issue, index });
    });

    return {
      groupedByFile,
      groupedByType,
      groupedBySeverity,
      groupedByMarked,
      groupedByHistorical
    };
  };

  // 过滤问题函数
  const filterIssues = (issues, searchText) => {
    if (!searchText.trim()) return issues;
    
    const lowerSearchText = searchText.toLowerCase();
    return issues.filter(issue => 
      issue.file?.toLowerCase().includes(lowerSearchText) ||
      issue.bug_type?.toLowerCase().includes(lowerSearchText) ||
      issue.description?.toLowerCase().includes(lowerSearchText) ||
      issue.severity?.toLowerCase().includes(lowerSearchText)
    );
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
          onClick={() => navigate('/reviews')}
          sx={{ mt: 2 }}
        >
          返回审查列表
        </Button>
      </Box>
    );
  }

  // 审查详情不存在
  if (!review) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          审查记录不存在
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/reviews')}
          sx={{ mt: 2 }}
        >
          返回审查列表
        </Button>
      </Box>
    );
  }

  const parsedFinalResult = parseFinalResult(review.final_result);
  const issueCount = getIssueCount(parsedFinalResult);
  const mergeSuggestion = getMergeSuggestion(issueCount);
  const groupedData = groupIssues(parsedFinalResult);

  return (
    <Box sx={{ p: 3, mx: 'auto', mt: 4 }}>
      {/* 面包屑导航 */}
      <Breadcrumbs sx={{ mb: 3 }}>
        
        <Typography linkComponent="button" onClick={() => navigate('/reviews')} sx={{ cursor: 'pointer' }}>
          审查
        </Typography>
        <Typography>PR #{review.pr_number}</Typography>
      </Breadcrumbs>

      {/* 页面标题+操作按钮 */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          PR #{review.pr_number} 智能代码审查结果
        </Typography>
        <Box display="flex" gap={2}>
          <Tooltip title="导出审查报告">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExportReport(review)}
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
            latestReview={review}
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

export default ReviewDetail;