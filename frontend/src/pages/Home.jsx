import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { CircularProgress, Box, Typography } from '@mui/material';

// 导入模块化组件
import { useHomeData } from '../components/ReviewDetail/hooks';

const Home = ({ isDarkMode, user: propUser }) => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { t } = useTranslation();

  // 使用自定义钩子管理数据（必须在顶层调用）
  const { latestReview, loading } = useHomeData(authUser, propUser, t);

  useEffect(() => {
    // 只有在数据加载完成且不在加载状态时才进行导航
    if (!loading && latestReview !== undefined) {
      if (!latestReview) {
        navigate('/documentation');
      } else {
        navigate(`/reviews/${latestReview._id}`);
      }
    }
  }, [latestReview, loading, navigate]);

  // 显示加载状态和友好的提示信息
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
      <CircularProgress />
    </Box>
  );
  
};

export default Home;