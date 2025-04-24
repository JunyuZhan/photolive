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
import PhotoFilterPanel from '../components/PhotoFilterPanel'

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

interface PhotoFilter {
  tags: string[]
  photographer: string
  taken_from: string
  taken_to: string
  created_from: string
  created_to: string
  keyword: string
}

// 管理员ID（请替换为你的Supabase用户ID）
const ADMIN_UID = '32ca5c88-7477-4035-ba7f-dbf7327c915c';

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'created_at' | 'taken_at'>('created_at')
  const [filters, setFilters] = useState<PhotoFilter>({
    tags: [], photographer: '', taken_from: '', taken_to: '', created_from: '', created_to: '', keyword: ''
  })
  const [allTags, setAllTags] = useState<string[]>([])
  const [showNotify, setShowNotify] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const notifyRef = useRef<HTMLDivElement>(null)

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
    // 获取所有标签
    const fetchTags = async () => {
      const { data, error } = await supabase.from('photos').select('tags')
      if (!error && data) {
        const tagSet = new Set<string>()
        data.forEach((row: any) => {
          if (Array.isArray(row.tags)) row.tags.forEach((t: string) => tagSet.add(t))
        })
        setAllTags(Array.from(tagSet))
      }
    }
    fetchTags()
  }, [])

  useEffect(() => {
    const fetchFilteredPhotos = async () => {
      const params = new URLSearchParams()
      filters.tags.forEach(tag => params.append('tags', tag))
      if (filters.photographer) params.append('photographer', filters.photographer)
      if (filters.taken_from) params.append('taken_from', filters.taken_from)
      if (filters.taken_to) params.append('taken_to', filters.taken_to)
      if (filters.created_from) params.append('created_from', filters.created_from)
      if (filters.created_to) params.append('created_to', filters.created_to)
      if (filters.keyword) params.append('keyword', filters.keyword)
      const res = await fetch(`/api/photos/search?${params.toString()}`)
      const data = await res.json()
      setPhotos(data.photos || [])
    }
    fetchFilteredPhotos()
  }, [filters])

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
    if (sortBy === 'taken_at') {
      const aTime = a.taken_at ? new Date(a.taken_at).getTime() : new Date(a.created_at).getTime()
      const bTime = b.taken_at ? new Date(b.taken_at).getTime() : new Date(b.created_at).getTime()
      return bTime - aTime
    } else {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50 flex flex-col">
      <header className="py-6 flex flex-col sm:flex-row justify-between items-center w-full max-w-5xl mx-auto relative">
        <div className="flex flex-col items-center sm:items-start">
          <Image src="/logo.svg" width={64} height={64} alt="logo" className="mb-2" />
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-gray-800">PhotoLive · 个人照片墙</h1>
          <p className="text-gray-500 text-base sm:text-lg">记录生活每一刻</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2 items-center">
          {!isLoggedIn && (
            <button
              onClick={handleLogin}
              className="bg-blue-500 text-white px-4 py-2 rounded-md transition text-base active:scale-95"
            >
              管理员登录
            </button>
          )}
          {isLoggedIn && (
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-gray-600 bg-gray-100 px-4 py-2 rounded-md transition text-base active:scale-95"
            >
              退出
            </button>
          )}
          {isLoggedIn && (
            <div className="relative ml-2">
              <button className="relative" onClick={() => setShowNotify(v => !v)}>
                <svg className="w-7 h-7 text-gray-500 hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{unreadCount}</span>
                )}
              </button>
              {showNotify && (
                <div ref={notifyRef} className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-lg z-50 border border-gray-200">
                  <div className="flex justify-between items-center px-4 py-2 border-b">
                    <span className="font-bold text-gray-700">通知</span>
                    <button className="text-xs text-blue-500 hover:underline" onClick={markAllRead}>全部标为已读</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-gray-400 text-center">暂无通知</div>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 text-sm ${n.is_read ? 'bg-white' : 'bg-blue-50 font-semibold'}`}>
                        <div className="mb-1 text-gray-800">{n.content}</div>
                        <div className="text-xs text-gray-400 flex justify-between">
                          <span>{n.type}</span>
                          <span>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      <div className="flex justify-center mb-4">
        {isAdmin && (
          <button
            onClick={() => setShowUpload(true)}
            className="px-6 py-3 bg-blue-500 text-white rounded-full shadow-lg text-lg font-semibold hover:bg-blue-600 transition w-full max-w-xs sm:w-auto"
          >
            上传照片
          </button>
        )}
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4">
        <label htmlFor="sort-select" className="text-base text-gray-700">排序方式：</label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'created_at' | 'taken_at')}
          className="border rounded px-2 py-1 text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="created_at">按上传时间</option>
          <option value="taken_at">按拍摄时间</option>
        </select>
        <nav className="mt-2 sm:mt-0">
          <ul className="flex flex-wrap space-x-4 text-base">
            <li>
              <span className="font-semibold">照片</span>
            </li>
            {isLoggedIn && (
              <li>
                <Link href="/albums" className="text-blue-500 hover:underline">
                  相册
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
      <div className="w-full max-w-5xl mx-auto px-2">
        <PhotoFilterPanel value={filters} onChange={setFilters} allTags={allTags} />
      </div>
      {errorMsg && (
        <div className="mb-4 text-red-600 bg-red-50 border border-red-200 rounded p-2 text-base max-w-md mx-auto">
          {errorMsg}
        </div>
      )}
      <main className="flex-1 flex flex-col items-center justify-center px-2 w-full max-w-5xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-lg">加载中...</div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center mt-10">
            <Image src="/empty.svg" width={192} height={192} alt="empty" className="mb-4" />
            <p className="text-lg text-gray-400">暂无照片，快来上传你的第一张照片吧！</p>
          </div>
        ) : (
          <PhotoGrid photos={sortedPhotos} showAddToAlbum={isAdmin} />
        )}
      </main>
      {showLogin && !isLoggedIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded-md sm:rounded-lg p-4 sm:p-6 w-full max-w-full sm:max-w-md mx-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold">管理员登录</h2>
              <button onClick={closeLoginModal} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 rounded-full transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300" aria-label="关闭">
                <span className="text-2xl leading-none">×</span>
              </button>
            </div>
            <LoginForm />
          </div>
        </div>
      )}
      {isAdmin && (
        <UploadModal 
          show={showUpload}
          onClose={() => setShowUpload(false)}
          onUpload={handleUpload}
        />
      )}
      <footer className="w-full text-center text-gray-400 text-sm py-4 mt-8 border-t border-gray-100 bg-white/60">
        © 2024 PhotoLive. 版权所有
        <span className="mx-2">|</span>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener" className="hover:underline">
          京ICP备12345678号
        </a>
        {/* 如有公安备案号可加下面一行 */}
        {/* <span className="mx-2">|</span>
        <a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=11010502000001" target="_blank" rel="noopener" className="hover:underline">
          <img src="/beian.png" style={{display:'inline',verticalAlign:'middle',height:'16px',marginRight:'2px'}} alt="公安备案" />
          京公网安备 11010502000001号
        </a> */}
      </footer>
    </div>
  )
}
