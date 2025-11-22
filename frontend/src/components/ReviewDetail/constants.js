import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';

// 审查状态枚举映射（对应后端ReviewStatus）
export const StatusMap = {
  pending: { label: 'pending', color: 'default', icon: InfoIcon },
  processing: { label: 'processing', color: 'primary', icon: InfoIcon },
  completed: { label: 'completed', color: 'success', icon: CheckCircleIcon },
  failed: { label: 'failed', color: 'error', icon: ErrorIcon }
};