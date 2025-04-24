// 测试Supabase数据库连接
const { createClient } = require('@supabase/supabase-js');

// 配置
const supabaseUrl = 'https://jxmvhszkkvpynktgcj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bXZoc3pra3ZweW5rdGdjaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzE0MDMwMTM0LCJleHAiOjIwMjk2MDYxMzR9.ZbkjO89nqiEpUWbzNHEW5_e_hGWPSv10LE3IoxSjnKw';

// Session Pooler URL (备选)
const poolerUrl = 'https://aws-0-us-east-1.pooler.supabase.com';
const poolerKeyPrefix = 'postgres.jxmvhszkkvpynktgcj';

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 带有重试功能的Supabase客户端
const supabaseWithRetry = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    fetch: async (url, options) => {
      const MAX_RETRIES = 3;
      let retries = 0;
      
      while (retries < MAX_RETRIES) {
        try {
          return await fetch(url, options);
        } catch (error) {
          console.warn(`尝试 ${retries + 1}/${MAX_RETRIES} 失败:`, error.message);
          
          if (retries < MAX_RETRIES - 1) {
            const delay = Math.pow(2, retries) * 100;
            console.log(`等待 ${delay}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
          } else {
            throw error;
          }
        }
      }
    }
  }
});

// 测试直接连接
async function testDirectConnection() {
  console.log('开始测试直接Supabase连接...');
  console.log('URL:', supabaseUrl);
  console.log('密钥:', supabaseAnonKey.substring(0, 10) + '...[隐藏]');

  try {
    // 测试基本连接 - 简单查询
    console.log('\n尝试查询photos表...');
    const { data, error } = await supabase
      .from('photos')
      .select('count(*)')
      .limit(1);

    if (error) {
      console.error('数据库查询错误:', error);
    } else {
      console.log('成功连接到数据库!');
      console.log('查询结果:', data);
    }

    // 测试认证 - 检查当前会话
    console.log('\n尝试验证认证服务...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('认证服务错误:', authError);
    } else {
      console.log('成功连接到认证服务!');
      console.log('当前会话:', authData.session ? '有效' : '无会话');
    }

  } catch (e) {
    console.error('连接异常:', e);
  }
}

// 测试带有重试的连接
async function testConnectionWithRetry() {
  console.log('\n\n开始测试带有重试的Supabase连接...');

  try {
    // 测试基本连接 - 简单查询
    console.log('\n尝试使用重试机制查询photos表...');
    const { data, error } = await supabaseWithRetry
      .from('photos')
      .select('count(*)')
      .limit(1);

    if (error) {
      console.error('数据库查询错误:', error);
    } else {
      console.log('成功使用重试连接到数据库!');
      console.log('查询结果:', data);
    }
  } catch (e) {
    console.error('重试连接异常:', e);
  }
}

// 执行测试
async function runTests() {
  await testDirectConnection();
  await testConnectionWithRetry();
  console.log("\n所有测试完成!");
}

runTests(); 