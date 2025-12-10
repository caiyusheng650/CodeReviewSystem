import jiraAPI from './api/jiraAPI.js';

/**
 * Jira令牌管理器
 * 用于管理Jira连接的令牌状态和自动刷新
 */
class JiraTokenManager {
  constructor() {
    this.refreshTimers = new Map(); // 存储每个连接的刷新定时器
    this.statusCheckInterval = 5 * 60 * 1000; // 5分钟检查一次状态
  }

  /**
   * 启动连接状态监控
   * @param {string} connectionId - Jira连接ID
   */
  async startConnectionMonitoring(connectionId) {
    if (!connectionId) return;

    // 清除现有的定时器
    this.stopConnectionMonitoring(connectionId);

    // 立即检查一次状态
    await this.checkConnectionStatus(connectionId);

    // 设置定期检查
    const timer = setInterval(async () => {
      await this.checkConnectionStatus(connectionId);
    }, this.statusCheckInterval);

    this.refreshTimers.set(connectionId, timer);
    console.log(`开始监控Jira连接 ${connectionId}`);
  }

  /**
   * 停止连接状态监控
   * @param {string} connectionId - Jira连接ID
   */
  stopConnectionMonitoring(connectionId) {
    const timer = this.refreshTimers.get(connectionId);
    if (timer) {
      clearInterval(timer);
      this.refreshTimers.delete(connectionId);
      console.log(`停止监控Jira连接 ${connectionId}`);
    }
  }

  /**
   * 停止所有连接的监控
   */
  stopAllMonitoring() {
    this.refreshTimers.forEach((timer, connectionId) => {
      clearInterval(timer);
      console.log(`停止监控Jira连接 ${connectionId}`);
    });
    this.refreshTimers.clear();
  }

  /**
   * 检查连接状态并处理令牌刷新
   * @param {string} connectionId - Jira连接ID
   * @returns {Promise<Object>} 连接状态信息
   */
  async checkConnectionStatus(connectionId) {
    try {
      const status = await jiraAPI.getConnectionStatus(connectionId);
      
      console.log(`Jira连接 ${connectionId} 状态:`, status);

      // 根据令牌状态采取相应措施
      switch (status.token_status) {
        case 'expired':
          console.warn(`Jira连接 ${connectionId} 令牌已过期，尝试刷新...`);
          await this.refreshToken(connectionId);
          break;
          
        case 'expiring_soon':
          console.log(`Jira连接 ${connectionId} 令牌即将过期，提前刷新...`);
          await this.refreshToken(connectionId);
          break;
          
        case 'valid':
          // 令牌有效，无需处理
          break;
          
        default:
          console.warn(`未知的令牌状态: ${status.token_status}`);
      }

      return status;
    } catch (error) {
      console.error(`检查Jira连接 ${connectionId} 状态失败:`, error);
      
      // 如果检查失败，尝试刷新令牌
      if (error.response?.status === 401) {
        console.log(`尝试刷新Jira连接 ${connectionId} 令牌...`);
        await this.refreshToken(connectionId);
      }
      
      throw error;
    }
  }

  /**
   * 手动刷新指定连接的令牌
   * @param {string} connectionId - Jira连接ID
   * @returns {Promise<Object>} 刷新结果
   */
  async refreshToken(connectionId) {
    try {
      console.log(`正在刷新Jira连接 ${connectionId} 的令牌...`);
      
      const result = await jiraAPI.refreshToken(connectionId);
      
      if (result.success) {
        console.log(`Jira连接 ${connectionId} 令牌刷新成功`);
        
        // 触发自定义事件，通知UI更新
        window.dispatchEvent(new CustomEvent('jiraTokenRefreshed', {
          detail: { connectionId, result }
        }));
        
        return result;
      } else {
        throw new Error(result.message || '令牌刷新失败');
      }
    } catch (error) {
      console.error(`刷新Jira连接 ${connectionId} 令牌失败:`, error);
      
      // 触发自定义事件，通知UI处理错误
      window.dispatchEvent(new CustomEvent('jiraTokenRefreshFailed', {
        detail: { connectionId, error }
      }));
      
      throw error;
    }
  }

  /**
   * 批量刷新所有连接的令牌
   * @param {Array<string>} connectionIds - Jira连接ID数组
   * @returns {Promise<Array>} 刷新结果数组
   */
  async refreshAllTokens(connectionIds) {
    const results = [];
    
    for (const connectionId of connectionIds) {
      try {
        const result = await this.refreshToken(connectionId);
        results.push({ connectionId, success: true, result });
      } catch (error) {
        results.push({ connectionId, success: false, error });
      }
    }
    
    return results;
  }

  /**
   * 获取连接的健康状态（用于UI显示）
   * @param {string} connectionId - Jira连接ID
   * @returns {Promise<Object>} 健康状态信息
   */
  async getConnectionHealth(connectionId) {
    try {
      const status = await this.checkConnectionStatus(connectionId);
      
      return {
        connectionId,
        status: status.token_status,
        isHealthy: status.token_status === 'valid',
        expiresAt: status.token_expires_at,
        jiraUrl: status.jira_url,
        lastSync: status.last_sync_at,
        message: this.getStatusMessage(status.token_status)
      };
    } catch (error) {
      return {
        connectionId,
        status: 'error',
        isHealthy: false,
        error: error.message,
        message: '无法检查连接状态'
      };
    }
  }

  /**
   * 获取状态对应的消息
   * @param {string} status - 令牌状态
   * @returns {string} 状态消息
   */
  getStatusMessage(status) {
    const messages = {
      'valid': '连接正常',
      'expiring_soon': '令牌即将过期，将自动刷新',
      'expired': '令牌已过期，正在刷新',
      'error': '连接出错'
    };
    
    return messages[status] || '未知状态';
  }
}

// 创建单例实例
const jiraTokenManager = new JiraTokenManager();

// 页面卸载时清理定时器
window.addEventListener('beforeunload', () => {
  jiraTokenManager.stopAllMonitoring();
});

export default jiraTokenManager;