import { apiClient } from './client';

export const aicopilotAPI = {
  // 获取聊天历史记录
  getChatHistory: async (reviewId) => {
    const response = await apiClient.post(`/api/aicopilot/chathistory/${reviewId}`);
    return response.data;
  },

  // 发送消息到AI助手（支持流式输出）
  send: async (reviewId, message) => {
    // 使用 apiClient 的统一认证方法
    const response = await apiClient.createSSERequest(`/api/aicopilot/send/${reviewId}`, {
      method: 'POST',
      body: JSON.stringify({
        message: message
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return {
      // 流式数据处理回调
      stream: (onMessage, onError, onComplete) => {
        let fullResponse = '';

        const readChunk = async () => {
          try {
            const { done, value } = await reader.read();
            
            if (done) {
              onComplete(fullResponse);
              return;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6); // 移除 'data: ' 前缀
                
                if (data === '[DONE]') {
                  onComplete(fullResponse);
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  
                  if (parsed.type === 'content') {
                    fullResponse += parsed.content;
                    onMessage(parsed.content);
                  } else if (parsed.type === 'error') {
                    onError(new Error(parsed.content));
                    return;
                  }
                } catch (parseError) {
                  console.warn('Failed to parse SSE data:', data);
                }
              }
            }

            // 继续读取下一个块
            readChunk();
          } catch (error) {
            onError(error);
          }
        };

        readChunk();

        // 返回取消函数
        return () => {
          reader.cancel();
        };
      }
    };
  },

  // 便捷方法：直接处理流式数据并返回完整响应
  sendAndWait: async (reviewId, message) => {
    return new Promise((resolve, reject) => {
      let fullResponse = '';

      const apiCall = this.send(reviewId, message);
      
      apiCall.stream(
        // onMessage - 处理增量数据
        (chunk) => {
          fullResponse += chunk;
        },
        // onError - 处理错误（包括认证错误）
        (error) => {
          reject(error);
        },
        // onComplete - 完成时调用
        (completeResponse) => {
          resolve({
            type: 'success',
            response: fullResponse,
            timestamp: new Date().toISOString()
          });
        }
      );
    });
  }

}