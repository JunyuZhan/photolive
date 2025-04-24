import { createClient } from '@supabase/supabase-js'

// ========================================================
// 当前配置 - 如果无法连接，请使用下方的新项目配置
// ========================================================
const supabaseUrl = 'https://jxmvhszkkvpynktgcj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bXZoc3pra3ZweW5rdGdjaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzE0MDMwMTM0LCJleHAiOjIwMjk2MDYxMzR9.ZbkjO89nqiEpUWbzNHEW5_e_hGWPSv10LE3IoxSjnKw'

// ========================================================
// 新项目配置 - 在Supabase创建新项目后，用新值替换下面的占位符
// 然后注释掉上面的配置，取消注释下面的配置
// ========================================================
// const supabaseUrl = '你的新Supabase项目URL'
// const supabaseAnonKey = '你的新Supabase项目API密钥'

// 诊断连接问题
console.log('Supabase配置:')
console.log('URL:', supabaseUrl)
console.log('Key (前10字符):', supabaseAnonKey.substring(0, 10) + '...')

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 