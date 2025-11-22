import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Typography,
  TextField,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
  useTheme,
  Tooltip,
  Collapse,
  Chip
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as UserIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatPanel = ({ isCollapsed, onToggle, messages = [], onSendMessage }) => {
  const theme = useTheme();
  const [inputText, setInputText] = useState('');
  const { t } = useTranslation();

  console.log('messages', messages);

  const handleSendMessage = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  if (isCollapsed) {
    return (
      <Card 
        sx={{ 
          width: 50, 
          height: 'fit-content',
          position: 'fixed',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000
        }}
      >
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          <Tooltip title={t('chatPanel.expand')} placement="left">
            <IconButton 
              onClick={onToggle}
              size="small"
              sx={{ 
                color: theme.palette.primary.main,
                '&:hover': { backgroundColor: theme.palette.action.hover }
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
          </Tooltip>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        width: 500,
        height: 'calc(100vh - 120px)',
        position: 'fixed',
        right: 16,
        top: 80,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 头部 */}
      <Box 
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Typography variant="h6" component="h2">
          {t('chatPanel.title')}
        </Typography>
        <Tooltip title={t('chatPanel.collapse')} placement="top">
          <IconButton 
            onClick={onToggle}
            size="small"
            sx={{ 
              color: theme.palette.text.secondary,
              '&:hover': { backgroundColor: theme.palette.action.hover }
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 消息列表 */}
      <Box 
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 1,
          '&::-webkit-scrollbar': {
            width: '5px'
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: theme.palette.grey[100],
            borderRadius: '1px'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.grey[400],
            borderRadius: '1px',
            '&:hover': {
              backgroundColor: theme.palette.grey[500]
            }
          }
        }}
      >
        {messages.length === 0 ? (
          <Box 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: theme.palette.text.secondary
            }}
          >
            <Typography variant="body2" align="center">
              {t('chatPanel.emptyState')}
            </Typography>
          </Box>
        ) : (
          <List sx={{ width: '100%' }}>
            {messages
              .filter(message => message.role !== 'system')
              .map((message, index) => (
              <ListItem 
                key={index} 
                alignItems="flex-start" 
                sx={{ 
                  px: 1,
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <Paper 
                  elevation={1}
                  sx={{ 
                    p: 1.5,
                    backgroundColor: message.role === 'user' 
                      ? theme.palette.mode === 'dark' 
                        ? theme.palette.primary.main // 深色模式下使用主色
                        : theme.palette.primary.light // 浅色模式下使用浅色
                      : theme.palette.mode === 'dark'
                        ? theme.palette.background.paper // 深色模式下使用卡片背景
                        : theme.palette.grey[100], // 浅色模式下使用浅灰
                    color: message.role === 'user' 
                      ? theme.palette.primary.contrastText 
                      : theme.palette.mode === 'dark'
                        ? theme.palette.text.primary // 深色模式下保持原色
                        : theme.palette.text.primary, // 浅色模式下保持原色
                    borderRadius: message.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    wordBreak: 'break-word',
                    maxWidth: '95%',
                    // 添加微妙的边框以增强在深色主题下的层次感
                    border: message.role === 'assistant' && theme.palette.mode === 'dark' 
                      ? `1px solid ${theme.palette.divider}` 
                      : 'none'
                  }}
                >
                  <Box sx={{ 
                    '& *': { 
                      color: 'inherit',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }
                  }}>
                    {message.content}
                  </Box>
                </Paper>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <Divider />

      {/* 输入区域 */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            placeholder={t('chatPanel.placeholder')}
            multiline
            fullWidth
            maxRows={4}
            size="small"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            sx={{
              '& .MuiInputBase-input': {
                fontSize: '0.875rem'
              }
            }}
          />
          
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {t('chatPanel.hint')}
          </Typography>
      </Box>
    </Card>
  );
};

export default ChatPanel;