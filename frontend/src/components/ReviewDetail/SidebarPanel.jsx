import React from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Grid, Paper, Table, TableBody, TableRow, TableCell, Tooltip, TableContainer, Alert, useTheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CheckCircle as CheckCircleIcon, Error as ErrorIcon, Info as InfoIcon } from '@mui/icons-material';
import { formatDateTime } from '../../utils/dateUtils';

const SidebarPanel = ({ latestReview,setActiveTab }) => {
  const theme = useTheme();
  const SeverityMap = theme.severityMap;
  const isDarkMode = theme.palette.mode === 'dark';
  const { t } = useTranslation();
  
  // 根据主题模式获取背景颜色
  const getBgColor = (severity) => {
    const severityConfig = SeverityMap[severity];
    if (!severityConfig) return isDarkMode ? '#1a1a1a' : '#ffffff';
    return isDarkMode ? severityConfig.bgColor.dark : severityConfig.bgColor.light;
  };
  
  if (!latestReview) return null;

  // 统计问题数量
  const getIssueCount = () => {
    if (!latestReview.final_result) return { total: 0, bySeverity: {} };

    const issues = Object.values(latestReview.final_result);
    const bySeverity = issues.reduce((acc, issue) => {
      const severity = issue.severity || '未知';
      acc[severity] = (acc[severity] || 0) + 1;

      // 统计顽固问题（historical_mention为true）
      if (issue.historical_mention === true) {
        acc['顽固'] = (acc['顽固'] || 0) + 1;
      }

      return acc;
    }, {});


    return {
      total: issues.length,
      bySeverity
    };
  };

  const issueStats = getIssueCount();

  // 获取合并建议
  const getMergeSuggestion = () => {
    const { 严重, 中等 } = issueStats.bySeverity;
    if (严重 > 0 || 中等 > 0) {
      return { suggestion: '不建议合并', color: 'error' };
    }
    return { suggestion: '建议合并', color: 'success' };
  };

  const mergeSuggestion = getMergeSuggestion();

  return (
    <Box sx={{
      width: { xs: '100%', md: '25%', lg: '25%' },
      position: { xs: 'static', md: 'sticky' },
      top: { xs: 0, md: 80 },
      height: { xs: 'auto', md: 'calc(100vh - 100px)' },
      overflowY: { xs: 'visible', md: 'auto' },
      zIndex: 10,
      minWidth :'300px'
    }}>
      {/* PR基础信息卡片 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {/* 表格形式展示仓库信息 */}
          <TableContainer>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ border: 'none', padding: '4px 0', textAlign: 'left', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={`https://github.com/${latestReview.repo_owner}/${latestReview.repo_name}`}>
                      <a
                        href={`https://github.com/${latestReview.repo_owner}/${latestReview.repo_name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'inherit',
                          textDecoration: 'none',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                      >
                        {latestReview.repo_owner}/{latestReview.repo_name}
                      </a>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ border: 'none', padding: '4px 0', textAlign: 'left', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={`${latestReview.pr_title}`}>
                      <a
                        href={`https://github.com/${latestReview.repo_owner}/${latestReview.repo_name}/pull/${latestReview.pr_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'inherit',
                          textDecoration: 'none',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                      >
                        {latestReview.pr_title}
                      </a>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ border: 'none', padding: '4px 0', textAlign: 'left', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={`https://github.com/${latestReview.author}`}>
                      <a
                        href={`https://github.com/${latestReview.author}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'inherit',
                          textDecoration: 'none',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                      >
                        {latestReview.author}
                      </a>
                    </Tooltip>
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell sx={{ border: 'none', padding: '4px 0', textAlign: 'left', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={formatDateTime(latestReview.created_at, {}, t)}>
                      <span>{formatDateTime(latestReview.created_at, {}, t)}</span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 合并建议 */}
      <Alert severity={mergeSuggestion.color} sx={{ mb: 3 }}>
        <Typography variant="h7">{mergeSuggestion.suggestion === '建议合并' ? t('sidebar.recommended') : t('sidebar.notRecommended')}</Typography>
      </Alert>


      {/* 审查汇总统计 */}
      <Grid container spacing={2} sx={{ mb: 3 }} direction="column">
        <Grid size={12} onClick={() => setActiveTab(2)}>
          <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: getBgColor('严重') }}>
            <Typography color="text.secondary">{t('sidebar.criticalIssues')}</Typography>
            <Typography color="error" variant="h5">
              {issueStats.bySeverity.严重 || 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={12} onClick={() => setActiveTab(2)}>
          <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: getBgColor('中等') }}>
            <Typography color="text.secondary">{t('sidebar.moderateIssues')}</Typography>
            <Typography color="warning" variant="h5">
              {issueStats.bySeverity.中等 || 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={12} onClick={() => setActiveTab(2)}>
          <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: getBgColor('轻微') }}>
            <Typography color="text.secondary">{t('sidebar.minorIssues')}</Typography>
            <Typography color="info" variant="h5">
              {issueStats.bySeverity.轻微 || 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={12} onClick={() => setActiveTab(2)}>
          <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: getBgColor('表扬') }}>
            <Typography color="text.secondary">{t('sidebar.highPraise')}</Typography>
            <Typography color="success" variant="h5">
              {issueStats.bySeverity.表扬 || 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={12} onClick={() => setActiveTab(2)}>
          <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: getBgColor('顽固') }}>
            <Typography color="text.secondary">{t('sidebar.persistentIssues')}</Typography>
            <Typography color="secondary" variant="h5">
              {issueStats.bySeverity.顽固 || 0}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SidebarPanel;