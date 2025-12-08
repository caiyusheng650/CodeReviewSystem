import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * 通用对话框组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.open - 是否打开对话框
 * @param {string} props.title - 对话框标题
 * @param {React.ReactNode} props.content - 对话框内容
 * @param {Array} props.actions - 对话框操作按钮配置
 * @param {Function} props.onClose - 关闭对话框回调
 * @param {string} props.maxWidth - 对话框最大宽度
 * @param {boolean} props.fullWidth - 是否全屏宽度
 */
const DialogManager = ({ 
  open, 
  title, 
  content, 
  actions = [], 
  onClose, 
  maxWidth = 'sm', 
  fullWidth = true 
}) => {
  const { t } = useTranslation();

  const defaultActions = [
    {
      text: t('settings.cancel'),
      onClick: onClose,
      variant: 'text',
      disabled: false
    }
  ];

  const finalActions = [...defaultActions, ...actions];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {content}
      </DialogContent>
      <DialogActions>
        {finalActions.map((action, index) => (
          <Button
            key={index}
            onClick={action.onClick || onClose}
            variant={action.variant || 'text'}
            color={action.color || 'primary'}
            disabled={action.disabled || false}
            startIcon={action.startIcon}
          >
            {action.text}
          </Button>
        ))}
      </DialogActions>
    </Dialog>
  );
};

export default DialogManager;