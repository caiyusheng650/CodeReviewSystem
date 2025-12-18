import React, { useState } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Button, 
  TextField, 
  Alert,
  Snackbar,
  IconButton,
  InputAdornment
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import DialogManager from './DialogManager';
import { authAPI } from '../../services/api/authAPI';

const AccountManager = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handlePasswordChange = (field) => (event) => {
    setPasswordData({
      ...passwordData,
      [field]: event.target.value
    });
    
    // Clear error for this field when user starts typing
    if (passwordErrors[field]) {
      setPasswordErrors({
        ...passwordErrors,
        [field]: ''
      });
    }
  };

  const validatePasswordForm = () => {
    const errors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = t('settings.currentPasswordRequired');
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = t('settings.newPasswordRequired');
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = t('auth.passwordMinLength');
    }
    
    if (!passwordData.confirmPassword) {
      errors.confirmPassword = t('settings.confirmPasswordRequired');
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = t('auth.passwordMismatch');
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSubmit = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    try {
      await authAPI.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });
      
      setSnackbar({
        open: true,
        message: t('settings.passwordChangedSuccess'),
        severity: 'success'
      });
      
      setPasswordDialogOpen(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: t('settings.passwordChangeFailed'),
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const passwordDialogContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
      <TextField
        fullWidth
        type={showCurrentPassword ? 'text' : 'password'}
        label={t('settings.currentPassword')}
        value={passwordData.currentPassword}
        onChange={handlePasswordChange('currentPassword')}
        error={!!passwordErrors.currentPassword}
        helperText={passwordErrors.currentPassword}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                edge="end"
              >
                {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          )
        }}
      />
      <TextField
        fullWidth
        type={showNewPassword ? 'text' : 'password'}
        label={t('settings.newPassword')}
        value={passwordData.newPassword}
        onChange={handlePasswordChange('newPassword')}
        error={!!passwordErrors.newPassword}
        helperText={passwordErrors.newPassword}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowNewPassword(!showNewPassword)}
                edge="end"
              >
                {showNewPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          )
        }}
      />
      <TextField
        fullWidth
        type={showConfirmPassword ? 'text' : 'password'}
        label={t('settings.confirmPassword')}
        value={passwordData.confirmPassword}
        onChange={handlePasswordChange('confirmPassword')}
        error={!!passwordErrors.confirmPassword}
        helperText={passwordErrors.confirmPassword}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                edge="end"
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          )
        }}
      />
    </Box>
  );

  const passwordDialogActions = [
    {
      text: t('settings.changePassword'),
      onClick: handlePasswordSubmit,
      variant: 'contained',
      color: 'primary'
    }
  ];

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          {user?.username || user?.email || 'User'}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setPasswordDialogOpen(true)}
          disabled={false}
        >
          {t('settings.changePassword')}
        </Button>
      </Box>

      <DialogManager
        open={passwordDialogOpen}
        title={t('settings.changePassword')}
        content={passwordDialogContent}
        actions={passwordDialogActions}
        onClose={() => {
          setPasswordDialogOpen(false);
          setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
          setPasswordErrors({});
        }}
        maxWidth="sm"
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default AccountManager;