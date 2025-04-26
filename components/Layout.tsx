"use client"

import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { HomeIcon, PhotoIcon, BookOpenIcon, Cog6ToothIcon, UserCircleIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline'

export default function Layout({ user, onLogout, children, onUpload }: { user: User | null, onLogout?: () => Promise<void>, children: React.ReactNode, onUpload?: () => void }) {
  const router = useRouter()
  const [showUserMenu, setShowUserMenu] = useState(false)

  function BackToTopButton() {
    const [visible, setVisible] = useState(false)
    useEffect(() => {
      const onScroll = () => setVisible(window.scrollY > 200)
      window.addEventListener('scroll', onScroll)
      return () => window.removeEventListener('scroll', onScroll)
    }, [])
    if (!visible) return null
    return (
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 z-50 bg-blue-500 text-white rounded-full p-3 shadow-lg hover:bg-blue-600 transition"
        title="回到顶部"
      >
        ↑
      </button>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 左侧极简图标栏 */}
      <aside className="w-16 bg-black flex flex-col items-center py-4 text-white">
        <Link href="/" className="mb-8 flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-800">
          <img src="/logo.svg" className="w-8 h-8" alt="logo" />
        </Link>
        <Link href="/" className="mb-6 flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-800" title="首页">
          <HomeIcon className="w-6 h-6" />
        </Link>
        <Link href="/photos" className="mb-6 flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-800" title="我的照片">
          <PhotoIcon className="w-6 h-6" />
        </Link>
        <Link href="/albums" className="mb-6 flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-800" title="我的相册">
          <BookOpenIcon className="w-6 h-6" />
        </Link>
        <Link href="/profile" className="mb-6 flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-800" title="个人中心">
          <UserCircleIcon className="w-6 h-6" />
        </Link>
        <button onClick={onLogout} className="mt-auto flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-800 text-red-400" title="退出登录">
          <ArrowLeftOnRectangleIcon className="w-6 h-6" />
        </button>
      </aside>
      <div className="flex-1 flex flex-col">
        {/* 顶部导航栏 */}
        <header className="h-16 flex items-center justify-between px-8 bg-white shadow-sm">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.svg" className="w-8 h-8" alt="logo" />
              <span className="font-bold text-lg text-gray-800">PhotoLive</span>
            </Link>
            <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium">首页</Link>
            <Link href="/albums" className="text-gray-700 hover:text-blue-600 font-medium">我的相册</Link>
            <Link href="/photos" className="text-gray-700 hover:text-blue-600 font-medium">我的照片</Link>
          </div>
          <div className="relative">
            <button className="flex items-center gap-2 px-3 py-1 rounded hover:bg-gray-100" onClick={() => setShowUserMenu(v => !v)}>
              <UserCircleIcon className="w-7 h-7 text-blue-500" />
              <span className="text-gray-700 font-medium text-sm">{user?.email || '未登录'}</span>
            </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded shadow-lg z-50">
                <Link href="/profile" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">个人中心</Link>
                <button onClick={onLogout} className="block w-full text-left px-4 py-2 text-red-500 hover:bg-red-50">退出登录</button>
              </div>
            )}
          </div>
        </header>
        {/* 内容区卡片化 */}
        <main className="flex-1 p-8 bg-gray-50">
          <div className="grid gap-8 grid-cols-1 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <div className="flex justify-end mb-4">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold"
                  onClick={onUpload}
                >
                  上传照片
                </button>
              </div>
              {children}
            </div>
            <aside className="hidden xl:block space-y-6">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="font-bold text-gray-700 mb-2">云空间</div>
                <div className="text-xs text-gray-500 mb-2">已用空间：0MB / 1024MB</div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-blue-400 transition-all duration-300" style={{ width: `0%` }}></div>
                </div>
                <button className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs">管理</button>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <div className="font-bold text-gray-700 mb-2">服务</div>
                <div className="flex flex-col gap-2">
                  <button className="px-3 py-1 bg-pink-100 text-pink-700 rounded hover:bg-pink-200 text-xs">AI修图</button>
                  <button className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs">人工修图</button>
                </div>
              </div>
            </aside>
          </div>
        </main>
        <footer className="w-full text-center text-gray-400 text-sm py-4 border-t border-gray-100 bg-white/60">
          © 2024 PhotoLive. JunyuZhan版权所有
          <span className="mx-2">|</span>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener" className="hover:underline">
            京ICP备12345678号
          </a>
        </footer>
      </div>
      <BackToTopButton />
    </div>
  )
} 