import { createTheme } from '@mui/material/styles';

// 创建主主题配置 - 使用 MUI 默认样式
export const theme = createTheme({
  
});

// 深色主题配置 - 只修改颜色，保持 MUI 默认样式
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});