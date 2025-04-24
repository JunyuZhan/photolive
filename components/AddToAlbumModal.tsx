import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Album {
  id: string
  name: string
}

interface AddToAlbumModalProps {
  show: boolean
  onClose: () => void
  photoId: string
}

export default function AddToAlbumModal({ show, onClose, photoId }: AddToAlbumModalProps) {
  const [albums, setAlbums] = useState<Album[]>([])
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (show) {
      fetchAlbums()
      setSuccess(false)
      setError(null)
    }
  }, [show])

  const fetchAlbums = async () => {
    setLoading(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('未登录')

      // 获取用户的所有相册
      const { data, error } = await supabase
        .from('albums')
        .select('id, name')
        .eq('user_id', session.user.id)
        .order('name')

      if (error) throw error

      setAlbums(data || [])
      // 如果有相册，默认选中第一个
      if (data && data.length > 0) {
        setSelectedAlbumId(data[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取相册失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAlbumId) {
      setError('请选择相册')
      return
    }

    setAdding(true)
    setError(null)
    setSuccess(false)

    try {
      // 检查照片是否已经在相册中
      const { count, error: countError } = await supabase
        .from('album_photos')
        .select('*', { count: 'exact', head: true })
        .eq('album_id', selectedAlbumId)
        .eq('photo_id', photoId)

      if (countError) throw countError

      // 如果照片已经在相册中，不进行重复添加
      if (count && count > 0) {
        setSuccess(true)
        return
      }

      // 添加照片到相册
      const { error: insertError } = await supabase
        .from('album_photos')
        .insert([
          {
            album_id: selectedAlbumId,
            photo_id: photoId
          }
        ])

      if (insertError) throw insertError

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加到相册失败')
    } finally {
      setAdding(false)
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">添加到相册</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : albums.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">您还没有创建任何相册</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              关闭
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">选择相册</label>
              <select
                value={selectedAlbumId}
                onChange={(e) => setSelectedAlbumId(e.target.value)}
                className="w-full p-2 border rounded"
                disabled={adding}
                required
              >
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.name}
                  </option>
                ))}
              </select>
            </div>

            {error && <div className="text-red-500 mb-4">{error}</div>}
            {success && <div className="text-green-500 mb-4">已成功添加到相册</div>}

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded"
                disabled={adding}
              >
                {success ? '完成' : '取消'}
              </button>
              {!success && (
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                  disabled={adding}
                >
                  {adding ? '添加中...' : '添加'}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
} 