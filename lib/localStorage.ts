// 本地存储服务配置
export const LOCAL_STORAGE_URL = 'http://localhost:13001'; // 本地开发服务器地址

// 添加带有超时和重试逻辑的存储服务请求函数
export async function fetchWithRetry(url: string, options?: RequestInit, retries = 3, timeout = 5000) {
  // 创建一个带有超时的控制器
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  const newOptions = {
    ...options,
    signal: controller.signal
  };
  
  try {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, newOptions);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP错误 ${response.status}: ${response.statusText}`);
        }
        
        return response;
      } catch (error: any) {
        lastError = error;
        
        // 如果是被我们的超时中止，则提供更明确的错误信息
        if (error.name === 'AbortError') {
          console.warn(`请求超时 (${timeout}ms): ${url}`);
          // 对于超时错误，立即尝试下一次
        } else {
          // 对于其他错误，增加等待时间
          const delay = Math.pow(2, attempt) * 100;
          console.warn(`请求失败 (${url}): ${error.message}. 重试 ${attempt + 1}/${retries} (${delay}ms后)`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // 最后一次尝试失败
        if (attempt === retries - 1) {
          throw lastError;
        }
      }
    }
    
    throw lastError; // 如果所有重试都失败
  } finally {
    clearTimeout(timeoutId);
  }
} 