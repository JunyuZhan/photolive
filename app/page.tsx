'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { LOCAL_STORAGE_URL } from '@/lib/localStorage'
import PhotoGrid from '../components/PhotoGrid'
import UploadModal from '../components/UploadModal'
import LoginForm from '../components/LoginForm'
import Link from 'next/link'

interface Photo {
  id: string
  user_id: string
  title: string
  description: string
  image_path: string
  created_at: string
  is_public: boolean
}

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [user, setUser] = useState<any>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setUser(session?.user ?? null)
        }
      )

      await fetchPhotos()
      setLoading(false)

      return () => {
        authListener?.subscription.unsubscribe()
      }
    }

    fetchUser()
  }, [])

  const fetchPhotos = async () => {
    // 获取公开照片，不需要登录
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching photos:', error)
    } else {
      setPhotos(data || [])
    }
  }

  const handleUpload = async (file: File, title: string, description: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('未登录')

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${session.user.id}/${fileName}`

    // 创建FormData对象上传到本地服务器
    const formData = new FormData()
    formData.append('file', file)
    formData.append('path', filePath)
    
    try {
      // 上传到本地存储服务器
      const response = await fetch(`${LOCAL_STORAGE_URL}/upload`, {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('上传文件失败')
      }
      
      // 插入数据库记录
      const { error: dbError } = await supabase.from('photos').insert([
        {
          user_id: session.user.id,
          title,
          description,
          image_path: filePath,
          is_public: true // 默认设为公开
        }
      ])
  
      if (dbError) {
        throw dbError
      }
  
      await fetchPhotos()
    } catch (error) {
      console.error('上传错误:', error)
      throw error
    }
  }

  const handleLogin = () => {
    setShowLogin(true)
  }

  const closeLoginModal = () => {
    setShowLogin(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">我的照片库</h1>
          {user ? (
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowUpload(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                上传照片
              </button>
              <button 
                onClick={() => supabase.auth.signOut()}
                className="text-gray-600"
              >
                退出
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              管理员登录
            </button>
          )}
        </div>
        <nav className="mt-4">
          <ul className="flex space-x-4">
            <li>
              <span className="font-semibold">照片</span>
            </li>
            {user && (
              <li>
                <Link href="/albums" className="text-blue-500 hover:underline">
                  相册
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </header>

      {/* 无论是否登录，都显示照片网格 */}
      <PhotoGrid photos={photos} showAddToAlbum={!!user} />
      
      {/* 登录模态窗口 */}
      {showLogin && !user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">管理员登录</h2>
              <button onClick={closeLoginModal} className="text-gray-500 hover:text-gray-700">
                ×
              </button>
            </div>
            <LoginForm />
          </div>
        </div>
      )}
      
      {/* 只有登录后才能上传照片 */}
      {user && (
        <UploadModal 
          show={showUpload}
          onClose={() => setShowUpload(false)}
          onUpload={handleUpload}
        />
      )}
    </div>
  )
}
