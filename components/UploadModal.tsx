import { useState } from 'react'

interface UploadModalProps {
  show: boolean
  onClose: () => void
  onUpload: (file: File, title: string, description: string) => Promise<void>
}

export default function UploadModal({ show, onClose, onUpload }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('请选择要上传的文件')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      await onUpload(file, title, description)
      setFile(null)
      setTitle('')
      setDescription('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败')
    } finally {
      setIsUploading(false)
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">上传照片</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">选择文件</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files && setFile(e.target.files[0])}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="照片标题"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded"
              rows={3}
              placeholder="照片描述"
            />
          </div>

          {error && <div className="text-red-500 mb-4">{error}</div>}

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
              disabled={isUploading}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded"
              disabled={isUploading}
            >
              {isUploading ? '上传中...' : '上传'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 