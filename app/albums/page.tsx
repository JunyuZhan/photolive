'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AlbumCard from '@/components/AlbumCard'
import CreateAlbumModal from '@/components/CreateAlbumModal'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import Header from "@/components/Header"
import Layout from '@/components/Layout'

interface Album {
  id: string
  name: string
  description: string
  cover_photo: string | null | undefined
  photo_count: number
  sort_order?: number
}

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    const fetchUserAndAlbums = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setUser(session?.user ?? null)
          if (session?.user) {
            fetchAlbums(session.user.id)
          }
        }
      )
      unsubscribe = () => authListener?.subscription.unsubscribe()
      if (session?.user) {
        await fetchAlbums(session.user.id)
      }
      setLoading(false)
    }
    fetchUserAndAlbums()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const fetchAlbums = async (userId: string): Promise<void> => {
    try {
      // 嵌套select，获取相册下所有照片的image_path和created_at
      const { data, error } = await supabase
        .from('albums')
        .select(`
          id,
          name,
          description,
          album_photos(
            photo_id,
            photos(image_path, created_at)
          )
        `)
        .eq('user_id', userId)
        .order('name')
      if (error) {
        setErrorMsg('获取相册失败: ' + error.message)
        throw error
      }
      // 处理cover_photo和photo_count
      const formattedAlbums = (data || []).map((album: any) => {
        // 取最新的照片做封面
        let cover_photo = null
        if (album.album_photos && album.album_photos.length > 0) {
          // 按created_at倒序
          const sorted = album.album_photos
            .map((ap: any) => ap.photos)
            .filter((p: any) => p && p.image_path)
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          cover_photo = sorted.length > 0 ? sorted[0].image_path : null
        }
        return {
          id: album.id,
          name: album.name,
          description: album.description,
          cover_photo,
          photo_count: album.album_photos ? album.album_photos.length : 0
        }
      })
      setAlbums(formattedAlbums)
      setErrorMsg(null)
    } catch (error: any) {
      setErrorMsg('获取相册失败: ' + error.message)
      console.error('获取相册失败:', error)
    }
  }

  const handleAlbumCreated = async (albumId: string): Promise<void> => {
    setShowCreateModal(false)
    if (user) {
      await fetchAlbums(user.id)
    }
  }

  // 拖拽排序处理
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const newAlbums = Array.from(albums)
    const [removed] = newAlbums.splice(result.source.index, 1)
    newAlbums.splice(result.destination.index, 0, removed)
    setAlbums(newAlbums)
    // 更新后端顺序
    const sortOrders = newAlbums.map((album, idx) => ({ id: album.id, sort_order: idx }))
    await fetch('/api/albums/sort', {
      method: 'POST',
      body: JSON.stringify({ sortOrders }),
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 删除相册
  const handleDeleteAlbum = async (albumId: string) => {
    if (!window.confirm('确定要删除该相册吗？此操作不可撤销。')) return
    setDeletingId(albumId)
    try {
      const { error } = await supabase.from('albums').delete().eq('id', albumId)
      if (error) throw error
      setAlbums(albums.filter(a => a.id !== albumId))
    } catch (err: any) {
      setErrorMsg('删除相册失败: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen bg-white"> <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div> </div>
  }
  if (!user) {
    return <div className="flex flex-col items-center py-12 text-gray-500">请先登录</div>
  }

  return (
    <Layout user={user} onLogout={async () => { await supabase.auth.signOut(); window.location.reload(); }}>
      <div>
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
            <h1 className="text-2xl sm:text-3xl font-bold">我的相册</h1>
            {user ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-md sm:rounded transition text-base active:scale-95 w-full sm:w-auto"
              >
                创建相册
              </button>
            ) : (
              <Link href="/" className="text-blue-500 hover:underline text-base">
                返回首页
              </Link>
            )}
          </div>
          <nav className="mt-4">
            <ul className="flex flex-wrap space-x-4 text-base">
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
        {errorMsg && (
          <div className="mb-4 text-red-600 bg-red-50 border border-red-200 rounded p-2 text-base">
            {errorMsg}
          </div>
        )}
        {!user ? (
          <div className="text-center py-12 bg-gray-50 rounded-md sm:rounded-lg">
            <p className="text-gray-600 mb-4">请登录后查看和管理您的相册</p>
            <Link
              href="/"
              className="inline-block bg-blue-500 text-white px-4 py-2 rounded-md sm:rounded transition text-base active:scale-95"
            >
              去登录
            </Link>
          </div>
        ) : albums.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-md sm:rounded-lg">
            <p className="text-gray-600 mb-4">您还没有创建任何相册</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-md sm:rounded transition text-base active:scale-95"
            >
              创建第一个相册
            </button>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="albums-droppable" direction="horizontal">
              {(provided) => (
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {albums.map((album, index) => (
                    <Draggable key={album.id} draggableId={album.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`relative ${snapshot.isDragging ? 'z-50' : ''}`}
                        >
                          <div {...provided.dragHandleProps} className="absolute left-2 top-2 cursor-grab z-10">
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="6" cy="6" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="6" cy="18" r="1.5"/><circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/><circle cx="18" cy="6" r="1.5"/><circle cx="18" cy="12" r="1.5"/><circle cx="18" cy="18" r="1.5"/></svg>
                          </div>
                          <AlbumCard album={album} onDelete={handleDeleteAlbum} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
        <CreateAlbumModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleAlbumCreated}
        />
      </div>
    </Layout>
  )
} 