"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import Header from "@/components/Header"
import Layout from '@/components/Layout'

export default function MyPhotosPage() {
  const [user, setUser] = useState<any>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>([])
  const [showEdit, setShowEdit] = useState(false)
  const [editPhoto, setEditPhoto] = useState<any>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    const fetchUserPhotos = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setUser(null)
        setPhotos([])
        setLoading(false)
        return
      }
      setUser(session.user)
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      setPhotos(data || [])
      setLoading(false)
    }
    fetchUserPhotos()
  }, [])

  const handleSelect = (id: string, checked: boolean) => {
    setSelected(checked ? [...selected, id] : selected.filter(i => i !== id))
  }

  const handleSelectAll = (checked: boolean) => {
    setSelected(checked ? photos.map(p => p.id) : [])
  }

  const handleDelete = async (ids: string[]) => {
    if (!window.confirm('确定要删除选中的照片吗？此操作不可撤销。')) return
    setDeleteLoading(true)
    try {
      const { error } = await supabase.from('photos').delete().in('id', ids)
      if (error) throw error
      setPhotos(photos.filter(p => !ids.includes(p.id)))
      setSelected(selected.filter(id => !ids.includes(id)))
    } finally {
      setDeleteLoading(false)
    }
  }

  const openEdit = (photo: any) => {
    setEditPhoto(photo)
    setEditTitle(photo.title || "")
    setEditDesc(photo.description || "")
    setShowEdit(true)
    setEditError(null)
  }

  const handleEditSave = async () => {
    setEditLoading(true)
    setEditError(null)
    try {
      const { error } = await supabase.from('photos').update({ title: editTitle, description: editDesc }).eq('id', editPhoto.id)
      if (error) throw error
      setPhotos(photos.map(p => p.id === editPhoto.id ? { ...p, title: editTitle, description: editDesc } : p))
      setShowEdit(false)
    } catch (err: any) {
      setEditError(err.message || '保存失败')
    } finally {
      setEditLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-[40vh] text-gray-400">加载中...</div>
  }
  if (!user) {
    return <div className="flex flex-col items-center py-12 text-gray-500">请先登录</div>
  }

  return (
    <Layout user={user} onLogout={async () => { await supabase.auth.signOut(); window.location.reload(); }}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">我的照片管理</h1>
          {photos.length > 0 && (
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={selected.length === photos.length} onChange={e => handleSelectAll(e.target.checked)} />
              <span className="text-xs text-gray-500">全选</span>
              <button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs disabled:opacity-60" disabled={selected.length === 0 || deleteLoading} onClick={() => handleDelete(selected)}>批量删除</button>
            </div>
          )}
        </div>
        {photos.length === 0 ? (
          <div className="text-gray-400 text-center py-12">暂无照片</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {photos.map(photo => (
              <div key={photo.id} className="bg-white rounded-lg shadow p-2 flex flex-col relative group">
                <input type="checkbox" className="absolute left-2 top-2 z-10" checked={selected.includes(photo.id)} onChange={e => handleSelect(photo.id, e.target.checked)} />
                <Image src={`${process.env.NEXT_PUBLIC_LOCAL_STORAGE_URL || ''}/photos/${photo.image_path}`} alt={photo.title || '未命名'} width={300} height={200} className="rounded mb-2 object-cover w-full h-32 sm:h-40" />
                <div className="font-semibold text-sm truncate">{photo.title || '未命名'}</div>
                <div className="text-xs text-gray-500 truncate">{photo.description}</div>
                <div className="text-xs text-gray-400 mt-1">{photo.taken_at ? new Date(photo.taken_at).toLocaleString() : new Date(photo.created_at).toLocaleString()}</div>
                <div className="flex gap-2 mt-2">
                  <button className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs" onClick={() => openEdit(photo)}>编辑</button>
                  <button className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs" onClick={() => handleDelete([photo.id])}>删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* 编辑弹窗 */}
        {showEdit && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowEdit(false)}>
            <div className="bg-white rounded-lg p-6 w-full max-w-xs shadow-lg relative" onClick={e => e.stopPropagation()}>
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
              <button className="w-full text-gray-400 hover:text-gray-600 mt-2" onClick={() => setShowEdit(false)}>关闭</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
} 