import React from 'react';
import { Box, Breadcrumbs, Typography } from '@mui/material';

/**
 * 统一的页面布局组件
 * 提供一致的面包屑导航、标题样式和容器宽度
 */
const PageLayout = ({ 
  children, 
  breadcrumbs = [], 
  title, 
  titleComponent = 'h1',
  maxWidth = '1200px',
  sx = {},
  ...props 
}) => {
  return (
    <Box 
      sx={{ 
        mx: 'auto', 
        mt: 6, 
        position: 'relative', 
        width: maxWidth,
        mb: 4,
        height: '100vh',
        ...sx 
      }}
      {...props}
    >
      {/* 面包屑导航 */}
      {breadcrumbs.length > 0 && (
        <Breadcrumbs sx={{ mb: 3 }}>
          {breadcrumbs.map((crumb, index) => (
            <Typography
              key={index}
              component={crumb.component || 'span'}
              onClick={crumb.onClick}
              sx={{ 
                cursor: crumb.onClick ? 'pointer' : 'default',
                color: crumb.color || 'inherit'
              }}
            >
              {crumb.label}
            </Typography>
          ))}
        </Breadcrumbs>
      )}

      {/* 页面标题 */}
      {title && (
        <Typography 
          variant="h4" 
          component={titleComponent} 
          gutterBottom 
          sx={{ mb: 3 }}
        >
          {title}
        </Typography>
      )}

      {/* 页面内容 */}
      {children}
    </Box>
  );
};

export default PageLayout;