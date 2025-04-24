// 用于测试Supabase连接的Node.js脚本
const { createClient } = require('@supabase/supabase-js')

// 使用与应用程序相同的配置
const supabaseUrl = 'https://jxmvhszkkvpynktgcj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bXZoc3pra3ZweW5rdGdjaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzE0MDMwMTM0LCJleHAiOjIwMjk2MDYxMzR9.ZbkjO89nqiEpUWbzNHEW5_e_hGWPSv10LE3IoxSjnKw'

// 备用URL（使用IP地址而非域名）
const backupUrls = [
  'https://jxmvhszkkvpynktgcj.supabase.co',  // 原始域名
  'https://aws-0-us-east-1.pooler.supabase.com'  // 连接池URL（不要包含凭证）
]

// 添加连接池的项目引用头信息
const poolerHeaders = {
  'x-supabase-project-ref': 'jxmvhszkkvpynktgcj'
}

let currentUrlIndex = 0;
const connectionTimeout = 5000; // 5秒超时

// 自定义fetch函数，支持故障转移
const customFetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  
  // 顺序尝试所有可能的URL
  for (let i = 0; i < backupUrls.length; i++) {
    const urlIndex = (currentUrlIndex + i) % backupUrls.length;
    const baseUrl = backupUrls[urlIndex];
    
    // 替换请求URL中的域名部分
    const newUrl = url.replace(supabaseUrl, baseUrl);
    
    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), connectionTimeout);
    
    try {
      const newOptions = {
        ...init,
        signal: controller.signal
      };
      
      // 如果使用连接池URL，添加特殊头信息
      if (baseUrl.includes('pooler.supabase.com')) {
        newOptions.headers = {
          ...newOptions.headers,
          ...poolerHeaders
        };
      }
      
      const newInput = typeof input === 'string' ? newUrl : new Request(newUrl, input);
      
      console.log(`尝试连接到: ${baseUrl}`);
      const response = await fetch(newInput, newOptions);
      
      // 如果成功，更新当前使用的URL索引
      currentUrlIndex = urlIndex;
      console.log(`成功连接到: ${baseUrl}`);
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`连接到 ${baseUrl} 失败: ${error.message}`);
      
      // 如果已经尝试了所有URL，则抛出最后一个错误
      if (i === backupUrls.length - 1) {
        throw error;
      }
      // 否则继续尝试下一个URL
    }
  }
  
  throw new Error('所有连接尝试均失败');
};

// 创建带有增强连接功能的Supabase客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
  },
  global: {
    fetch: customFetch,
    headers: {
      'x-supabase-project-ref': 'jxmvhszkkvpynktgcj'
    }
  }
})

async function testConnection() {
  console.log('测试Supabase连接...')
  console.log(`URL: ${supabaseUrl}`)
  console.log(`备用URL: ${backupUrls.join(', ')}`)
  
  try {
    // 测试连接 - 尝试获取照片表中的一条记录
    const { data, error } = await supabase.from('photos').select('*').limit(1)
    
    if (error) {
      console.error('连接失败:', error)
      return
    }
    
    console.log('连接成功!')
    console.log('获取到的数据:', data)
  } catch (err) {
    console.error('连接过程中出现异常:', {
      message: err.message,
      details: err.toString(),
      code: err.code || ''
    })
  }
}

// 执行测试
testConnection() 