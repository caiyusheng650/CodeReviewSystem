import React from 'react';
import {
  Box, Chip, Typography, Grid, TableContainer, Table, TableBody, TableRow, TableCell,
  IconButton, Tooltip, useTheme
} from '@mui/material';
import { Warning as WarningIcon, Star as StarIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const IssueDisplay = ({
  issue,
  isDarkMode,
  markedIssues,
  handleMarkIssue
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
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
            {t('home.persistentIssues')}
          </Typography>
        </Box>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Typography color="text.secondary" sx={{ mb: 0.5 }}>{t('common.file')}</Typography>
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
          <Typography color="text.secondary" sx={{ mb: 0.5 }}>{t('common.type')}</Typography>
          <Typography>{issue.bug_type}</Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Typography color="text.secondary" sx={{ mb: 0.5 }}>{t('common.lineNumber')}</Typography>
          <Typography>{issue.line || t('common.none')}</Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Typography color="text.secondary" sx={{ mb: 0.5 }}>{t('common.mark')}</Typography>
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
                  <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold', width: '80px' }}>{t('common.description')}</TableCell>
                  <TableCell sx={{ border: 'none', padding: '4px 0' }}>{issue.description}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ border: 'none', padding: '4px 8px 4px 0', fontWeight: 'bold', width: '80px' }}>{t('common.suggestion')}</TableCell>
                  <TableCell sx={{ border: 'none', padding: '4px 0' }}>{issue.suggestion}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {issue.bug_code_example && (
          <Grid size={12}>
            <Typography color="error" sx={{ mb: 0.5, textAlign: 'left', fontWeight: 'bold' }}>{t('common.problemCode')}</Typography>
            <Box sx={{ bgcolor: isDarkMode ? '#333' : '#f5f5f5', p: 2, borderRadius: 1, fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", "Source Code Pro", Consolas, monospace', whiteSpace: 'pre-wrap' }}>
              <Typography sx={{ textAlign: 'left' }}>{issue.bug_code_example}</Typography>
            </Box>
          </Grid>
        )}

        {(issue.optimized_code_example || issue.good_code_example) && (
          <Grid size={12}>
            <Typography color="success" sx={{ mb: 0.5, textAlign: 'left', fontWeight: 'bold' }}>
              {issue.optimized_code_example ? t('common.optimizedCode') : t('common.goodCode')}
            </Typography>
            <Box sx={{ bgcolor: isDarkMode ? '#333' : '#f5f5f5', p: 2, borderRadius: 1, fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", "Source Code Pro", Consolas, monospace', whiteSpace: 'pre-wrap' }}>
              
              <Typography sx={{ textAlign: 'left' }}>
                {issue.optimized_code_example || issue.good_code_example}
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default IssueDisplay;