import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Chip,
  useTheme,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  IconButton,
  Collapse
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { getAgentColor, getAgentDisplayName, isMarkdownContent, getMarkdownStyles } from '../../utils/agentUtils';

const ChatHistoryPanel = ({ chatHistory, isDarkMode, chatHistoryLoading }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  
  // 折叠状态管理
  const [expandedMessages, setExpandedMessages] = useState({0:false});
  
  // 检查消息是否展开
  const isMessageExpanded = (index) => {
    return expandedMessages[index] !== false; // undefined 也视为展开
  };
  
  // 切换消息折叠状态
  const toggleMessageExpansion = (index) => {
    setExpandedMessages(prev => ({
      ...prev,
      [index]: !isMessageExpanded(index)
    }));
  };
  
  // 折叠所有消息
  const collapseAllMessages = () => {
    const allCollapsed = {};
    chatHistory.forEach((_, index) => {
      allCollapsed[index] = false;
    });
    setExpandedMessages(allCollapsed);
  };
  
  // 展开所有消息
  const expandAllMessages = () => {
    const allExpanded = {};
    chatHistory.forEach((_, index) => {
      allExpanded[index] = true;
    });
    setExpandedMessages(allExpanded);
  };

  // 处理加载状态
  if (chatHistoryLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', minWidth: '900px' }}>
        <Typography color="text.secondary">
          {t('tabPanels.loadingChatHistory')}
        </Typography>
      </Box>
    );
  }



  // 渲染Markdown内容
  const renderMarkdown = (content) => {
    return (
      <Box sx={getMarkdownStyles(isDarkMode)}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </Box>
    );
  };

  // 递归渲染嵌套的JSON对象
  const renderNestedJson = (value, depth = 0) => {
    if (!value || typeof value !== 'object') {
      // 如果是字符串且包含Markdown标记，渲染为Markdown
      if (typeof value === 'string' && isMarkdownContent(value)) {
        return renderMarkdown(value);
      }
      
      return (
        <Typography variant="body2">
          {String(value)}
        </Typography>
      );
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return (
          <Typography variant="body2" color="text.secondary">
            {t('chatHistory.emptyArray')} []
          </Typography>
        );
      }
      
      return (
        <Box sx={{ ml: depth * 2, borderLeft: '2px solid', borderColor: 'divider', pl: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {t('chatHistory.arrayItems', { count: value.length })}
          </Typography>
          {value.map((item, index) => (
            <Box key={index} sx={{ mb: 1 }}>
              <Typography variant="body2" component="span" sx={{ fontWeight: 'bold' }}>
                [{index}]: 
              </Typography>
              {renderNestedJson(item, depth + 1)}
            </Box>
          ))}
        </Box>
      );
    }
    
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          {t('chatHistory.emptyObject')} {}
        </Typography>
      );
    }
    
    return (
      <Box sx={{ ml: depth * 2, borderLeft: '2px solid', borderColor: 'divider', pl: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          {t('chatHistory.object')}
        </Typography>
        {entries.map(([key, val], index) => (
          <Box key={index} sx={{ mb: 1 }}>
            <Typography variant="body2" component="span" sx={{ fontWeight: 'bold' }}>
              {key}: 
            </Typography>
            {renderNestedJson(val, depth + 1)}
          </Box>
        ))}
      </Box>
    );
  };

  // 渲染JSON对象为表格
  const renderJsonTable = (jsonObj) => {
    if (!jsonObj || typeof jsonObj !== 'object') return null;
    
    const entries = Object.entries(jsonObj);
    
    return (
      <TableContainer component={Paper} sx={{ mt: 1, mb: 1, maxHeight: '400px', overflowY: 'auto' }}>
        <Table size="small" aria-label="json data table">
          
          <TableBody>
            {entries.map(([key, value], index) => (
              <TableRow key={index}>
                <TableCell 
                  component="th" 
                  scope="row"
                  sx={{ 
                    fontWeight: 'bold',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    verticalAlign: 'top'
                  }}
                >
                  {key}
                </TableCell>
                <TableCell>
                  {renderNestedJson(value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // 渲染JSON数组为表格
  const renderJsonArrayTable = (jsonArray) => {
    if (!Array.isArray(jsonArray) || jsonArray.length === 0) return null;
    
    // 检查数组项是否都是简单类型（非对象）
    const isSimpleArray = jsonArray.every(item => 
      item === null || typeof item !== 'object'
    );
    
    if (isSimpleArray) {
      // 如果是简单值数组
      return (
        <Box sx={{ mt: 1, mb: 1 }}>
          {jsonArray.map((item, index) => (
            <Card key={index} sx={{ mb: 1, p: 1 }}>
              <CardContent sx={{ py: 1 }}>
                {typeof item === 'string' && isMarkdownContent(item) ? (
                  renderMarkdown(item)
                ) : (
                  <Typography variant="body2">
                    {String(item)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      );
    }
    
    // 对于复杂数组，使用递归渲染
    return (
      <Box sx={{ mt: 1, mb: 1, maxHeight: '400px', overflowY: 'auto' }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
          {t('chatHistory.arrayData', { count: jsonArray.length })}
        </Typography>
        {jsonArray.map((item, index) => (
          <Card key={index} sx={{ mb: 2, p: 2, bgcolor: isDarkMode ? '#2a2a2a' : '#fafafa' }}>
            <CardContent sx={{ py: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
                {t('common.item')} {index + 1}:
              </Typography>
              {renderNestedJson(item)}
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  // 解析JSON内容
  const parseContent = (content) => {
    if (!content) return '';
    
    try {
      // 尝试解析JSON
      const parsed = JSON.parse(content);
      
      if (typeof parsed === 'object' && parsed !== null) {
        if (Array.isArray(parsed)) {
          return (
            renderJsonArrayTable(parsed)
          );
        } else {
          return (
            renderJsonTable(parsed)
          );
        }
      }
      
      // 如果是其他类型，直接显示
      return String(parsed);
    } catch (error) {
      // 如果不是JSON，直接返回内容
      return content;
    }
  };


  if (!chatHistory || chatHistory.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          {t('tabPanels.noChatHistory')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, minWidth: '900px', width: '100%',maxWidth:'900px' }}>
      {/* 折叠控制按钮 */}
      {chatHistory.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, justifyContent: 'flex-end' }}>
          <Chip 
            label={t('tabPanels.expandAll')} 
            onClick={expandAllMessages}
            size="small"
            variant="outlined"
            clickable
          />
          <Chip 
            label={t('tabPanels.collapseAll')} 
            onClick={collapseAllMessages}
            size="small"
            variant="outlined"
            clickable
          />
        </Box>
      )}
      
      {chatHistory.map((chat, index) => (
        <Paper
          key={index}
          elevation={1}
          sx={{
            mb: 2,
            p: 2,
            bgcolor: isDarkMode ? '#1a1a1a' : '#ffffff',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            
          }}
        >
          {/* 消息头部 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: getAgentColor(chat.agent, theme),
                mr: 1,
                fontSize: '0.875rem'
              }}
            >
              {getAgentDisplayName(chat.agent, t).charAt(0)}
            </Avatar>
            
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {getAgentDisplayName(chat.agent, t)}
                </Typography>
                
                {/* 折叠按钮 */}
                <IconButton
                  size="small"
                  onClick={() => toggleMessageExpansion(index)}
                  sx={{ ml: 'auto' }}
                >
                  {isMessageExpanded(index) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              
              
            </Box>
          </Box>

          {/* 分隔线 - 只在消息展开时显示 */}
          <Collapse in={isMessageExpanded(index)} timeout="auto">
            <Divider sx={{ my: 1 }} />
          </Collapse>

          {/* 消息内容 */}
          <Collapse in={isMessageExpanded(index)} timeout="auto" unmountOnExit>
            <Box
              sx={{
                borderRadius: 1,
                width: '100%', // 确保宽度统一
                minWidth: '100%', // 防止内容过小时宽度变化
                overflowX: 'auto', // 内容溢出时显示水平滚动条
                maxHeight: '400px' // 限制最大高度，防止内容过长
              }}
            >
              {chat.content}
            </Box>
          </Collapse>
        </Paper>
      ))}
    </Box>
  );
};

export default ChatHistoryPanel;