import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LOCAL_STORAGE_URL } from '@/lib/localStorage'

interface PhotoActionsProps {
  photoId: string
  albumId?: string
  imagePath: string
  onDeleted?: () => void
  onRemovedFromAlbum?: () => void
}

export default function PhotoActions({ 
  photoId, 
  albumId, 
  imagePath, 
  onDeleted, 
  onRemovedFromAlbum 
}: PhotoActionsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deletePhoto = async () => {
    if (!confirm('确定要删除这张照片吗？此操作不可撤销。')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. 从数据库中删除照片
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId)

      if (dbError) throw dbError

      // 2. 删除文件服务器上的文件
      const [userId, fileName] = imagePath.split('/')
      const response = await fetch(`${LOCAL_STORAGE_URL}/photos/${userId}/${fileName}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        console.warn('文件删除失败，但数据库记录已删除:', await response.text())
      }

      // 通知父组件照片已删除
      if (onDeleted) onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除照片失败')
      console.error('删除照片错误:', err)
    } finally {
      setLoading(false)
    }
  }

  const removeFromAlbum = async () => {
    if (!albumId) return
    
    if (!confirm('确定要从此相册中移除这张照片吗？')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 从相册中移除照片
      const { error: dbError } = await supabase
        .from('album_photos')
        .delete()
        .eq('album_id', albumId)
        .eq('photo_id', photoId)

      if (dbError) throw dbError

      // 通知父组件照片已从相册移除
      if (onRemovedFromAlbum) onRemovedFromAlbum()
    } catch (err) {
      setError(err instanceof Error ? err.message : '从相册移除照片失败')
      console.error('从相册移除照片错误:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex space-x-2">
      {albumId && (
        <button
          onClick={removeFromAlbum}
          disabled={loading}
          className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"
          title="从相册移除"
        >
          {loading ? '处理中...' : '从相册移除'}
        </button>
      )}
      <button
        onClick={deletePhoto}
        disabled={loading}
        className="bg-red-500 text-white px-3 py-1 rounded text-sm"
        title="永久删除"
      >
        {loading ? '删除中...' : '删除照片'}
      </button>
      {error && <div className="text-red-500 text-sm">{error}</div>}
    </div>
  )
} 