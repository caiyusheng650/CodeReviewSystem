import { useState, useEffect } from 'react';
import jiraTokenManager from '../services/jiraTokenManager.js';
import jiraAPI from '../services/api/jiraAPI.js';

/**
 * Jira连接管理Hook
 * 用于管理Jira连接状态和自动令牌刷新
 * 
 * @param {string} connectionId - Jira连接ID
 * @returns {Object} 连接状态和管理方法
 */
export const useJiraConnection = (connectionId) => {
  const [connection, setConnection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenStatus, setTokenStatus] = useState('unknown');

  useEffect(() => {
    if (!connectionId) {
      setIsLoading(false);
      return;
    }

    // 加载连接信息
    const loadConnection = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 获取连接详情
        const connectionData = await jiraAPI.getConnectionById(connectionId);
        setConnection(connectionData);

        // 检查连接健康状态
        const health = await jiraTokenManager.getConnectionHealth(connectionId);
        setTokenStatus(health.status);

        // 启动自动监控
        jiraTokenManager.startConnectionMonitoring(connectionId);

      } catch (err) {
        console.error('加载Jira连接失败:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadConnection();

    // 监听令牌刷新事件
    const handleTokenRefreshed = (event) => {
      if (event.detail.connectionId === connectionId) {
        setTokenStatus('valid');
        setError(null);
      }
    };

    const handleTokenRefreshFailed = (event) => {
      if (event.detail.connectionId === connectionId) {
        setError('令牌刷新失败，请重新授权');
        setTokenStatus('error');
      }
    };

    window.addEventListener('jiraTokenRefreshed', handleTokenRefreshed);
    window.addEventListener('jiraTokenRefreshFailed', handleTokenRefreshFailed);

    // 清理函数
    return () => {
      jiraTokenManager.stopConnectionMonitoring(connectionId);
      window.removeEventListener('jiraTokenRefreshed', handleTokenRefreshed);
      window.removeEventListener('jiraTokenRefreshFailed', handleTokenRefreshFailed);
    };
  }, [connectionId]);

  // 手动刷新令牌
  const refreshToken = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await jiraTokenManager.refreshToken(connectionId);
      setTokenStatus('valid');
      
    } catch (err) {
      setError(err.message);
      setTokenStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取状态显示文本
  const getStatusText = () => {
    const statusMap = {
      'valid': '连接正常',
      'expiring_soon': '令牌即将过期',
      'expired': '令牌已过期',
      'error': '连接出错',
      'unknown': '状态未知'
    };
    return statusMap[tokenStatus] || '未知状态';
  };

  // 获取状态颜色
  const getStatusColor = () => {
    const colorMap = {
      'valid': 'success',
      'expiring_soon': 'warning',
      'expired': 'error',
      'error': 'error',
      'unknown': 'default'
    };
    return colorMap[tokenStatus] || 'default';
  };

  return {
    connection,
    isLoading,
    error,
    tokenStatus,
    refreshToken,
    getStatusText,
    getStatusColor,
    isHealthy: tokenStatus === 'valid'
  };
};

/**
 * 批量管理多个Jira连接的Hook
 */
export const useJiraConnections = (connectionIds = []) => {
  const [connections, setConnections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!connectionIds.length) {
      setIsLoading(false);
      return;
    }

    const loadConnections = async () => {
      try {
        setIsLoading(true);
        const results = [];
        const errorMap = {};

        for (const connectionId of connectionIds) {
          try {
            const health = await jiraTokenManager.getConnectionHealth(connectionId);
            results.push({
              connectionId,
              ...health
            });

            // 启动监控
            jiraTokenManager.startConnectionMonitoring(connectionId);

          } catch (err) {
            errorMap[connectionId] = err.message;
            results.push({
              connectionId,
              status: 'error',
              isHealthy: false,
              error: err.message
            });
          }
        }

        setConnections(results);
        setErrors(errorMap);

      } catch (err) {
        console.error('批量加载Jira连接失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConnections();

    return () => {
      // 清理所有监控
      connectionIds.forEach(id => {
        jiraTokenManager.stopConnectionMonitoring(id);
      });
    };
  }, [connectionIds]);

  // 批量刷新所有令牌
  const refreshAllTokens = async () => {
    const results = await jiraTokenManager.refreshAllTokens(connectionIds);
    
    // 更新连接状态
    const updatedConnections = connections.map(conn => {
      const result = results.find(r => r.connectionId === conn.connectionId);
      if (result) {
        return {
          ...conn,
          status: result.success ? 'valid' : 'error',
          isHealthy: result.success,
          error: result.success ? null : result.error?.message
        };
      }
      return conn;
    });

    setConnections(updatedConnections);
    return results;
  };

  return {
    connections,
    isLoading,
    errors,
    refreshAllTokens,
    healthyCount: connections.filter(c => c.isHealthy).length,
    totalCount: connections.length
  };
};