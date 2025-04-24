'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AlbumCard from '@/components/AlbumCard'
import CreateAlbumModal from '@/components/CreateAlbumModal'
import Link from 'next/link'

interface Album {
  id: string
  name: string
  description: string
  cover_photo: string | null | undefined
  photo_count: number
}

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    const fetchUserAndAlbums = async () => {
      // 获取当前用户会话
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)

      // 监听登录状态变化
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setUser(session?.user ?? null)
          if (session?.user) {
            fetchAlbums(session.user.id)
          }
        }
      )

      // 如果已登录，获取相册列表
      if (session?.user) {
        await fetchAlbums(session.user.id)
      }
      
      setLoading(false)

      return () => {
        authListener?.subscription.unsubscribe()
      }
    }

    fetchUserAndAlbums()
  }, [])

  const fetchAlbums = async (userId: string) => {
    try {
      // 获取相册列表及照片计数
      const { data, error } = await supabase
        .from('albums')
        .select(`
          id,
          name,
          description,
          (
            SELECT image_path
            FROM photos
            JOIN album_photos ON photos.id = album_photos.photo_id
            WHERE album_photos.album_id = albums.id
            ORDER BY photos.created_at DESC
            LIMIT 1
          ) AS cover_photo,
          (
            SELECT count(*)
            FROM album_photos
            WHERE album_photos.album_id = albums.id
          ) AS photo_count
        `)
        .eq('user_id', userId)
        .order('name')

      if (error) throw error

      // 将数据转换为前端需要的格式
      const formattedAlbums = data.map((album: any) => ({
        id: album.id,
        name: album.name,
        description: album.description,
        cover_photo: album.cover_photo?.[0]?.image_path || null,
        photo_count: parseInt(album.photo_count, 10) || 0
      }))

      setAlbums(formattedAlbums)
    } catch (error) {
      console.error('获取相册失败:', error)
    }
  }

  const handleAlbumCreated = async (albumId: string) => {
    setShowCreateModal(false)
    if (user) {
      await fetchAlbums(user.id)
    }
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
          <h1 className="text-3xl font-bold">我的相册</h1>
          {user ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              创建相册
            </button>
          ) : (
            <Link href="/" className="text-blue-500 hover:underline">
              返回首页
            </Link>
          )}
        </div>
        <nav className="mt-4">
          <ul className="flex space-x-4">
            <li>
              <Link href="/" className="text-blue-500 hover:underline">
                照片
              </Link>
            </li>
            <li>
              <span className="font-semibold">相册</span>
            </li>
          </ul>
        </nav>
      </header>

      {!user ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">请登录后查看和管理您的相册</p>
          <Link
            href="/"
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded"
          >
            去登录
          </Link>
        </div>
      ) : albums.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">您还没有创建任何相册</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            创建第一个相册
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      )}

      <CreateAlbumModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleAlbumCreated}
      />
    </div>
  )
} 