// 用于测试Supabase连接的Node.js脚本
const { createClient } = require('@supabase/supabase-js')

// 使用与应用程序相同的配置
const supabaseUrl = 'https://jxmvhszkkvpynktgcj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bXZoc3pra3ZweW5rdGdjaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzE0MDMwMTM0LCJleHAiOjIwMjk2MDYxMzR9.ZbkjO89nqiEpUWbzNHEW5_e_hGWPSv10LE3IoxSjnKw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  console.log('测试Supabase连接...')
  console.log(`URL: ${supabaseUrl}`)
  
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
    console.error('连接过程中出现异常:', err)
  }
}

// 执行测试
testConnection() 