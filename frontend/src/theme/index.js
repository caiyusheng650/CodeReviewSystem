import { createTheme } from '@mui/material/styles';

// 严重程度样式映射 - 明暗主题适配
export const SeverityMap = {
  严重: { 
    color: 'error', 
    bgColor: { light: '#ffebee', dark: '#311b1b' }, 
    label: '严重' 
  },
  中等: { 
    color: 'warning', 
    bgColor: { light: '#fff8e1', dark: '#332c1a' }, 
    label: '中等' 
  },
  轻微: { 
    color: 'info', 
    bgColor: { light: '#e3f2fd', dark: '#1a2a3a' }, 
    label: '轻微' 
  },
  表扬: { 
    color: 'success', 
    bgColor: { light: '#e8f5e9', dark: '#1a2a1a' }, 
    label: '表扬' 
  },
  顽固: { 
    color: 'secondary', 
    bgColor: { light: '#f3e5f5', dark: '#2a1a2a' }, 
    label: '顽固' 
  }
};

// 创建主主题配置 - 使用 MUI 默认样式
export const theme = createTheme({
  severityMap: SeverityMap
});

// 深色主题配置 - 只修改颜色，保持 MUI 默认样式
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
  severityMap: SeverityMap
});