import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { supabase } from '@/lib/supabase'

interface UploadModalProps {
  show: boolean
  onClose: () => void
  onUpload: (file: File, title: string, description: string) => Promise<void>
}

const MAX_STORAGE = 1024 * 1024 * 1024 // 1GB

// 上传照片的模态窗口组件
const UploadModal: React.FC<UploadModalProps> = ({ show, onClose, onUpload }): ReactElement | null => {
  const [files, setFiles] = useState<File[]>([])
  const [title, setTitle] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [current, setCurrent] = useState<number>(0)
  const [failedFiles, setFailedFiles] = useState<File[]>([])
  const [usedStorage, setUsedStorage] = useState(0)
  const [loadingStorage, setLoadingStorage] = useState(false)

  useEffect(() => {
    if (show) {
      fetchUsedStorage()
    }
  }, [show])

  const fetchUsedStorage = async () => {
    setLoadingStorage(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return setUsedStorage(0)
      const { data, error } = await supabase
        .from('photos')
        .select('file_size')
        .eq('user_id', session.user.id)
      if (!error && data) {
        const used = data.reduce((sum, p) => sum + (p.file_size || 0), 0)
        setUsedStorage(used)
      } else {
        setUsedStorage(0)
      }
    } finally {
      setLoadingStorage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (files.length === 0) {
      setError('请选择要上传的文件')
      return
    }
    setIsUploading(true)
    setError(null)
    setSuccess(false)
    setCurrent(0)
    setFailedFiles([])
    let failed: File[] = []
    for (let i = 0; i < files.length; i++) {
      setCurrent(i + 1)
      try {
        await onUpload(files[i], title, description)
      } catch (err: any) {
        failed.push(files[i])
      }
    }
    setIsUploading(false)
    setCurrent(0)
    if (failed.length === 0) {
      setSuccess(true)
      setFiles([])
      setTitle('')
      setDescription('')
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1200)
    } else {
      setFailedFiles(failed)
      setError(`有${failed.length}张图片上传失败，请重试。`)
    }
  }

  const handleRetry = async () => {
    if (failedFiles.length === 0) return
    setIsUploading(true)
    setError(null)
    setSuccess(false)
    setCurrent(0)
    let failed: File[] = []
    for (let i = 0; i < failedFiles.length; i++) {
      setCurrent(i + 1)
      try {
        await onUpload(failedFiles[i], title, description)
      } catch (err: any) {
        failed.push(failedFiles[i])
      }
    }
    setIsUploading(false)
    setCurrent(0)
    if (failed.length === 0) {
      setSuccess(true)
      setFiles([])
      setTitle('')
      setDescription('')
      setFailedFiles([])
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1200)
    } else {
      setFailedFiles(failed)
      setError(`有${failed.length}张图片上传失败，请重试。`)
    }
  }

  if (!show) return null

  const percent = Math.round((usedStorage / MAX_STORAGE) * 100)
  const overLimit = usedStorage >= MAX_STORAGE

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
      <div className="bg-white rounded-md sm:rounded-lg p-4 sm:p-6 w-full max-w-full sm:max-w-md mx-2 shadow-lg select-none">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg sm:text-xl font-bold">上传照片</h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 rounded-full transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300"
            aria-label="关闭"
            disabled={isUploading}
          >
            <span className="text-2xl leading-none">×</span>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2 text-base">选择文件</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
              className="w-full p-2 border rounded text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
              required
              disabled={isUploading}
            />
            {files.length > 0 && (
              <div className="text-sm text-gray-500 mt-1">已选择 {files.length} 张图片</div>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2 text-base">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="照片标题"
              maxLength={50}
              disabled={isUploading}
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2 text-base">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
              rows={3}
              placeholder="照片描述"
              maxLength={200}
              disabled={isUploading}
            />
          </div>
          {isUploading && (
            <>
              <div className="mb-2 text-blue-500">正在上传第 {current} / {files.length || failedFiles.length} 张图片...</div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${Math.round(((current) / (files.length || failedFiles.length)) * 100)}%` }}
                ></div>
              </div>
            </>
          )}
          {success && (
            <div className="mb-4 text-green-600">全部上传成功！</div>
          )}
          {error && <div className="text-red-500 mb-4">{error}</div>}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>已用空间：{(usedStorage / 1024 / 1024).toFixed(1)} MB / 1024 MB</span>
              <span>{percent}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-300 ${overLimit ? 'bg-red-500' : 'bg-blue-400'}`} style={{ width: `${percent > 100 ? 100 : percent}%` }}></div>
            </div>
            {overLimit && <div className="text-xs text-red-500 mt-1">已超出存储空间限制，请删除部分照片后再上传</div>}
          </div>
          <div className="flex flex-col sm:flex-row justify-end sm:space-x-2 space-y-2 sm:space-y-0 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded bg-gray-50 hover:bg-gray-100 transition text-base"
              disabled={isUploading}
            >
              取消
            </button>
            {failedFiles.length > 0 ? (
              <button
                type="button"
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition text-base"
                onClick={handleRetry}
                disabled={isUploading}
              >
                重试失败图片
              </button>
            ) : (
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-base"
                disabled={isUploading || overLimit}
              >
                {isUploading ? '上传中...' : '上传'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default UploadModal 