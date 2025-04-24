import { useState } from 'react'
import type { ReactElement } from 'react'

interface UploadModalProps {
  show: boolean
  onClose: () => void
  onUpload: (file: File, title: string, description: string) => Promise<void>
}

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
                disabled={isUploading}
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