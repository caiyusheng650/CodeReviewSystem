import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Chip,
  useTheme,
  alpha,
  Fade,
  Grow,
  Slide
} from '@mui/material';
import {
  Favorite,
  Star,
  GitHub,
  Coffee,
  Code,
  EmojiEvents,
  Group,
  Security,
  Speed,
  Visibility,
  CheckCircle,
  AutoAwesome,
  Psychology
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const Support = ({ isDarkMode }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [mounted, setMounted] = useState(false);
  const [visibleCards, setVisibleCards] = useState(0);
  const [showThanksAnimation, setShowThanksAnimation] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 错开动画显示
    const timer = setTimeout(() => {
      setVisibleCards(1);
    }, 300);
    const timer2 = setTimeout(() => {
      setVisibleCards(2);
    }, 600);
    const timer3 = setTimeout(() => {
      setVisibleCards(3);
    }, 900);
    const timer4 = setTimeout(() => {
      setVisibleCards(4);
    }, 1200);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  const projectFeatures = [
    {
      icon: <Code />,
      title: t('support.features.intelligentReview.title'),
      description: t('support.features.intelligentReview.description')
    },
    {
      icon: <Security />,
      title: t('support.features.security.title'),
      description: t('support.features.security.description')
    },
    {
      icon: <Speed />,
      title: t('support.features.efficiency.title'),
      description: t('support.features.efficiency.description')
    },
    {
      icon: <Visibility />,
      title: t('support.features.transparency.title'),
      description: t('support.features.transparency.description')
    },
    {
      icon: <AutoAwesome />,
      title: t('support.features.multiAgent.title'),
      description: t('support.features.multiAgent.description')
    }
  ];


  const handleSupportClick = (link) => {
    // 显示感谢动画
    setShowThanksAnimation(true);
    
    // 2秒后打开链接并隐藏动画
    setTimeout(() => {
      window.open(link, '_blank', 'noopener,noreferrer');
      setShowThanksAnimation(false);
    }, 2000);
  };

  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        py: 8,
        minHeight: 'calc(100vh - 140px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      {/* 感谢动画覆盖层 */}
      <Fade in={showThanksAnimation} timeout={500}>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(10px)'
          }}
        >
          <Grow in={showThanksAnimation} timeout={800}>
            <Box sx={{ textAlign: 'center' }}>
              {/* 动画效果的心形和星星 */}
              <Box sx={{ mb: 4 }}>
                <Favorite
                  sx={{
                    fontSize: 80,
                    color: '#FF6B6B',
                    animation: 'pulse 2s infinite, bounce 1s infinite',
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(1)', opacity: 1 },
                      '50%': { transform: 'scale(1.1)', opacity: 0.8 },
                      '100%': { transform: 'scale(1)', opacity: 1 }
                    },
                    '@keyframes bounce': {
                      '0%, 20%, 53%, 80%, 100%': { transform: 'translateY(0)' },
                      '40%, 43%': { transform: 'translateY(-30px)' },
                      '70%': { transform: 'translateY(-15px)' },
                      '90%': { transform: 'translateY(-4px)' }
                    }
                  }}
                />
              </Box>
              
              {/* 感谢文字 */}
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, #FF6B6B, #FF8E8E)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 2
                }}
              >
                {t('support.thanksAnimation.title')}
              </Typography>
              
              <Typography
                variant="h6"
                sx={{
                  color: theme.palette.text.secondary,
                  mb: 4
                }}
              >
                {t('support.thanksAnimation.message')}
              </Typography>
              
              {/* 飞舞的星星效果 */}
              <Box sx={{ position: 'relative', height: 60 }}>
                {Array.from({ length: 6 }, (_, i) => (
                  <Star
                    key={i}
                    sx={{
                      position: 'absolute',
                      fontSize: 24,
                      color: '#FFD700',
                      left: `${10 + i * 15}%`,
                      top: `${20 + Math.sin(i) * 20}%`,
                      animation: `float ${1.5 + i * 0.2}s infinite ease-in-out`,
                      '@keyframes float': {
                        '0%': { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
                        '50%': { transform: 'translateY(-20px) rotate(180deg)', opacity: 0.7 },
                        '100%': { transform: 'translateY(0px) rotate(360deg)', opacity: 1 }
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Grow>
        </Box>
      </Fade>

      {/* 主要内容区域 */}
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Fade in={mounted} timeout={1000}>
          <Box>
            {/* 头像和项目名称 */}
            <Box sx={{ mb: 4 }}>
              <Avatar
                sx={{
                  width: 180,
                  height: 180,
                  mx: 'auto',
                  mb: 3,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  fontSize: '3rem',
                  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`
                }}
              >
                <Coffee sx={{ fontSize: '90px' }} />
              </Avatar>
              
              <Typography
                variant="h2"
                component="h1"
                sx={{
                  fontWeight: 'bold',
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 2
                }}
              >
                {t('support.title')}
              </Typography>
            </Box>

            {/* 项目简介 */}
            <Typography
              variant="h5"
              sx={{
                color: theme.palette.text.secondary,
                maxWidth: '600px',
                mx: 'auto',
                mb: 6,
                lineHeight: 1.6
              }}
            >
              {t('support.description')}
            </Typography>

            {/* 主要支持按钮 */}
            <Grow in={mounted} timeout={1200}>
              <Button
                variant="contained"
                size="large"
                startIcon={<Favorite />}
                onClick={() => handleSupportClick('https://github.com/caiyusheng650/codereviewsystem')}
                sx={{
                  background: 'linear-gradient(45deg, #FF6B6B, #FF8E8E)',
                  color: 'white',
                  px: 6,
                  py: 2,
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  borderRadius: '50px',
                  boxShadow: `0 8px 32px ${alpha('#FF6B6B', 0.4)}`,
                  '&:hover': {
                    background: 'linear-gradient(45deg, #FF5252, #FF7979)',
                    transform: 'translateY(-2px)',
                    boxShadow: `0 12px 40px ${alpha('#FF6B6B', 0.5)}`
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {t('support.supportButton')}
              </Button>
            </Grow>
          </Box>
        </Fade>
      </Box>


      {/* 项目特性 */}
      <Box sx={{ mb: 6 }}>
        <Slide direction="up" in={mounted} timeout={2000}>
          <Typography
            variant="h4"
            component="h2"
            sx={{
              textAlign: 'center',
              mb: 6,
              fontWeight: 'bold',
              color: theme.palette.text.primary
            }}
          >
            {t('support.whyChooseUs')}
          </Typography>
        </Slide>

        <Grid container spacing={3}>
          {projectFeatures.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Grow in={visibleCards > index} timeout={1000 + index * 300}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    height: '100%',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.15)}`
                    }
                  }}
                >
                  <Box
                    sx={{
                      color: theme.palette.primary.main,
                      mb: 2,
                      display: 'flex',
                      justifyContent: 'center'
                    }}
                  >
                    {React.cloneElement(feature.icon, { sx: { fontSize: 40 } })}
                  </Box>
                  
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {feature.title}
                  </Typography>
                  
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.text.secondary,
                      lineHeight: 1.5
                    }}
                  >
                    {feature.description}
                  </Typography>
                </Paper>
              </Grow>
            </Grid>
          ))}
        </Grid>
      </Box>

      
    </Container>
  );
};

export default Support;