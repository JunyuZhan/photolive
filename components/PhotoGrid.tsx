import { useState } from 'react'
import Image from 'next/image'
import { LOCAL_STORAGE_URL } from '@/lib/localStorage'
import AddToAlbumModal from './AddToAlbumModal'
import PhotoActions from './PhotoActions'

interface Photo {
  id: string
  title: string
  description?: string
  image_path: string
}

interface PhotoGridProps {
  photos: Photo[]
  showAddToAlbum?: boolean
  albumId?: string
  onPhotoDeleted?: () => void
  onPhotoRemovedFromAlbum?: (photoId: string) => void
}

export default function PhotoGrid({ 
  photos, 
  showAddToAlbum = false, 
  albumId,
  onPhotoDeleted,
  onPhotoRemovedFromAlbum
}: PhotoGridProps) {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [showAddToAlbumModal, setShowAddToAlbumModal] = useState(false)
  const [selectedPhotoForDetail, setSelectedPhotoForDetail] = useState<Photo | null>(null)

  const handleAddToAlbum = (photoId: string) => {
    setSelectedPhotoId(photoId)
    setShowAddToAlbumModal(true)
  }

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhotoForDetail(photo)
  }

  const handlePhotoRemovedFromAlbum = (photoId: string) => {
    if (onPhotoRemovedFromAlbum) {
      onPhotoRemovedFromAlbum(photoId)
    }
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">暂无照片，请管理员上传第一张照片</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group overflow-hidden rounded-lg">
            <div className="w-full h-64 relative">
              <Image
                src={`${LOCAL_STORAGE_URL}/photos/${photo.image_path}`}
                alt={photo.title || '未命名照片'}
                fill
                className="object-cover cursor-pointer"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                onClick={() => handlePhotoClick(photo)}
              />
            </div>
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex flex-col justify-between p-4">
              <div className="self-end">
                {showAddToAlbum && !albumId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddToAlbum(photo.id)
                    }}
                    className="bg-white text-blue-500 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    title="添加到相册"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
                      />
                    </svg>
                  </button>
                )}
              </div>
              <div className="transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                <h3 className="text-white font-semibold">{photo.title || '未命名'}</h3>
                {photo.description && (
                  <p className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {photo.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 照片详情模态窗口 */}
      {selectedPhotoForDetail && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPhotoForDetail(null)}
        >
          <div 
            className="bg-white rounded-lg overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-semibold">{selectedPhotoForDetail.title || '未命名照片'}</h3>
              <button 
                onClick={() => setSelectedPhotoForDetail(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="overflow-auto flex-grow p-4">
              <div className="relative h-[60vh] w-full">
                <Image
                  src={`${LOCAL_STORAGE_URL}/photos/${selectedPhotoForDetail.image_path}`}
                  alt={selectedPhotoForDetail.title || '未命名照片'}
                  fill
                  className="object-contain"
                  sizes="80vw"
                />
              </div>
              
              {selectedPhotoForDetail.description && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <p>{selectedPhotoForDetail.description}</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t">
              <PhotoActions
                photoId={selectedPhotoForDetail.id}
                albumId={albumId}
                imagePath={selectedPhotoForDetail.image_path}
                onDeleted={() => {
                  setSelectedPhotoForDetail(null)
                  if (onPhotoDeleted) onPhotoDeleted()
                }}
                onRemovedFromAlbum={() => {
                  setSelectedPhotoForDetail(null)
                  handlePhotoRemovedFromAlbum(selectedPhotoForDetail.id)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 添加到相册模态窗口 */}
      {selectedPhotoId && (
        <AddToAlbumModal
          show={showAddToAlbumModal}
          onClose={() => setShowAddToAlbumModal(false)}
          photoId={selectedPhotoId}
        />
      )}
    </>
  )
} 