import React from 'react';
import {
  Box, Chip, Typography, Grid, TableContainer, Table, TableBody, TableRow, TableCell,
  IconButton, Tooltip, useTheme
} from '@mui/material';
import { Warning as WarningIcon, Star as StarIcon } from '@mui/icons-material';

const IssueDisplay = ({
  issue,
  isDarkMode,
  markedIssues,
  handleMarkIssue
}) => {
  const theme = useTheme();
  // 从主题中获取严重程度映射
  const SeverityMap = theme.severityMap;
  
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
  );
};

export default IssueDisplay;