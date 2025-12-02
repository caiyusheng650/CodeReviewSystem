import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { codeReviewAPI } from '../services/api/codeReviewAPI';
import { formatDateTime } from '../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import {
  Box, Breadcrumbs, Card, CardContent, Chip, CircularProgress,
  Typography, Alert, Divider, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Button, Container,
  TablePagination
} from '@mui/material';
import {
  Search as SearchIcon, Error as ErrorIcon, ArrowUpward, ArrowDownward
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
  const [page, setPage] = useState(0); // 0-based page index
  const [rowsPerPage, setRowsPerPage] = useState(10); // 每页显示10条数据
  const [totalRecords, setTotalRecords] = useState(0); // 总记录数
  const { t, i18n } = useTranslation();
  
  // 排序状态
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });

  // 获取用户的所有审查记录
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 传递分页参数给API，后端使用1-based页码，前端使用0-based，所以需要page + 1
        const response = await codeReviewAPI.getReviewHistory({
          page: page + 1,
          size: rowsPerPage,
          search: searchText
        });
        const latestReviews = response.reviews || [];
        setReviews(latestReviews);
        setTotalRecords(response.total || 0); // 设置总记录数
        
        // 保存数据到localStorage供AppBar使用
        localStorage.setItem('cachedReviews', JSON.stringify(latestReviews));
        
      } catch (err) {
        if (err.response?.status === 404) {
          setReviews([]);
          localStorage.setItem('cachedReviews', JSON.stringify([]));
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
  }, [user, page, rowsPerPage, searchText]);

  // 重置到第一页当搜索文本改变时
  useEffect(() => {
    setPage(0);
  }, [searchText]);

  // 排序函数
  const handleSort = (columnKey) => {
    let direction = 'asc';
    
    if (sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key: columnKey, direction });
    setPage(0); // 排序后重置到第一页
  };

  // 获取排序方向图标
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return null;
    }
    
    if (sortConfig.direction === 'asc') {
      return <ArrowUpward sx={{ fontSize: 16 }} />;
    } else {
      return <ArrowDownward sx={{ fontSize: 16 }} />;
    }
  };

  // 过滤审查记录
  const filteredReviews = useMemo(() => {
    return reviews.filter(review => {
      const searchLower = searchText.toLowerCase();
      return (
        review.pr_title?.toLowerCase().includes(searchLower) ||
        review.repo_name?.toLowerCase().includes(searchLower) ||
        review.pr_number?.toString().includes(searchLower) ||
        review.author?.toLowerCase().includes(searchLower)
      );
    });
  }, [reviews, searchText]);

  // 排序后的数据
  const sortedReviews = useMemo(() => {
    if (!sortConfig.key) {
      return filteredReviews;
    }

    return [...filteredReviews].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // 处理不同数据类型
      if (sortConfig.key === 'created_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortConfig.key === 'pr_number') {
        aValue = parseInt(aValue) || 0;
        bValue = parseInt(bValue) || 0;
      } else {
        aValue = aValue?.toString().toLowerCase() || '';
        bValue = bValue?.toString().toLowerCase() || '';
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredReviews, sortConfig]);

  // 当前页显示的数据（由后端处理分页）
  const paginatedReviews = sortedReviews;

  // 处理页面切换
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // 处理每页显示数量变化
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // 重置到第一页
  };

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
    navigate('/documentation');
  }

  return (
    <Container maxWidth="1200" sx={{ minWidth: '1200px' }}>
      <Box sx={{ mt: 6, mb: 4, height: '100vh' }}>
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
                    <TableCell 
                      sx={{ 
                        whiteSpace: 'nowrap', 
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => handleSort('pr_number')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {t('reviews.prNumber')}
                        {getSortIcon('pr_number')}
                      </Box>
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        whiteSpace: 'nowrap', 
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => handleSort('pr_title')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {t('reviews.prTitle')}
                        {getSortIcon('pr_title')}
                      </Box>
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        whiteSpace: 'nowrap', 
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => handleSort('repo_name')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {t('reviews.repository')}
                        {getSortIcon('repo_name')}
                      </Box>
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        whiteSpace: 'nowrap', 
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => handleSort('author')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {t('reviews.author')}
                        {getSortIcon('author')}
                      </Box>
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        whiteSpace: 'nowrap', 
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => handleSort('status')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {t('reviews.status')}
                        {getSortIcon('status')}
                      </Box>
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        whiteSpace: 'nowrap', 
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => handleSort('created_at')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {t('reviews.creationTime')}
                        {getSortIcon('created_at')}
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                   {paginatedReviews.map((review) => (
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

        {/* 分页控件 */}
        <TablePagination
          component="div"
          count={totalRecords} // 使用后端返回的总记录数
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]} // 可选择的每页显示数量
          labelRowsPerPage={t('common.rowsPerPage')}
          labelDisplayedRows={({ from, to, count }) => {
            return `${from}-${to} ${t('common.of')} ${count !== -1 ? count : `>${to}`}`;
          }}
        />

        {/* 统计信息 */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {t('home.filteredRecords', { count: sortedReviews.length })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('home.totalRecords', { count: totalRecords })}
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Reviews;