import React, { createContext, useContext, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

// 创建Snackbar上下文
const SnackbarContext = createContext();

// 自定义hook，用于使用Snackbar上下文
export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

// Snackbar提供者组件
export const SnackbarProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('success'); // success, error, warning, info

  // 显示Snackbar的函数
  const showSnackbar = (msg, sev = 'success') => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  };

  // 关闭Snackbar的函数
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

export default SnackbarContext;