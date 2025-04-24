'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PhotoGrid from '@/components/PhotoGrid'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Photo {
  id: string
  title: string
  description: string
  image_path: string
  created_at: string
  is_public: boolean
}

interface Album {
  id: string
  name: string
  description: string | null
  user_id: string
}

export default function AlbumPage() {
  const params = useParams()
  const albumId = params.id as string
  
  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取当前用户会话
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)

        // 获取相册详情
        const { data: albumData, error: albumError } = await supabase
          .from('albums')
          .select('*')
          .eq('id', albumId)
          .single()

        if (albumError) throw new Error('未找到相册')
        setAlbum(albumData)

        // 判断用户是否有权限查看此相册
        if (session?.user?.id !== albumData.user_id) {
          throw new Error('您没有权限查看这个相册')
        }

        await fetchAlbumPhotos()

      } catch (err) {
        console.error('获取相册数据失败:', err)
        setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [albumId])

  const fetchAlbumPhotos = async () => {
    try {
      // 先获取相册中的照片ID
      const { data: albumPhotos, error: albumPhotosError } = await supabase
        .from('album_photos')
        .select('photo_id')
        .eq('album_id', albumId)

      if (albumPhotosError) throw albumPhotosError
      
      // 如果相册中有照片，获取照片详情
      if (albumPhotos && albumPhotos.length > 0) {
        const photoIds = albumPhotos.map(item => item.photo_id)
        
        const { data: photoData, error: photosError } = await supabase
          .from('photos')
          .select('*')
          .in('id', photoIds)
          .order('created_at', { ascending: false })

        if (photosError) throw photosError
        setPhotos(photoData || [])
      } else {
        setPhotos([])
      }
    } catch (err) {
      console.error('获取相册照片失败:', err)
    }
  }

  const handlePhotoRemovedFromAlbum = async (photoId: string) => {
    // 从当前照片列表中移除被删除的照片
    setPhotos(prevPhotos => prevPhotos.filter(photo => photo.id !== photoId))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error || !album) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 p-6 rounded-lg text-center">
          <h2 className="text-xl font-bold text-red-800 mb-2">出错了</h2>
          <p className="text-red-600 mb-4">{error || '未找到相册'}</p>
          <Link
            href="/albums"
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded"
          >
            返回相册列表
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{album.name}</h1>
          <Link
            href="/albums"
            className="text-blue-500 hover:underline"
          >
            返回相册列表
          </Link>
        </div>
        {album.description && (
          <p className="text-gray-600 mt-2">{album.description}</p>
        )}
        <div className="mt-2 text-sm text-gray-500">
          {photos.length} 张照片
        </div>
        <nav className="mt-4">
          <ul className="flex space-x-4">
            <li>
              <Link href="/" className="text-blue-500 hover:underline">
                照片
              </Link>
            </li>
            <li>
              <Link href="/albums" className="text-blue-500 hover:underline">
                相册
              </Link>
            </li>
            <li>
              <span className="font-semibold">{album.name}</span>
            </li>
          </ul>
        </nav>
      </header>

      {photos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">此相册中还没有照片</p>
          <Link
            href="/"
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded"
          >
            去添加照片
          </Link>
        </div>
      ) : (
        <PhotoGrid 
          photos={photos} 
          albumId={albumId}
          onPhotoDeleted={fetchAlbumPhotos}
          onPhotoRemovedFromAlbum={handlePhotoRemovedFromAlbum}
        />
      )}
    </div>
  )
} 