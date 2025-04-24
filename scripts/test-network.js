// 测试到Supabase的网络连接
const https = require('https');

const supabaseUrl = 'jxmvhszkkvpynktgcj.supabase.co';

console.log(`正在测试到 ${supabaseUrl} 的连接...`);

// 简单的HTTPS GET请求测试连接
const req = https.get(`https://${supabaseUrl}`, (res) => {
  console.log(`连接成功! 状态码: ${res.statusCode}`);
  console.log(`响应头信息: ${JSON.stringify(res.headers)}`);
  
  res.on('data', (chunk) => {
    // 不需要处理响应内容
  });
});

req.on('error', (e) => {
  console.error(`连接错误: ${e.message}`);
});

// 5秒后超时
req.setTimeout(5000, () => {
  console.error('连接超时');
  req.destroy();
});

console.log('请求已发送，等待响应...'); 