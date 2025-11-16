import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  Code,
  Assignment,
  People,
  TrendingUp,
  Notifications,
  Schedule
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = ({ onThemeToggle, isDarkMode, user: propUser }) => {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const [user, setUser] = useState(propUser || authUser);
  const [recentActivities, setRecentActivities] = useState([]);
  const [stats, setStats] = useState({
    totalReviews: 0,
    pendingReviews: 0,
    completedReviews: 0,
    teamMembers: 0
  });

  useEffect(() => {
    // 使用传入的用户或认证上下文中的用户
    setUser(propUser || authUser);

    // 模拟获取统计数据
    setStats({
      totalReviews: 24,
      pendingReviews: 5,
      completedReviews: 19,
      teamMembers: 8
    });

    // 模拟获取最近活动
    setRecentActivities([
      {
        id: 1,
        type: 'review',
        title: '用户登录模块代码评审',
        user: '张三',
        time: '2小时前',
        status: 'pending'
      },
      {
        id: 2,
        type: 'comment',
        title: '评论了"支付接口集成"',
        user: '李四',
        time: '4小时前',
        status: 'completed'
      },
      {
        id: 3,
        type: 'merge',
        title: '合并了"数据库优化"分支',
        user: '王五',
        time: '昨天',
        status: 'completed'
      },
      {
        id: 4,
        type: 'review',
        title: 'UI组件库重构',
        user: '赵六',
        time: '2天前',
        status: 'pending'
      }
    ]);
  }, [propUser, authUser]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { label: '仪表板', path: '/' },
    { label: '代码评审', path: '/reviews' },
    { label: '项目', path: '/projects' },
    { label: '团队', path: '/team' }
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'review':
        return <Code color="primary" />;
      case 'comment':
        return <Assignment color="secondary" />;
      case 'merge':
        return <TrendingUp color="success" />;
      default:
        return <Notifications />;
    }
  };

  const getStatusColor = (status) => {
    return status === 'pending' ? 'warning' : 'success';
  };

  return (
    <>
      <Container maxWidth="lg" sx={{ mt: 12, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          欢迎回来，{user?.name || '用户'}！
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          这是您的代码评审系统仪表板，您可以在这里查看最新的代码评审请求和团队动态。
        </Typography>

        {/* 统计卡片 */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Box flexGrow={1}>
                    <Typography color="textSecondary" gutterBottom variant="overline">
                      总评审数
                    </Typography>
                    <Typography variant="h4" component="div">
                      {stats.totalReviews}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                    <Assignment />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Box flexGrow={1}>
                    <Typography color="textSecondary" gutterBottom variant="overline">
                      待处理
                    </Typography>
                    <Typography variant="h4" component="div">
                      {stats.pendingReviews}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                    <Schedule />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Box flexGrow={1}>
                    <Typography color="textSecondary" gutterBottom variant="overline">
                      已完成
                    </Typography>
                    <Typography variant="h4" component="div">
                      {stats.completedReviews}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                    <TrendingUp />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Box flexGrow={1}>
                    <Typography color="textSecondary" gutterBottom variant="overline">
                      团队成员
                    </Typography>
                    <Typography variant="h4" component="div">
                      {stats.teamMembers}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                    <People />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* 最近活动 */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
              <Typography component="h2" variant="h6" color="primary" gutterBottom>
                最近活动
              </Typography>
              <List>
                {recentActivities.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar>
                          {getActivityIcon(activity.type)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.title}
                        secondary={
                          <>
                            <Typography
                              sx={{ display: 'inline' }}
                              component="span"
                              variant="body2"
                              color="text.primary"
                            >
                              {activity.user}
                            </Typography>
                            {' — ' + activity.time}
                            <Box sx={{ mt: 1 }}>
                              <Chip
                                size="small"
                                label={activity.status === 'pending' ? '待处理' : '已完成'}
                                color={getStatusColor(activity.status)}
                              />
                            </Box>
                          </>
                        }
                      />
                    </ListItem>
                    {index < recentActivities.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* 快速操作 */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
              <Typography component="h2" variant="h6" color="primary" gutterBottom>
                快速操作
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button variant="contained" fullWidth>
                  创建新评审
                </Button>
                <Button variant="outlined" fullWidth>
                  查看待处理
                </Button>
                <Button variant="outlined" fullWidth>
                  团队管理
                </Button>
                <Button variant="outlined" fullWidth>
                  项目设置
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default Home;