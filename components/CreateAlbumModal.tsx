import { useState } from 'react'
import type { ReactElement } from 'react'
import { supabase } from '@/lib/supabase'

interface CreateAlbumModalProps {
  show: boolean
  onClose: () => void
  onCreated: (albumId: string) => void
}

// 创建相册的模态窗口组件
const CreateAlbumModal: React.FC<CreateAlbumModalProps> = ({ show, onClose, onCreated }): ReactElement | null => {
  const [name, setName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [isCreating, setIsCreating] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim()) {
      setError('请输入相册名称')
      return
    }
    setIsCreating(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('未登录')
      const { data, error: dbError } = await supabase
        .from('albums')
        .insert([
          {
            user_id: session.user.id,
            name: name.trim(),
            description: description.trim() || null
          }
        ])
        .select('id')
        .single()
      if (dbError) throw dbError
      setName('')
      setDescription('')
      onCreated(data.id)
    } catch (err: any) {
      setError(err instanceof Error ? err.message : '创建相册失败')
    } finally {
      setIsCreating(false)
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">创建新相册</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">相册名称 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="相册名称"
              required
              maxLength={50}
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded"
              rows={3}
              placeholder="相册描述（可选）"
              maxLength={200}
            />
          </div>
          {error && <div className="text-red-500 mb-4">{error}</div>}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
              disabled={isCreating}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded"
              disabled={isCreating}
            >
              {isCreating ? '创建中...' : '创建相册'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateAlbumModal
