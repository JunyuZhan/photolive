'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PhotoGrid from '@/components/PhotoGrid'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { useRef } from 'react'
import Header from "@/components/Header"
import Layout from '@/components/Layout'
import UploadModal from '@/components/UploadModal'

interface Photo {
  id: string
  title: string
  description: string
  image_path: string
  created_at: string
  is_public: boolean
  user_id: string
  taken_at?: string
}

interface Album {
  id: string
  name: string
  description: string | null
  user_id: string
  cover_photo_id?: string
}

interface ShareModalProps {
  show: boolean;
  onClose: () => void;
  albumId: string;
  user: User;
}

interface BatchDownloadModalProps {
  show: boolean;
  onClose: () => void;
  photoIds: string[];
  user: { id: string; email: string };
}

interface Collaborator {
  user_id: string;
  email: string;
  role: 'viewer' | 'editor';
}

interface CollaboratorModalProps {
  show: boolean;
  onClose: () => void;
  albumId: string;
}

interface LogEntry {
  id: string;
  user_email: string;
  action: string;
  detail: string;
  created_at: string;
}

interface AlbumStats {
  views: number;
  downloads: number;
}

interface LogModalProps {
  show: boolean;
  onClose: () => void;
  albumId: string;
}

function ShareModal({ show, onClose, albumId, user }: ShareModalProps) {
  const [accessCode, setAccessCode] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [permission, setPermission] = useState('view')
  const [shareUrl, setShareUrl] = useState('')
  const [qrSvg, setQrSvg] = useState('')
  const [loading, setLoading] = useState(false)
  const handleGenerateShare = async () => {
    setLoading(true)
    const res = await fetch('/api/share', {
      method: 'POST',
      body: JSON.stringify({
        user_id: user.id,
        album_id: albumId,
        access_code: accessCode,
        expires_at: expiresAt,
        permission
      }),
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await res.json()
    setShareUrl(data.url)
    const qrRes = await fetch(`/api/qrcode?url=${encodeURIComponent(data.url)}`)
    setQrSvg(await qrRes.text())
    setLoading(false)
  }
  if (!show) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button className="absolute right-2 top-2 text-gray-400 hover:text-gray-600" onClick={onClose}>×</button>
        <h2 className="text-xl font-bold mb-4">生成外链分享</h2>
        <div className="mb-3">
          <label className="block text-gray-700 mb-1">访问码（可选）</label>
          <input className="w-full border rounded p-2" value={accessCode} onChange={e => setAccessCode(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="block text-gray-700 mb-1">有效期（可选）</label>
          <input type="datetime-local" className="w-full border rounded p-2" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="block text-gray-700 mb-1">权限</label>
          <select className="w-full border rounded p-2" value={permission} onChange={e => setPermission(e.target.value)}>
            <option value="view">仅浏览</option>
            <option value="download">可下载</option>
            <option value="edit">可编辑</option>
          </select>
        </div>
        <button className="w-full bg-blue-500 text-white py-2 rounded mt-2" onClick={handleGenerateShare} disabled={loading}>{loading ? '生成中...' : '生成外链'}</button>
        {shareUrl && (
          <div className="mt-4">
            <div className="mb-2 text-sm text-gray-600">外链：</div>
            <input className="w-full border rounded p-2 mb-2" value={shareUrl} readOnly onFocus={e => e.target.select()} />
            <div className="mb-2 text-sm text-gray-600">二维码：</div>
            <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
          </div>
        )}
      </div>
    </div>
  )
}

function BatchDownloadModal({ show, onClose, photoIds, user }: BatchDownloadModalProps) {
  const [watermarkType, setWatermarkType] = useState('none')
  const [watermarkTemplate, setWatermarkTemplate] = useState('{username} {datetime}')
  const [loading, setLoading] = useState(false)
  const handleDownload = async () => {
    setLoading(true)
    const res = await fetch('http://156.225.24.235:13001/download-zip', {
      method: 'POST',
      body: JSON.stringify({
        photo_ids: photoIds,
        user_id: user.id,
        username: user.email,
        watermark_type: watermarkType,
        watermark_template: watermarkType !== 'none' ? watermarkTemplate : undefined
      }),
      headers: { 'Content-Type': 'application/json' }
    })
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'photos.zip'
    a.click()
    setLoading(false)
    onClose()
  }
  if (!show) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button className="absolute right-2 top-2 text-gray-400 hover:text-gray-600" onClick={onClose}>×</button>
        <h2 className="text-xl font-bold mb-4">批量下载照片</h2>
        <div className="mb-3">
          <label className="block text-gray-700 mb-1">水印类型</label>
          <select className="w-full border rounded p-2" value={watermarkType} onChange={e => setWatermarkType(e.target.value)}>
            <option value="none">无</option>
            <option value="dynamic_text">动态文字水印</option>
            <option value="dynamic_qrcode">动态二维码水印</option>
          </select>
        </div>
        {watermarkType !== 'none' && (
          <div className="mb-3">
            <label className="block text-gray-700 mb-1">水印模板</label>
            <input className="w-full border rounded p-2" value={watermarkTemplate} onChange={e => setWatermarkTemplate(e.target.value)} />
            <div className="text-xs text-gray-400 mt-1">可用变量: {'{username} {datetime} {ip} {photo_id}'}</div>
          </div>
        )}
        <button className="w-full bg-green-500 text-white py-2 rounded mt-2" onClick={handleDownload} disabled={loading}>{loading ? '下载中...' : '下载zip'}</button>
      </div>
    </div>
  )
}

function CollaboratorModal({ show, onClose, albumId }: CollaboratorModalProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('viewer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchCollaborators = async () => {
    const res = await fetch(`/api/albums/collaborators?album_id=${albumId}`)
    const data = await res.json()
    setCollaborators(data.collaborators || [])
  }
  useEffect(() => { if (show) fetchCollaborators() }, [show])

  const addCollaborator = async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/albums/collaborators', {
      method: 'POST',
      body: JSON.stringify({ album_id: albumId, email: inviteEmail, role: inviteRole }),
      headers: { 'Content-Type': 'application/json' }
    })
    if (!res.ok) setError('添加失败')
    setInviteEmail('')
    setInviteRole('viewer')
    setLoading(false)
    fetchCollaborators()
  }
  const removeCollaborator = async (userId: string) => {
    setLoading(true)
    setError('')
    await fetch('/api/albums/collaborators', {
      method: 'DELETE',
      body: JSON.stringify({ album_id: albumId, user_id: userId }),
      headers: { 'Content-Type': 'application/json' }
    })
    setLoading(false)
    fetchCollaborators()
  }
  const updateRole = async (userId: string, role: 'viewer' | 'editor') => {
    setLoading(true)
    setError('')
    await fetch('/api/albums/collaborators', {
      method: 'PATCH',
      body: JSON.stringify({ album_id: albumId, user_id: userId, role }),
      headers: { 'Content-Type': 'application/json' }
    })
    setLoading(false)
    fetchCollaborators()
  }
  if (!show) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button className="absolute right-2 top-2 text-gray-400 hover:text-gray-600" onClick={onClose}>×</button>
        <h2 className="text-xl font-bold mb-4">协作者管理</h2>
        <div className="mb-4">
          <div className="flex gap-2 mb-2">
            <input className="border rounded p-2 flex-1" placeholder="协作者邮箱" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            <select className="border rounded p-2" value={inviteRole} onChange={e => setInviteRole(e.target.value as 'viewer' | 'editor')}>
              <option value="viewer">只读</option>
              <option value="editor">可编辑</option>
            </select>
            <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={addCollaborator} disabled={loading || !inviteEmail}>添加</button>
          </div>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
        </div>
        <div className="max-h-64 overflow-y-auto divide-y">
          {collaborators.length === 0 ? (
            <div className="text-gray-400 text-center py-4">暂无协作者</div>
          ) : collaborators.map(c => (
            <div key={c.user_id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center text-gray-600 font-bold">{c.email?.[0]?.toUpperCase() || '?'}</span>
                <span className="text-gray-800">{c.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <select className="border rounded p-1 text-sm" value={c.role} onChange={e => updateRole(c.user_id, e.target.value as 'viewer' | 'editor')}>
                  <option value="viewer">只读</option>
                  <option value="editor">可编辑</option>
                </select>
                <button className="text-red-500 hover:underline text-xs" onClick={() => removeCollaborator(c.user_id)}>移除</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LogModal({ show, onClose, albumId }: LogModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<AlbumStats>({ views: 0, downloads: 0 })
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!show) return
    const fetchLogs = async () => {
      setLoading(true)
      const res = await fetch(`/api/albums/logs?album_id=${albumId}`)
      const data = await res.json()
      setStats({ views: data.views, downloads: data.downloads })
      setLogs(data.logs || [])
      setLoading(false)
    }
    fetchLogs()
  }, [show, albumId])
  if (!show) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl relative">
        <button className="absolute right-2 top-2 text-gray-400 hover:text-gray-600" onClick={onClose}>×</button>
        <h2 className="text-xl font-bold mb-4">统计与操作日志</h2>
        <div className="flex gap-6 mb-4">
          <div className="bg-blue-50 rounded p-4 flex-1 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.views}</div>
            <div className="text-gray-600 mt-1">访问量</div>
          </div>
          <div className="bg-green-50 rounded p-4 flex-1 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.downloads}</div>
            <div className="text-gray-600 mt-1">下载量</div>
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto border rounded divide-y">
          {loading ? (
            <div className="text-center text-gray-400 py-8">加载中...</div>
          ) : logs.length === 0 ? (
            <div className="text-center text-gray-400 py-8">暂无日志</div>
          ) : logs.map(log => (
            <div key={log.id} className="flex items-center justify-between px-4 py-2">
              <div className="flex-1">
                <span className="text-blue-500 font-semibold mr-2">{log.user_email}</span>
                <span className="text-gray-700">{log.action}</span>
                <span className="text-gray-400 ml-2">{log.detail}</span>
              </div>
              <div className="text-xs text-gray-400 ml-4 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AlbumPage() {
  const params = useParams()
  const albumId = params.id as string
  
  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [layout, setLayout] = useState<'grid' | 'masonry'>('grid')
  const [sortBy, setSortBy] = useState<'created_at' | 'taken_at'>('created_at')
  const [showShare, setShowShare] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [showBatchDownload, setShowBatchDownload] = useState(false)
  const [showCollaborators, setShowCollaborators] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const onUpload = () => setShowUploadModal(true)

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

      } catch (err: any) {
        console.error('获取相册数据失败:', err)
        setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [albumId])

  const fetchAlbumPhotos = async (): Promise<void> => {
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
    } catch (err: any) {
      console.error('获取相册照片失败:', err)
      setError('获取相册照片失败: ' + (err.message || err))
    }
  }

  const handlePhotoRemovedFromAlbum = async (photoId: string): Promise<void> => {
    // 从当前照片列表中移除被删除的照片
    setPhotos(prevPhotos => prevPhotos.filter(photo => photo.id !== photoId))
  }

  // 排序处理
  const sortedPhotos = [...photos].sort((a, b) => {
    if (sortBy === 'taken_at') {
      // 若 taken_at 字段不存在则 fallback 到 created_at
      const aTime = a.taken_at ? new Date(a.taken_at).getTime() : new Date(a.created_at).getTime()
      const bTime = b.taken_at ? new Date(b.taken_at).getTime() : new Date(b.created_at).getTime()
      return bTime - aTime
    } else {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  // 设为封面
  const handleSetCover = async (photoId: string) => {
    if (!album) return
    await fetch('/api/albums/cover', {
      method: 'POST',
      body: JSON.stringify({ album_id: album.id, photo_id: photoId }),
      headers: { 'Content-Type': 'application/json' }
    })
    // 刷新相册数据
    const { data: albumData } = await supabase
      .from('albums')
      .select('*')
      .eq('id', album.id)
      .single()
    setAlbum(albumData)
  }

  // 上传照片逻辑
  const handleUpload = async (file: File, title: string, description: string) => {
    // 1. 上传图片到 supabase storage
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('未登录')
    const userId = session.user.id
    const ext = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage.from('photos').upload(fileName, file)
    if (uploadError) throw uploadError
    // 2. 写入 photos 表
    const { data: photoData, error: photoError } = await supabase.from('photos').insert([
      {
        user_id: userId,
        title,
        description,
        image_path: fileName,
        file_size: file.size
      }
    ]).select('id').single()
    if (photoError) throw photoError
    // 3. 关联到当前相册
    await supabase.from('album_photos').insert([
      { album_id: albumId, photo_id: photoData.id }
    ])
    // 4. 刷新照片列表
    await fetchAlbumPhotos()
    return photoData.id
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"> <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div> </div>
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
    <Layout user={user} onLogout={async () => { await supabase.auth.signOut(); window.location.reload(); }} onUpload={onUpload}>
      <div>
        <header className="mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
            <h1 className="text-lg sm:text-2xl sm:font-bold font-semibold">{album.name}</h1>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 w-full sm:w-auto">
              <button className="bg-blue-500 text-white px-4 py-2 rounded text-base sm:text-base w-full sm:w-auto" onClick={onUpload}>上传照片</button>
              <button className="bg-blue-500 text-white px-4 py-2 rounded text-base sm:text-base w-full sm:w-auto" onClick={() => setShowShare(true)}>生成外链</button>
              <button className="bg-green-500 text-white px-4 py-2 rounded text-base sm:text-base w-full sm:w-auto" onClick={() => setShowCollaborators(true)}>协作者管理</button>
              <button className="bg-gray-700 text-white px-4 py-2 rounded text-base sm:text-base w-full sm:w-auto" onClick={() => setShowLogs(true)}>统计/日志</button>
              <Link href="/albums" className="text-blue-500 hover:underline text-base w-full sm:w-auto text-center">返回相册列表</Link>
            </div>
          </div>
          {album.description && (
            <p className="text-gray-600 mt-2 text-base">{album.description}</p>
          )}
          <div className="mt-2 text-sm text-gray-500">
            {photos.length} 张照片
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label htmlFor="layout-select" className="text-base text-gray-700">排列方式：</label>
            <select
              id="layout-select"
              value={layout}
              onChange={e => setLayout(e.target.value as 'grid' | 'masonry')}
              className="border rounded px-2 py-1 text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="grid">网格</option>
              <option value="masonry">流瀑式</option>
            </select>
            <label htmlFor="sort-select" className="text-base text-gray-700 ml-2">排序方式：</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'created_at' | 'taken_at')}
              className="border rounded px-2 py-1 text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="created_at">按上传时间</option>
              <option value="taken_at">按拍摄时间</option>
            </select>
          </div>
          <nav className="mt-4">
            <ul className="flex flex-wrap space-x-4 text-base">
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
        {error && (
          <div className="mb-4 text-red-600 bg-red-50 border border-red-200 rounded p-2 text-base">
            {error}
          </div>
        )}
        {selected.length > 0 && (
          <div className="my-4 flex gap-2">
            <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={() => setShowBatchDownload(true)}>
              批量下载（{selected.length}）
            </button>
            <button className="bg-gray-200 text-gray-700 px-3 py-2 rounded" onClick={() => setSelected([])}>
              取消选择
            </button>
          </div>
        )}
        {photos.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-md sm:rounded-lg">
            <p className="text-gray-600 mb-4">此相册中还没有照片</p>
            <Link
              href="/"
              className="inline-block bg-blue-500 text-white px-4 py-2 rounded-md sm:rounded transition text-base active:scale-95"
            >
              去添加照片
            </Link>
          </div>
        ) : (
          <PhotoGrid 
            photos={sortedPhotos} 
            albumId={albumId}
            onPhotoDeleted={fetchAlbumPhotos}
            onPhotoRemovedFromAlbum={handlePhotoRemovedFromAlbum}
            layout={layout}
            selectable
            selected={selected}
            onSelect={setSelected}
            renderActions={photo => (
              album && (
                <button
                  className={`px-2 py-1 rounded text-xs font-semibold shadow transition-all ${album.cover_photo_id === photo.id ? 'bg-blue-500 text-white cursor-default' : 'bg-white text-blue-500 border border-blue-500 hover:bg-blue-50'}`}
                  disabled={album.cover_photo_id === photo.id}
                  onClick={() => handleSetCover(photo.id)}
                >
                  {album.cover_photo_id === photo.id ? '当前封面' : '设为封面'}
                </button>
              )
            )}
          />
        )}
        {showShare && user && <ShareModal show={showShare} onClose={() => setShowShare(false)} albumId={album.id} user={user as User} />}
        {showBatchDownload && user && (
          <BatchDownloadModal show={showBatchDownload} onClose={() => setShowBatchDownload(false)} photoIds={selected} user={user as { id: string; email: string }} />
        )}
        {showCollaborators && (
          <CollaboratorModal show={showCollaborators} onClose={() => setShowCollaborators(false)} albumId={album.id} />
        )}
        {showLogs && (
          <LogModal show={showLogs} onClose={() => setShowLogs(false)} albumId={album.id} />
        )}
        {showUploadModal && (
          <UploadModal
            show={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onUpload={handleUpload}
          />
        )}
      </div>
    </Layout>
  )
} 