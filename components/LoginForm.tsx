import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { supabase } from '@/lib/supabase'

// 管理员登录表单组件
const LoginForm: React.FC = (): ReactElement => {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [registerSuccess, setRegisterSuccess] = useState<boolean>(false)
  const [rememberMe, setRememberMe] = useState<boolean>(true)
  const [failCount, setFailCount] = useState(0)
  const [lockTime, setLockTime] = useState<number | null>(null)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMsg, setResetMsg] = useState<string | null>(null)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (lockTime) {
      timer = setInterval(() => {
        if (Date.now() > lockTime) {
          setFailCount(0)
          setLockTime(null)
        }
      }, 1000)
    }
    return () => { if (timer) clearInterval(timer) }
  }, [lockTime])

  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (lockTime && Date.now() < lockTime) {
      setError('密码输错次数过多，请稍后再试')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) {
        setFailCount(failCount + 1)
        if (failCount + 1 >= 5) {
          setLockTime(Date.now() + 60 * 1000)
          setError('密码输错次数过多，请1分钟后再试')
        } else {
          setError(error.message || '登录失败，请检查邮箱和密码')
        }
        return
      }
      // 登录成功后根据"记住我"存储session
      if (data.session) {
        const storageKeyPrefix = 'sb-'
        const keys = Object.keys(localStorage).concat(Object.keys(sessionStorage))
        const sbKey = keys.find(k => k.startsWith(storageKeyPrefix) && k.includes('auth-token'))
        if (sbKey) {
          const sessionStr = JSON.stringify(data.session)
          if (rememberMe) {
            localStorage.setItem(sbKey, sessionStr)
            sessionStorage.removeItem(sbKey)
          } else {
            sessionStorage.setItem(sbKey, sessionStr)
            localStorage.removeItem(sbKey)
          }
        }
      }
      setSuccess(true)
      setFailCount(0)
      setLockTime(null)
    } catch (err: any) {
      setError(err instanceof Error ? err.message : '登录失败，请检查邮箱和密码')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setRegisterSuccess(false)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })
      if (error) throw error
      setRegisterSuccess(true)
    } catch (err: any) {
      setError(err instanceof Error ? err.message : '注册失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetMsg(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail)
      if (error) setResetMsg('发送失败：' + error.message)
      else setResetMsg('重置密码邮件已发送，请查收邮箱')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <p className="text-green-500 mb-4">登录成功！</p>
      </div>
    )
  }

  if (registerSuccess) {
    return (
      <div className="text-center py-4">
        <div className="flex flex-col items-center mb-2">
          <svg className="w-8 h-8 text-blue-500 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 12H8m8 0a4 4 0 11-8 0 4 4 0 018 0zm0 0v4a4 4 0 01-8 0v-4" /></svg>
          <p className="text-green-600 font-bold text-base mb-1">注册成功！</p>
          <p className="text-blue-700 font-semibold">请前往邮箱查收激活邮件，完成验证后才能登录。</p>
        </div>
        <button
          className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition"
          onClick={() => { setMode('login'); setRegisterSuccess(false); }}
        >
          去登录
        </button>
        <div className="mt-2 text-xs text-gray-500">未验证邮箱无法登录</div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {mode === 'login' ? (
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              id="rememberMe"
              className="mr-2"
            />
            <label htmlFor="rememberMe" className="text-gray-600 text-sm">记住我</label>
            <button type="button" className="ml-auto text-blue-500 hover:underline text-sm" onClick={() => { setShowReset(true); setResetMsg(null); setResetEmail(email); }}>忘记密码？</button>
          </div>
          {error && <div className="text-red-500 mb-4 p-2 bg-red-50 rounded">{error}</div>}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition"
            disabled={loading || Boolean(lockTime && Date.now() < lockTime)}
          >
            {lockTime && Date.now() < lockTime ? `请等待${Math.ceil((lockTime - Date.now())/1000)}秒` : (loading ? '登录中...' : '登录')}
          </button>
          <div className="mt-4 text-center text-sm text-gray-500">
            没有账号？
            <button type="button" className="text-blue-500 hover:underline ml-1" onClick={() => { setMode('register'); setError(null); }}>
              去注册
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          {error && <div className="text-red-500 mb-4 p-2 bg-red-50 rounded">{error}</div>}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition"
            disabled={loading}
          >
            {loading ? '注册中...' : '注册'}
          </button>
          <div className="mt-4 text-center text-sm text-gray-500">
            已有账号？
            <button type="button" className="text-blue-500 hover:underline ml-1" onClick={() => { setMode('login'); setError(null); }}>
              去登录
            </button>
          </div>
        </form>
      )}
      {/* 密码重置弹窗 */}
      {showReset && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowReset(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-xs shadow-lg relative" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleResetPassword}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">请输入注册邮箱</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              {resetMsg && <div className="mb-2 text-sm text-green-600">{resetMsg}</div>}
              <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition mb-2" disabled={loading}>{loading ? '发送中...' : '发送重置邮件'}</button>
              <button type="button" className="w-full text-gray-400 hover:text-gray-600" onClick={() => setShowReset(false)}>关闭</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default LoginForm