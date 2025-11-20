import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { codeReviewAPI } from '../services/api/codeReviewAPI';
import { formatDateTime } from '../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import {
  Box, Breadcrumbs, Card, CardContent, Chip, CircularProgress,
  Typography, Alert, Divider, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Button, Container
} from '@mui/material';
import {
  Search as SearchIcon, Error as ErrorIcon
} from '@mui/icons-material';

// 状态映射
const StatusMap = {
  待审查: { color: 'default', label: 'reviews.pending' },
  审查中: { color: 'warning', label: 'reviews.inProgress' },
  已完成: { color: 'success', label: 'reviews.completed' },
  失败: { color: 'error', label: 'reviews.failed' }
};

const Reviews = ({ isDarkMode }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const { t, i18n } = useTranslation();

  // 获取用户的所有审查记录
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await codeReviewAPI.getReviewHistory({});
        setReviews(response.reviews || []);
        // 将数据保存到localStorage
        localStorage.setItem('cachedReviews', JSON.stringify(response.reviews || []));
      } catch (err) {
        if (err.response?.status === 404) {
          setReviews([]);
        } else {
          setError(t('reviews.fetchFailed') + ': ' + (err.response?.data?.message || err.message));
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchReviews();
    }
  }, [user]);

  // 过滤审查记录
  const filteredReviews = reviews.filter(review => {
    const searchLower = searchText.toLowerCase();
    return (
      review.pr_title?.toLowerCase().includes(searchLower) ||
      review.repo_name?.toLowerCase().includes(searchLower) ||
      review.pr_number?.toString().includes(searchLower) ||
      review.author?.toLowerCase().includes(searchLower)
    );
  });

  // 查看审查详情
  const handleViewReview = (review) => {
    navigate(`/reviews/${review._id}`);
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
  if (reviews.length === 0) {
    return (
      <Box sx={{ p: 3, minWidth: 1200, mx: 'auto' }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Typography linkComponent="button" onClick={() => navigate('/')} sx={{ cursor: 'pointer' }}>
            {t('navigation.home')}
          </Typography>
          <Typography>{t('reviews.reviewRecords')}</Typography>
          <Typography>{t('reviews.noRecords')}</Typography>
        </Breadcrumbs>
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('reviews.noReviewRecords')}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {t('reviews.submitPRPrompt')}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')}>
            {t('common.back')} {t('navigation.home')}
          </Button>
        </Card>
      </Box>
    );
  }

  return (
    <Container maxWidth="1200" minWidth="1200px">
      <Box sx={{ mt: 4, mb: 4, height: 'calc(100vh - 200px)' }}>
        {/* 面包屑导航 */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Typography>{t('reviews.reviews')}</Typography>
        </Breadcrumbs>

        {/* 页面标题 */}
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
          {t('reviews.reviewRecords')}
        </Typography>

        {/* 搜索框 */}
        <TextField
          fullWidth 
          sx={{  mb: 3}}
          variant="outlined"
          placeholder={t('reviews.searchPlaceholder')}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />

        {/* 审查记录列表 */}
        <Card>
          <CardContent sx={{ p: 0, minWidth: 900 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('reviews.prNumber')}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('reviews.prTitle')}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('reviews.repository')}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('reviews.author')}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('reviews.status')}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('reviews.creationTime')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredReviews.map((review) => (
                    <TableRow
                      key={review._id}
                      hover
                      onClick={() => handleViewReview(review)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>#{review.pr_number}</TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={review.pr_title}
                        >
                          {review.pr_title}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        maxWidth: 150,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }} title={review.repo_name}>
                        {review.repo_name}
                      </TableCell>
                      <TableCell sx={{ 
                        maxWidth: 100,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }} title={review.author}>
                        {review.author}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={t(StatusMap[review.status]?.label) || review.status}
                          color={StatusMap[review.status]?.color || 'default'}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {review.created_at ? formatDateTime(review.created_at, {}, t) : t('common.unknown')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {filteredReviews.length === 0 && searchText && (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  {t('home.noMatchingRecords')}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* 统计信息 */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {t('home.filteredRecords', { count: filteredReviews.length })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('home.totalRecords', { count: reviews.length })}
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Reviews;