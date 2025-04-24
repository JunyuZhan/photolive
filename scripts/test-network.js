// 测试到Supabase的网络连接
const https = require('https');
const dns = require('dns');
const { createClient } = require('@supabase/supabase-js');

// 配置
const projectRef = 'jxmvhszkkvpynktgcj';
const supabaseDirectUrl = 'https://jxmvhszkkvpynktgcj.supabase.co'; 
const poolerUrl = 'https://aws-0-us-east-1.pooler.supabase.com';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bXZoc3pra3ZweW5rdGdjaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzE0MDMwMTM0LCJleHAiOjIwMjk2MDYxMzR9.ZbkjO89nqiEpUWbzNHEW5_e_hGWPSv10LE3IoxSjnKw'; 

console.log(`=== Supabase网络连接测试 ===`);

// 测试DNS解析 - 标准URL
console.log(`\n1. 测试标准Supabase URL DNS解析`);
dns.lookup(projectRef + '.supabase.co', { all: true }, (err, addresses) => {
  if (err) {
    console.error(`DNS解析错误: ${err.message}`);
  } else {
    console.log(`DNS解析成功!`);
    console.log('解析到的IP地址:');
    addresses.forEach(addr => {
      console.log(`- ${addr.address} (${addr.family === 4 ? 'IPv4' : 'IPv6'})`);
    });

    // 检查是否存在IPv4地址
    const hasIPv4 = addresses.some(addr => addr.family === 4);
    console.log(`IPv4兼容性: ${hasIPv4 ? '✅ 支持' : '❌ 不支持'}`);
  }

  // 测试DNS解析 - 连接池URL
  console.log(`\n2. 测试连接池DNS解析`);
  dns.lookup('aws-0-us-east-1.pooler.supabase.com', { all: true }, (err2, addresses2) => {
    if (err2) {
      console.error(`连接池DNS解析错误: ${err2.message}`);
    } else {
      console.log(`连接池DNS解析成功!`);
      console.log('解析到的IP地址:');
      addresses2.forEach(addr => {
        console.log(`- ${addr.address} (${addr.family === 4 ? 'IPv4' : 'IPv6'})`);
      });

      // 检查是否存在IPv4地址
      const hasIPv4 = addresses2.some(addr => addr.family === 4);
      console.log(`IPv4兼容性: ${hasIPv4 ? '✅ 支持' : '❌ 不支持'}`);
    }

    // 继续执行HTTPS测试
    testHttpsConnection();
  });
});

// 测试HTTPS连接
function testHttpsConnection() {
  // 首先测试直接URL
  console.log(`\n3. 测试标准URL HTTPS连接`);
  const directReq = https.get(supabaseDirectUrl, (res) => {
    console.log(`标准URL连接成功! 状态码: ${res.statusCode}`);
    
    res.on('data', () => {});
    
    res.on('end', () => {
      // 测试连接池URL
      testPoolerConnection();
    });
  });

  directReq.on('error', (e) => {
    console.error(`标准URL连接错误: ${e.message}`);
    // 即使标准连接失败，仍然尝试测试连接池
    testPoolerConnection();
  });

  // 5秒后超时
  directReq.setTimeout(5000, () => {
    console.error('标准URL连接超时');
    directReq.destroy();
    // 即使标准连接超时，仍然尝试测试连接池
    testPoolerConnection();
  });
}

// 测试连接池连接
function testPoolerConnection() {
  console.log(`\n4. 测试连接池URL HTTPS连接`);
  const poolerReq = https.get(poolerUrl, (res) => {
    console.log(`连接池URL连接成功! 状态码: ${res.statusCode}`);
    
    res.on('data', () => {});
    
    res.on('end', () => {
      // 测试API
      testBothApis();
    });
  });

  poolerReq.on('error', (e) => {
    console.error(`连接池URL连接错误: ${e.message}`);
    // 即使连接池连接失败，仍然尝试测试API
    testBothApis();
  });

  // 5秒后超时
  poolerReq.setTimeout(5000, () => {
    console.error('连接池URL连接超时');
    poolerReq.destroy();
    // 即使连接池连接超时，仍然尝试测试API
    testBothApis();
  });
}

// 测试两种API
async function testBothApis() {
  // 先测试标准API
  await testDirectApi();
  // 然后测试连接池API
  await testPoolerApi();
  console.log('\n所有测试完成!');
}

// 测试标准Supabase API
async function testDirectApi() {
  console.log(`\n5. 测试标准Supabase API`);
  
  try {
    const supabase = createClient(supabaseDirectUrl, supabaseAnonKey);
    
    // 简单查询测试
    const { data, error } = await supabase
      .from('photos')
      .select('count(*)')
      .limit(1);
      
    if (error) {
      console.error('标准API错误:', error);
    } else {
      console.log('标准API连接成功!');
      console.log('查询结果:', data);
    }
  } catch (err) {
    console.error('标准API异常:', err);
  }
}

// 测试连接池Supabase API
async function testPoolerApi() {
  console.log(`\n6. 测试连接池Supabase API`);
  
  try {
    const supabase = createClient(poolerUrl, supabaseAnonKey, {
      global: {
        headers: {
          'x-supabase-project-ref': projectRef
        }
      }
    });
    
    // 简单查询测试
    const { data, error } = await supabase
      .from('photos')
      .select('count(*)')
      .limit(1);
      
    if (error) {
      console.error('连接池API错误:', error);
    } else {
      console.log('连接池API连接成功!');
      console.log('查询结果:', data);
    }
  } catch (err) {
    console.error('连接池API异常:', err);
  }
} 