import { useState, useEffect, useRef } from 'react'
import type { ReactElement } from 'react'
import Image from 'next/image'
import { LOCAL_STORAGE_URL, fetchWithRetry } from '@/lib/localStorage'
import AddToAlbumModal from './AddToAlbumModal'
import PhotoActions from './PhotoActions'
import { supabase } from '@/lib/supabase'

interface Photo {
  id: string
  user_id: string
  title: string
  description: string
  image_path: string
  created_at: string
  is_public: boolean
}

interface PhotoGridProps {
  photos: Photo[]
  showAddToAlbum?: boolean
  albumId?: string
  onPhotoDeleted?: () => void
  onPhotoRemovedFromAlbum?: (photoId: string) => void
  layout?: 'grid' | 'masonry'
  selectable?: boolean
  selected?: string[]
  onSelect?: (ids: string[]) => void
  renderActions?: (photo: Photo) => React.ReactNode
}

export default function PhotoGrid({ 
  photos, 
  showAddToAlbum = false, 
  albumId,
  onPhotoDeleted,
  onPhotoRemovedFromAlbum,
  layout = 'grid',
  selectable = false,
  selected = [],
  onSelect,
  renderActions,
}: PhotoGridProps): ReactElement | null {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [showAddToAlbumModal, setShowAddToAlbumModal] = useState<boolean>(false)
  const [selectedPhotoForDetail, setSelectedPhotoForDetail] = useState<Photo | null>(null)
  const [imageLoadError, setImageLoadError] = useState<Record<string, boolean>>({})
  const [imageRetries, setImageRetries] = useState<Record<string, number>>({})
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const handleAddToAlbum = (photoId: string): void => {
    setSelectedPhotoId(photoId)
    setShowAddToAlbumModal(true)
  }

  const handlePhotoClick = (photo: Photo): void => {
    setSelectedPhotoForDetail(photo)
  }

  const handlePhotoRemovedFromAlbum = (photoId: string): void => {
    if (onPhotoRemovedFromAlbum) {
      onPhotoRemovedFromAlbum(photoId)
    }
  }

  const handleImageError = (photoId: string): void => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const currentRetries = imageRetries[photoId] || 0;
    if (currentRetries < 2) {
      setImageRetries(prev => ({
        ...prev,
        [photoId]: currentRetries + 1
      }));
      const timestamp = new Date().getTime();
      const imgElement = document.getElementById(`img-${photoId}`) as HTMLImageElement;
      if (imgElement) {
        const currentSrc = imgElement.src.split('?')[0];
        imgElement.src = `${currentSrc}?t=${timestamp}`;
      }
      console.warn(`图片 ${photoId} 加载失败，重试中... (${currentRetries + 1}/2)`);
    } else {
      setImageLoadError(prev => ({
        ...prev,
        [photoId]: true
      }));
      console.error(`图片 ${photoId} 加载失败，已达到最大重试次数`);
    }
  }

  const handleCheckboxChange = (photoId: string, checked: boolean) => {
    if (!onSelect) return
    if (checked) {
      onSelect([...selected, photoId])
    } else {
      onSelect(selected.filter(id => id !== photoId))
    }
  }

  const openEdit = () => {
    if (!selectedPhotoForDetail) return
    setEditTitle(selectedPhotoForDetail.title || '')
    setEditDesc(selectedPhotoForDetail.description || '')
    setEditMode(true)
  }
  const closeEdit = () => {
    setEditMode(false)
    setEditError(null)
  }
  const handleEditSave = async () => {
    if (!selectedPhotoForDetail) return
    setEditLoading(true)
    setEditError(null)
    const { error } = await supabase.from('photos').update({ title: editTitle, description: editDesc }).eq('id', selectedPhotoForDetail.id)
    setEditLoading(false)
    if (error) {
      setEditError(error.message)
      return
    }
    setSelectedPhotoForDetail({ ...selectedPhotoForDetail, title: editTitle, description: editDesc })
    closeEdit()
    if (onPhotoDeleted) onPhotoDeleted()
  }

  // 清理图片加载错误状态，以便在网络恢复后可以重新加载
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkNetworkAndReset = () => {
      if (navigator.onLine && Object.keys(imageLoadError).length > 0) {
        console.log('网络已恢复，重置图片加载错误状态');
        setImageLoadError({});
        setImageRetries({});
      }
    };
    window.addEventListener('online', checkNetworkAndReset);
    intervalRef.current = setInterval(checkNetworkAndReset, 30000);
    return () => {
      window.removeEventListener('online', checkNetworkAndReset);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [imageLoadError]);

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">暂无照片，请管理员上传第一张照片</p>
      </div>
    )
  }

  if (layout === 'masonry') {
    // 流瀑式布局，使用 CSS columns 实现
    return (
      <>
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {photos.map((photo) => (
            <div key={photo.id} className="mb-4 break-inside-avoid rounded-lg overflow-hidden shadow group cursor-pointer bg-white">
              <div className="w-full relative">
                {selectable && (
                  <input
                    type="checkbox"
                    className="absolute left-2 top-2 z-10 w-5 h-5 accent-blue-500"
                    checked={selected.includes(photo.id)}
                    onChange={e => handleCheckboxChange(photo.id, e.target.checked)}
                    onClick={e => e.stopPropagation()}
                  />
                )}
                <Image
                  id={`img-${photo.id}`}
                  src={`${LOCAL_STORAGE_URL}/photos/${photo.image_path}`}
                  alt={photo.title || '未命名照片'}
                  width={600}
                  height={400}
                  className="object-cover w-full h-auto max-h-[400px] min-h-[120px]"
                  onClick={() => handlePhotoClick(photo)}
                  onError={() => handleImageError(photo.id)}
                />
              </div>
              <div className="p-2 relative">
                <h3 className="text-gray-900 font-semibold text-base truncate">{photo.title || '未命名'}</h3>
                {photo.description && (
                  <p className="text-gray-600 text-xs mt-1 truncate">{photo.description}</p>
                )}
                {showAddToAlbum && !albumId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddToAlbum(photo.id)
                    }}
                    className="mt-2 bg-blue-500 text-white rounded-full px-3 py-1 text-xs hover:bg-blue-600 transition"
                  >
                    添加到相册
                  </button>
                )}
                {renderActions && (
                  <div className="absolute right-2 bottom-2">{renderActions(photo)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* 详情模态和添加到相册模态复用原有逻辑 */}
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
                  {imageLoadError[selectedPhotoForDetail.id] ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <div className="text-center p-4">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-20 w-20 mx-auto text-gray-400" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" 
                          />
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                          />
                        </svg>
                        <p className="mt-4 text-lg text-gray-500">无法加载图片</p>
                        <p className="text-sm text-gray-400 mb-3">图片可能已被删除或网络连接问题</p>
                        <button 
                          onClick={() => {
                            setImageLoadError(prev => {
                              const newState = {...prev};
                              delete newState[selectedPhotoForDetail.id];
                              return newState;
                            });
                            setImageRetries(prev => {
                              const newState = {...prev};
                              delete newState[selectedPhotoForDetail.id];
                              return newState;
                            });
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          重新加载
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Image
                      id={`detail-img-${selectedPhotoForDetail.id}`}
                      src={`${LOCAL_STORAGE_URL}/photos/${selectedPhotoForDetail.image_path}`}
                      alt={selectedPhotoForDetail.title || '未命名照片'}
                      fill
                      className="object-contain"
                      sizes="80vw"
                      onError={() => handleImageError(selectedPhotoForDetail.id)}
                    />
                  )}
                </div>
                
                {selectedPhotoForDetail.description && (
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <p>{selectedPhotoForDetail.description}</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t flex gap-2 items-center">
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
                <button
                  className="ml-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition"
                  onClick={openEdit}
                >
                  编辑
                </button>
              </div>
            </div>
          </div>
        )}

        {editMode && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-xs relative">
              <button className="absolute right-2 top-2 text-gray-400 hover:text-gray-600" onClick={closeEdit}>×</button>
              <h2 className="text-lg font-bold mb-4">编辑照片信息</h2>
              <div className="mb-3">
                <label className="block text-gray-700 mb-1">标题</label>
                <input className="w-full border rounded p-2" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="block text-gray-700 mb-1">描述</label>
                <textarea className="w-full border rounded p-2" rows={3} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
              </div>
              {editError && <div className="text-red-500 text-sm mb-2">{editError}</div>}
              <button className="w-full bg-blue-500 text-white py-2 rounded mt-2" onClick={handleEditSave} disabled={editLoading}>{editLoading ? '保存中...' : '保存'}</button>
            </div>
          </div>
        )}

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

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group overflow-hidden rounded-lg">
            {selectable && (
              <input
                type="checkbox"
                className="absolute left-2 top-2 z-10 w-5 h-5 accent-blue-500"
                checked={selected.includes(photo.id)}
                onChange={e => handleCheckboxChange(photo.id, e.target.checked)}
                onClick={e => e.stopPropagation()}
              />
            )}
            <div className="w-full h-64 relative">
              {imageLoadError[photo.id] ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <div className="text-center p-4">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-10 w-10 mx-auto text-gray-400" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" 
                      />
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                      />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">无法加载图片</p>
                    <button 
                      onClick={() => {
                        setImageLoadError(prev => {
                          const newState = {...prev};
                          delete newState[photo.id];
                          return newState;
                        });
                        setImageRetries(prev => {
                          const newState = {...prev};
                          delete newState[photo.id];
                          return newState;
                        });
                      }}
                      className="mt-2 text-xs text-blue-500 hover:underline"
                    >
                      点击重试
                    </button>
                  </div>
                </div>
              ) : (
                <Image
                  id={`img-${photo.id}`}
                  src={`${LOCAL_STORAGE_URL}/photos/${photo.image_path}`}
                  alt={photo.title || '未命名照片'}
                  fill
                  className="object-cover cursor-pointer"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  onClick={() => handlePhotoClick(photo)}
                  onError={() => handleImageError(photo.id)}
                />
              )}
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
              {renderActions && (
                <div className="absolute right-4 bottom-4 z-20">{renderActions(photo)}</div>
              )}
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
                {imageLoadError[selectedPhotoForDetail.id] ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center p-4">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-20 w-20 mx-auto text-gray-400" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" 
                        />
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                        />
                      </svg>
                      <p className="mt-4 text-lg text-gray-500">无法加载图片</p>
                      <p className="text-sm text-gray-400 mb-3">图片可能已被删除或网络连接问题</p>
                      <button 
                        onClick={() => {
                          setImageLoadError(prev => {
                            const newState = {...prev};
                            delete newState[selectedPhotoForDetail.id];
                            return newState;
                          });
                          setImageRetries(prev => {
                            const newState = {...prev};
                            delete newState[selectedPhotoForDetail.id];
                            return newState;
                          });
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      >
                        重新加载
                      </button>
                    </div>
                  </div>
                ) : (
                  <Image
                    id={`detail-img-${selectedPhotoForDetail.id}`}
                    src={`${LOCAL_STORAGE_URL}/photos/${selectedPhotoForDetail.image_path}`}
                    alt={selectedPhotoForDetail.title || '未命名照片'}
                    fill
                    className="object-contain"
                    sizes="80vw"
                    onError={() => handleImageError(selectedPhotoForDetail.id)}
                  />
                )}
              </div>
              
              {selectedPhotoForDetail.description && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <p>{selectedPhotoForDetail.description}</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t flex gap-2 items-center">
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
              <button
                className="ml-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition"
                onClick={openEdit}
              >
                编辑
              </button>
            </div>
          </div>
        </div>
      )}

      {editMode && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-xs relative">
            <button className="absolute right-2 top-2 text-gray-400 hover:text-gray-600" onClick={closeEdit}>×</button>
            <h2 className="text-lg font-bold mb-4">编辑照片信息</h2>
            <div className="mb-3">
              <label className="block text-gray-700 mb-1">标题</label>
              <input className="w-full border rounded p-2" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="block text-gray-700 mb-1">描述</label>
              <textarea className="w-full border rounded p-2" rows={3} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
            </div>
            {editError && <div className="text-red-500 text-sm mb-2">{editError}</div>}
            <button className="w-full bg-blue-500 text-white py-2 rounded mt-2" onClick={handleEditSave} disabled={editLoading}>{editLoading ? '保存中...' : '保存'}</button>
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