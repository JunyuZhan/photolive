'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { LOCAL_STORAGE_URL, fetchWithRetry } from '@/lib/localStorage'
import PhotoGrid from '../components/PhotoGrid'
import UploadModal from '../components/UploadModal'
import LoginForm from '../components/LoginForm'
import NetworkStatus from '../components/NetworkStatus'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import * as exifr from 'exifr'
import Image from 'next/image'
import Header from "../components/Header"

interface Photo {
  id: string
  user_id: string
  title: string
  description: string
  image_path: string
  created_at: string
  is_public: boolean
  taken_at?: string
}

// 管理员ID（请替换为你的Supabase用户ID）
const ADMIN_UID = '32ca5c88-7477-4035-ba7f-dbf7327c915c';

const INACTIVITY_LIMIT = 30 * 60 * 1000 // 30分钟
function useAutoLogout(onLogout: () => void) {
  const lastActive = useRef(Date.now())
  useEffect(() => {
    const update = () => lastActive.current = Date.now()
    window.addEventListener('mousemove', update)
    window.addEventListener('keydown', update)
    window.addEventListener('click', update)
    const timer = setInterval(() => {
      if (Date.now() - lastActive.current > INACTIVITY_LIMIT) {
        onLogout()
      }
    }, 60 * 1000)
    return () => {
      window.removeEventListener('mousemove', update)
      window.removeEventListener('keydown', update)
      window.removeEventListener('click', update)
      clearInterval(timer)
    }
  }, [onLogout])
}

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showNotify, setShowNotify] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const notifyRef = useRef<HTMLDivElement>(null)
  const [albums, setAlbums] = useState<any[]>([])

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setUser(session?.user ?? null)
        }
      )
      unsubscribe = () => authListener?.subscription.unsubscribe()
      await fetchPhotos()
      setLoading(false)
    }
    fetchUser()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  useEffect(() => {
    const fetchFilteredPhotos = async () => {
      const params = new URLSearchParams()
      const res = await fetch(`/api/photos/search?${params.toString()}`)
      const data = await res.json()
      setPhotos(data.photos || [])
    }
    fetchFilteredPhotos()
  }, [])

  const fetchPhotos = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
      if (error) {
        setErrorMsg('获取照片失败: ' + error.message)
        console.error('Error fetching photos:', error)
      } else {
        setPhotos(data || [])
        setErrorMsg(null)
      }
    } catch (err: any) {
      setErrorMsg('获取照片失败: ' + err.message)
      console.error('Error fetching photos:', err)
    }
  }

  const handleUpload = async (file: File, title: string, description: string): Promise<void> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('未登录')

      // 读取图片 EXIF 拍摄时间
      let takenAt: string | null = null
      try {
        const exifData = await exifr.parse(file, { translateValues: false })
        if (exifData && exifData.DateTimeOriginal) {
          takenAt = (exifData.DateTimeOriginal as Date).toISOString()
        }
      } catch (exifErr) {
        takenAt = null
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `${session.user.id}/${fileName}`

      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', filePath)

      const response = await fetchWithRetry(`${LOCAL_STORAGE_URL}/upload`, {
        method: 'POST',
        body: formData,
      }, 3, 10000)
      const responseData = await response.json()
      if (!responseData.success) {
        setErrorMsg('上传文件失败: ' + (responseData.error || '未知错误'))
        throw new Error('上传文件失败: ' + (responseData.error || '未知错误'))
      }

      // 插入数据库记录，带上 taken_at 字段
      const { error: dbError } = await supabase.from('photos').insert([
        {
          user_id: session.user.id,
          title,
          description,
          image_path: filePath,
          is_public: true,
          taken_at: takenAt
        }
      ])
      if (dbError) {
        setErrorMsg('数据库写入失败: ' + dbError.message)
        throw dbError
      }
      setErrorMsg(null)
      await fetchPhotos()
    } catch (error: any) {
      setErrorMsg('上传错误: ' + error.message)
      console.error('上传错误:', error)
      throw error
    }
  }

  const handleLogin = (): void => {
    setShowLogin(true)
  }

  const closeLoginModal = (): void => {
    setShowLogin(false)
  }

  const fetchNotifications = async () => {
    if (!user) return
    const res = await fetch(`/api/notify?user_id=${user.id}`)
    const data = await res.json()
    setNotifications(data.notifications || [])
    setUnreadCount((data.notifications || []).filter((n: any) => !n.is_read).length)
  }

  useEffect(() => {
    if (user) fetchNotifications()
  }, [user])

  const markAllRead = async () => {
    if (!user) return
    const ids = notifications.filter(n => !n.is_read).map(n => n.id)
    if (ids.length === 0) return
    await fetch('/api/notify/read', {
      method: 'POST',
      body: JSON.stringify({ user_id: user.id, ids }),
      headers: { 'Content-Type': 'application/json' }
    })
    fetchNotifications()
  }

  // 点击外部关闭通知弹窗
  useEffect(() => {
    if (!showNotify) return
    const handler = (e: MouseEvent) => {
      if (notifyRef.current && !notifyRef.current.contains(e.target as Node)) {
        setShowNotify(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotify])

  useEffect(() => {
    // 拉取公开相册
    const fetchAlbums = async () => {
      const { data, error } = await supabase
        .from('albums')
        .select('id, name, description, cover_photo_id, event_start, event_end, location, is_public, photos:cover_photo_id(image_path)')
        .eq('is_public', true)
        .order('event_start', { ascending: false })
      if (!error && data) setAlbums(data)
      else setAlbums([])
    }
    fetchAlbums()
  }, [])

  useAutoLogout(() => {
    if (user) {
      supabase.auth.signOut()
      window.location.reload()
    }
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const isLoggedIn = !!user
  const isAdmin = user?.id === ADMIN_UID

  const sortedPhotos = [...photos].sort((a, b) => {
    if (a.taken_at && b.taken_at) {
      const aTime = new Date(a.taken_at).getTime()
      const bTime = new Date(b.taken_at).getTime()
      return bTime - aTime
    } else if (a.taken_at) {
      return 1
    } else if (b.taken_at) {
      return -1
    } else {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  console.log('LOCAL_STORAGE_URL:', LOCAL_STORAGE_URL);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50 flex flex-col">
      <Header user={user} onLogin={handleLogin} onLogout={async () => { await supabase.auth.signOut(); window.location.reload(); }} />
      <main className="max-w-6xl mx-auto px-2 w-full flex-1">
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">精选相册</h2>
          {albums.length === 0 ? (
            <div className="text-gray-400 text-center py-8">暂无公开相册</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {albums.map(album => (
                <div key={album.id} className="bg-white rounded-lg shadow hover:shadow-xl transition p-4 flex flex-col items-center">
                  {album.photos && album.photos.image_path ? (
                    <Image src={album.photos.image_path.startsWith('http') ? album.photos.image_path : `${LOCAL_STORAGE_URL}/photos/${album.photos.image_path}`} width={240} height={160} alt={album.name} className="rounded mb-2 object-cover" />
                  ) : (
                    <div className="w-[240px] h-[160px] bg-gray-100 rounded mb-2 flex items-center justify-center text-gray-400">无封面</div>
                  )}
                  <div className="font-semibold text-lg mb-1">{album.name}</div>
                  <div className="text-gray-500 text-sm mb-1">{album.event_start ? new Date(album.event_start).toLocaleDateString() : ''} {album.location || ''}</div>
                  <div className="text-gray-400 text-xs line-clamp-2">{album.description}</div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section>
          <h2 className="text-2xl font-bold mb-4">最新照片</h2>
          <PhotoGrid photos={sortedPhotos} showAddToAlbum={isAdmin} />
        </section>
        {!isLoggedIn && (
          <div className="text-center mt-12 text-gray-500 text-lg">
            登录后可上传和管理照片，体验更多功能！
          </div>
        )}
      </main>
      <footer className="w-full text-center text-gray-400 text-sm py-4 mt-8 border-t border-gray-100 bg-white/60">
        © 2024 PhotoLive. JunyuZhan版权所有
        <span className="mx-2">|</span>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener" className="hover:underline">
          京ICP备12345678号
        </a>
      </footer>
      {/* 登录/注册弹窗 */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={closeLoginModal}>
          <div className="bg-white rounded-lg p-6 w-full max-w-xs shadow-lg relative" onClick={e => e.stopPropagation()}>
            <LoginForm />
            <button className="mt-4 w-full text-gray-400 hover:text-gray-600" onClick={closeLoginModal}>关闭</button>
          </div>
        </div>
      )}
    </div>
  )
}
