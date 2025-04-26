"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Header from "@/components/Header"
import Layout from '@/components/Layout'

const MAX_STORAGE = 1024 * 1024 * 1024 // 1GB

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [usedStorage, setUsedStorage] = useState(0)
  const [albums, setAlbums] = useState<any[]>([])
  const [photoCount, setPhotoCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [showEdit, setShowEdit] = useState(false)
  const [nickname, setNickname] = useState(user?.email || "")
  const [editMsg, setEditMsg] = useState<string | null>(null)
  const [showSecurity, setShowSecurity] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetMsg, setResetMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setUser(null)
        setLoading(false)
        return
      }
      setUser(session.user)
      // 查询用量
      const { data: photos } = await supabase
        .from('photos')
        .select('file_size')
        .eq('user_id', session.user.id)
      setUsedStorage(photos?.reduce((sum, p) => sum + (p.file_size || 0), 0) || 0)
      setPhotoCount(photos?.length || 0)
      // 查询相册
      const { data: albumsData } = await supabase
        .from('albums')
        .select('id, name, description, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      setAlbums(albumsData || [])
      setLoading(false)
    }
    fetchAll()
  }, [])

  const percent = Math.round((usedStorage / MAX_STORAGE) * 100)

  // 编辑资料提交
  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditMsg(null)
    // 假设有profiles表，实际可根据你项目调整
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      // 这里只是演示，实际应写入profiles表
      setEditMsg("昵称已保存（演示）")
      setTimeout(() => setShowEdit(false), 1000)
    } catch {
      setEditMsg("保存失败")
    }
  }
  // 重置密码
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetMsg(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail)
      if (error) setResetMsg("发送失败：" + error.message)
      else setResetMsg("重置密码邮件已发送，请查收邮箱")
    } catch {
      setResetMsg("发送失败")
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
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-2">
            <Image src="/logo.svg" width={40} height={40} alt="avatar" />
          </div>
          <div className="text-lg font-bold text-gray-800">{user.email}</div>
          <div className="text-xs text-gray-400 mt-1">注册时间：{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</div>
          <div className="flex gap-2 mt-3">
            <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs" onClick={() => { setNickname(user.email); setShowEdit(true); }}>编辑资料</button>
            <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs" onClick={() => { setResetEmail(user.email); setShowSecurity(true); }}>安全设置</button>
          </div>
        </div>
        {/* 编辑资料弹窗 */}
        {showEdit && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowEdit(false)}>
            <div className="bg-white rounded-lg p-6 w-full max-w-xs shadow-lg relative" onClick={e => e.stopPropagation()}>
              <form onSubmit={handleEditProfile}>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">昵称</label>
                  <input className="w-full border rounded p-2" value={nickname} onChange={e => setNickname(e.target.value)} maxLength={30} required />
                </div>
                {editMsg && <div className="mb-2 text-sm text-green-600">{editMsg}</div>}
                <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition mb-2">保存</button>
                <button type="button" className="w-full text-gray-400 hover:text-gray-600" onClick={() => setShowEdit(false)}>关闭</button>
              </form>
            </div>
          </div>
        )}
        {/* 安全设置弹窗 */}
        {showSecurity && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowSecurity(false)}>
            <div className="bg-white rounded-lg p-6 w-full max-w-xs shadow-lg relative" onClick={e => e.stopPropagation()}>
              <form onSubmit={handleResetPassword}>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">重置密码邮箱</label>
                  <input className="w-full border rounded p-2" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
                </div>
                {resetMsg && <div className="mb-2 text-sm text-green-600">{resetMsg}</div>}
                <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition mb-2">发送重置邮件</button>
                <button type="button" className="w-full text-gray-400 hover:text-gray-600" onClick={() => setShowSecurity(false)}>关闭</button>
              </form>
            </div>
          </div>
        )}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>已用空间：{(usedStorage / 1024 / 1024).toFixed(1)} MB / 1024 MB</span>
            <span>{percent}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 transition-all duration-300" style={{ width: `${percent > 100 ? 100 : percent}%` }}></div>
          </div>
        </div>
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <div className="font-semibold text-base text-gray-700">我的相册</div>
            <div className="text-xs text-gray-400">共 {albums.length} 个</div>
          </div>
          {albums.length === 0 ? (
            <div className="text-gray-400 text-sm py-4 text-center">暂无相册</div>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
              {albums.map(album => (
                <li key={album.id} className="px-4 py-3 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="font-medium text-gray-800">{album.name}</div>
                    <div className="text-xs text-gray-500 line-clamp-1">{album.description}</div>
                    <div className="text-xs text-gray-400 mt-1">创建于 {album.created_at ? new Date(album.created_at).toLocaleDateString() : '-'}</div>
                  </div>
                  <button className="mt-2 sm:mt-0 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs" onClick={() => router.push(`/albums/${album.id}`)}>管理</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <div className="font-semibold text-base text-gray-700">我的照片</div>
            <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs" onClick={() => router.push('/photos')}>管理我的照片</button>
          </div>
          <div className="text-xs text-gray-500">共 {photoCount} 张</div>
        </div>
      </div>
    </Layout>
  )
} 