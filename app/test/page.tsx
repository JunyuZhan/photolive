'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [status, setStatus] = useState('测试中...')
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        // 测试数据库连接
        const { data, error } = await supabase.from('photos').select('*').limit(1)
        
        if (error) {
          console.error('数据库连接错误:', error)
          setStatus('连接失败')
          setResult(error)
        } else {
          console.log('数据库连接成功:', data)
          setStatus('连接成功')
          setResult(data)
        }
      } catch (err) {
        console.error('测试过程中出现异常:', err)
        setStatus('发生异常')
        setResult(err)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">数据库连接测试</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <div className="font-semibold mb-2">状态: 
          <span className={`ml-2 ${status === '连接成功' ? 'text-green-600' : 'text-red-600'}`}>
            {status}
          </span>
        </div>
        
        <div className="mt-4">
          <p className="font-semibold mb-2">详细结果:</p>
          <pre className="bg-gray-800 text-white p-4 rounded overflow-auto max-h-80">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Supabase配置</h2>
        <div className="bg-gray-100 p-4 rounded">
          <p><strong>配置状态:</strong> {status === '连接成功' ? '有效' : '无效'}</p>
        </div>
      </div>
    </div>
  )
} 