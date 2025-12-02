import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { codeReviewAPI } from '../services/api/codeReviewAPI';
import { aicopilotAPI } from '../services/api/AICopilotAPI';
import { useTranslation } from 'react-i18next';
import {
  Box, Breadcrumbs, Button, Card, CardContent, Chip, CircularProgress,
  Tabs, Tab, Typography, Alert, Divider, IconButton, Tooltip, TextField,
  useMediaQuery, useTheme
} from '@mui/material';
import {
  Download as DownloadIcon, Search as SearchIcon, Error as ErrorIcon
} from '@mui/icons-material';

// 导入ChatPanel组件
import ChatPanel from '../components/ChatPanel';

// 导入模块化组件
import {
  TabPanels,
  SidebarPanel,
  handleExportReport,
  filterIssues,
  StatusMap
} from '../components/ReviewDetail';


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
  const [chatHistory, setChatHistory] = useState([]);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  
  // ChatPanel相关状态
  const [isChatPanelCollapsed, setIsChatPanelCollapsed] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  
  const { t, i18n } = useTranslation();

  // 检测屏幕宽度是否小于1300px
  const isSmallScreen = useMediaQuery('(max-width:1299px)');

  // 从主题中获取严重程度映射
  const SeverityMap = theme.severityMap;

  // 根据reviewId加载审查详情
  useEffect(() => {
    const fetchReviewDetail = async () => {
      if (!reviewId) {
        setError(t('reviewDetail.invalidReviewId'));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const reviewDetail = await codeReviewAPI.getReviewBase(reviewId);
        
        // 检查是否找到了审查记录
        if (!reviewDetail) {
          setError(t('reviewDetail.reviewNotFound'));
          return;
        }
        
        setReview(reviewDetail);
        setMarkedIssues(reviewDetail.marked_issues);
        setIsPending(reviewDetail.status === 'pending');
      } catch (err) {
        console.error('加载审查详情失败:', err);
        
        // 根据错误类型提供更友好的错误信息
        if (err.response?.status === 404) {
          setError(t('reviewDetail.reviewNotFound'));
        } else if (err.response?.status === 401) {
          setError(t('common.unauthorized'));
        } else if (err.response?.status === 403) {
          setError(t('common.forbidden'));
        } else if (err.code === 'NETWORK_ERROR' || !err.response) {
          setError(t('common.networkError'));
        } else {
          setError(t('common.loadError'));
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchReviewDetail();
    }
  }, [reviewId, user]);

  // 加载聊天历史
  const fetchChatHistory = async () => {
    if (!reviewId) return;
    
    try {
      setChatHistoryLoading(true);
      const reviewDetail = await codeReviewAPI.getReviewDetail(reviewId);
      
      // 提取agent_outputs字段
      if (reviewDetail && reviewDetail.agent_outputs) {
        setChatHistory(reviewDetail.agent_outputs);
      } else {
        setChatHistory([]);
      }
    } catch (err) {
      console.error('加载聊天历史失败:', err);
      setChatHistory([]);
    } finally {
      setChatHistoryLoading(false);
    }
  };

  // 当切换到聊天历史标签页时加载聊天历史
  useEffect(() => {
    if (activeTab === 5 && user) {
      fetchChatHistory();
    }
  }, [activeTab, reviewId, user]);

  useEffect(() => {
    aicopilotAPI.getChatHistory(reviewId).then(history => {
      setChatMessages(history.chat_history || []);
    });
  }, []);



  // 标记问题处理函数
  const handleMarkIssue = async (issueId, marked) => {
    if (!review) return;
    
    try {
      const response = await codeReviewAPI.markIssue(review._id, issueId, marked);
      
      // 更新本地标记状态
      setMarkedIssues(response.marked_issues);
      
      // 更新review中的标记状态
      setReview({
        ...review,
        marked_issues: response.marked_issues
      });
      
    } catch (err) {
      console.error('标记问题失败：', err);
      // 可以添加错误提示
    }
  };

  // ChatPanel相关处理函数
  const handleToggleChatPanel = () => {
    setIsChatPanelCollapsed(!isChatPanelCollapsed);
  };

  const handleSendMessage = async (messageText) => {
    if (!review) return;
    
    
    // 添加用户消息
    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    
    try {
      // 创建AI消息占位符，用于流式更新
      const aiMessageIndex = chatMessages.length + 1;
      const aiMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString()
      };
      
      // 先添加空的AI消息
      setChatMessages(prev => [...prev, aiMessage]);
      
      // 调用真实的AI服务（流式输出）
      const apiCall = await aicopilotAPI.send(review._id, messageText);
      
      // 处理流式响应
      apiCall.stream(
        // onMessage - 实时接收增量内容
        (chunk) => {
          setChatMessages(prev => {
            const updated = [...prev];
            if (updated[aiMessageIndex]) {
              updated[aiMessageIndex] = {
                ...updated[aiMessageIndex],
                content: updated[aiMessageIndex].content + chunk
              };
            }
            return updated;
          });
        },
        
        // onError - 处理错误
        (error) => {
          console.error('AI回复错误:', error);
          
          // 处理认证错误
          if (error.message.includes('未登录') || error.message.includes('401') || error.message.includes('unauthorized')) {
            // 提示用户重新登录
            const authErrorMessage = {
              role: 'assistant',
              content: '登录已过期，请刷新页面重新登录后使用AI助手功能。',
              timestamp: new Date().toISOString(),
              error: true
            };
            setChatMessages(prev => [...prev, authErrorMessage]);
          } else {
            // 其他错误
            setChatMessages(prev => {
              const updated = [...prev];
              if (updated[aiMessageIndex]) {
                updated[aiMessageIndex] = {
                  ...updated[aiMessageIndex],
                  text: '抱歉，AI助手暂时无法回复，请稍后再试。',
                  error: true
                };
              }
              return updated;
            });
          }
        },
        
        // onComplete - 完整回复已完成
        (completeResponse) => {
          console.log('AI回复完成:', completeResponse);
        }
      );
      
    } catch (err) {
      console.error('发送消息失败：', err);
      
      // 处理不同类型的错误
      if (err.message.includes('未登录') || err.message.includes('unauthorized') || err.message.includes('401')) {
        const errorMessage = {
          role: 'ai',
          text: '登录已过期，请刷新页面重新登录。',
          timestamp: new Date().toISOString(),
          error: true
        };
        setChatMessages(prev => [...prev, errorMessage]);
      } else {
        // 添加错误消息
        const errorMessage = {
          role: 'ai',
          text: '抱歉，发送消息失败，请检查网络连接后重试。',
          timestamp: new Date().toISOString(),
          error: true
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    }
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
      轻微: parsedFinalResult.filter(item => item.severity === '轻微').length,
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
      const fileKey = issue.file || t('utils.unknownFile');
      if (!groupedByFile[fileKey]) {
        groupedByFile[fileKey] = [];
      }
      groupedByFile[fileKey].push({ ...issue, index });

      // 按类型分组
      const typeKey = issue.bug_type || t('utils.unknownType');
      if (!groupedByType[typeKey]) {
        groupedByType[typeKey] = [];
      }
      groupedByType[typeKey].push({ ...issue, index });

      // 按严重程度分组
      const severityKey = issue.severity || t('utils.unknownSeverity');
      if (!groupedBySeverity[severityKey]) {
        groupedBySeverity[severityKey] = [];
      }
      groupedBySeverity[severityKey].push({ ...issue, index });

      // 按标记状态分组
      const markedStatus = markedIssues.includes(index.toString()) ? t('utils.marked') : t('utils.unmarked');
      if (!groupedByMarked[markedStatus]) {
        groupedByMarked[markedStatus] = [];
      }
      groupedByMarked[markedStatus].push({ ...issue, index });

      // 按历史状态分组
      const historicalStatus = issue.historical_mention ? t('utils.persistentIssue') : t('utils.normalIssue');
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
  if (isPending) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {review.pr_title} {t('reviewDetail.pendingReview')}
        </Typography>
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          {t('common.refreshPage')}
        </Button>
      </Box>
    )
  }

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
          {t('common.back')} {t('reviews.reviewRecords')}
        </Button>
      </Box>
    );
  }

  // 审查详情不存在
  if (!review) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          {t('reviewDetail.reviewNotFound')}
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/reviews')}
          sx={{ mt: 2 }}
        >
          {t('common.back')} {t('reviews.reviewRecords')}
        </Button>
      </Box>
    );
  }

  const parsedFinalResult = parseFinalResult(review.final_result);
  const issueCount = getIssueCount(parsedFinalResult);
  const groupedData = groupIssues(parsedFinalResult);

  return (
    <Box sx={{ p: 3, mx: 'auto', mt: 6, position: 'relative',
        ml: {
          xs: 0, // 小屏幕时不需要额外padding，因为ChatPanel会调整位置
          sm: 0,
          md: 0, // 中等屏幕及以上，ChatPanel展开时留出空间
          lg: isChatPanelCollapsed ? 0 : -40  // 大屏幕时留出更多空间
        } }}>
      {/* 面包屑导航 */}
      <Breadcrumbs sx={{ mb: 3 }}>
        
        <Typography linkComponent="button" onClick={() => navigate('/reviews')} sx={{ cursor: 'pointer' }}>
          {t('reviewDetail.reviews')}
        </Typography>
        <Typography>PR #{review.pr_number}</Typography>
      </Breadcrumbs>

      {/* 页面标题+操作按钮 */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3,maxWidth: '1200px' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          PR #{review.pr_number} {t('reviewDetail.intelligentCodeReview')} {t('reviewDetail.reviewResults')}
        </Typography>
        <Box display="flex" gap={2}>
          <Tooltip title={t('reviewDetail.exportReport')}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExportReport(review)}
            >
              {t('reviewDetail.exportReport')}
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* 两列布局 */}
      <Box sx={{ 
        display: 'flex', 
        gap: 3, 
        position: 'relative',
        
      }}>
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
          width: isSmallScreen ? '100%' : 'auto',
          // 响应式的右边距调整
          marginRight: {
            xs: 0, // 手机端不需要额外margin
            sm: 0,
            md: isChatPanelCollapsed ? 0 : (isSmallScreen ? 0 : 0), // 中等屏幕根据左侧边栏状态调整
            lg: isChatPanelCollapsed ? 0 : (isSmallScreen ? 0 : 20) // 大屏幕时适度调整
          }
        }}>
          {/* 搜索框 */}
          <Box sx={{ mb: 3, width: '100%' }}>
            <TextField
              fullWidth
              placeholder={t('reviewDetail.searchPlaceholder')}
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
              <Tab label={t('reviewDetail.byType')} />
              <Tab label={t('reviewDetail.byFile')} />
              <Tab label={t('reviewDetail.bySeverity')} />
              <Tab label={t('reviewDetail.persistentIssues')} />
              <Tab label={t('reviewDetail.markedIssues')} />
              <Tab label={t('reviewDetail.chatHistory')} sx={{ ml: 'auto' }} />
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
              chatHistory={chatHistory}
              chatHistoryLoading={chatHistoryLoading}
            />
          </Box>
        </Box>
      </Box>

      {/* ChatPanel - 右侧可折叠交流面板 */}
      <ChatPanel
        isCollapsed={isChatPanelCollapsed}
        onToggle={handleToggleChatPanel}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
      />
    </Box>
  );
};

export default ReviewDetail;