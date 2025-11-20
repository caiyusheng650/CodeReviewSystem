import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';

// 审查状态枚举映射（对应后端ReviewStatus）
export const StatusMap = {
  pending: { label: '待审查', color: 'default', icon: InfoIcon },
  processing: { label: '审查中', color: 'primary', icon: InfoIcon },
  completed: { label: '已完成', color: 'success', icon: CheckCircleIcon },
  failed: { label: '审查失败', color: 'error', icon: ErrorIcon }
};