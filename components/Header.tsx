"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { useState } from "react"

interface HeaderProps {
  user: User | null
  onLogin?: () => void
  onLogout?: () => void
}

export default function Header({ user, onLogin, onLogout }: HeaderProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    if (onLogout) await onLogout()
    else {
      await supabase.auth.signOut()
      window.location.reload()
    }
    setLoading(false)
  }

  return (
    <header className="relative py-4 px-2 sm:py-6 sm:px-6 flex flex-col sm:flex-row items-center sm:justify-between w-full max-w-6xl mx-auto overflow-hidden rounded-xl">
      {/* 背景图层 */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none select-none">
        <img
          src="/header-photo.jpg"
          alt="header background"
          className="w-full h-full object-cover opacity-60"
          draggable="false"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-200/60 to-pink-200/60"></div>
      </div>
      {/* 内容层 */}
      <div className="relative z-10 w-full flex flex-col sm:flex-row items-center sm:justify-between">
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-0 cursor-pointer" onClick={() => router.push("/") }>
          <Image src="/logo.svg" width={40} height={40} alt="logo" />
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800 leading-tight">PhotoLive · 个人照片墙</h1>
            <p className="text-gray-500 text-xs sm:text-sm">记录生活每一刻，分享精彩瞬间</p>
          </div>
        </div>
        <div>
          {!user ? (
            <button
              className="bg-white/80 text-blue-700 px-4 py-1.5 rounded-full shadow font-semibold border border-blue-200 hover:bg-white hover:text-blue-900 hover:border-blue-400 transition backdrop-blur text-xs sm:text-sm"
              onClick={onLogin}
            >
              登录 / 注册
            </button>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                className="text-gray-700 text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-none hover:underline"
                onClick={() => router.push('/profile')}
                title="个人中心"
              >
                {user?.email}
              </button>
              <button
                className="text-gray-500 hover:text-red-500 px-2 sm:px-3 py-1 rounded transition border border-gray-200 bg-white text-xs sm:text-base"
                onClick={handleLogout}
                disabled={loading}
              >
                退出
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
} 