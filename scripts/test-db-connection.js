// 测试Supabase数据库连接
const { createClient } = require('@supabase/supabase-js');

// 直接使用您当前的配置值
const supabaseUrl = 'https://jxmvhszkkvpynktgcj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bXZoc3pra3ZweW5rdGdjaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzE0MDMwMTM0LCJleHAiOjIwMjk2MDYxMzR9.ZbkjO89nqiEpUWbzNHEW5_e_hGWPSv10LE3IoxSjnKw';

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('开始测试Supabase连接...');
  console.log('URL:', supabaseUrl);
  console.log('密钥:', supabaseAnonKey.substring(0, 10) + '...[隐藏]');

  try {
    // 测试基本连接 - 简单查询
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

// 执行测试
testConnection(); 