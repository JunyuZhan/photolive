# Next.js + Supabase 个人照片直播网站

下面是一个基于 Next.js 和 Supabase 的个人照片直播网站的完整实现方案。这个方案将网站部署在 Vercel 或 Cloudflare Pages 上，而数据存储和数据库在内网环境中。

## 项目结构

```
/my-photo-site
├── public/                # 静态文件
├── src/
│   ├── components/        # React 组件
│   ├── lib/               # Supabase 客户端等
│   ├── pages/             # Next.js 页面
│   ├── styles/            # 样式文件
│   └── utils/             # 工具函数
├── .env.local             # 本地环境变量
├── next.config.js         # Next.js 配置
└── package.json
```

## 1. 初始化项目

```bash
npx create-next-app@latest my-photo-site
cd my-photo-site
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

## 2. 配置 Supabase

### `src/lib/supabaseClient.js`

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

## 3. 创建数据库表

在内网 Supabase 中创建以下表：

1. **photos** - 存储照片信息
   
   - id (uuid, primary key)
   - user_id (uuid, references auth.users)
   - title (text)
   - description (text)
   - image_path (text)
   - created_at (timestamp with time zone, default now())
   - is_public (boolean, default false)

2. **albums** - 相册
   
   - id (uuid, primary key)
   - user_id (uuid, references auth.users)
   - name (text)
   - description (text)
   - created_at (timestamp with time zone, default now())

3. **album_photos** - 相册与照片关联
   
   - album_id (uuid, references albums)
   - photo_id (uuid, references photos)
   - added_at (timestamp with time zone, default now())

## 4. 实现核心页面

### `pages/index.js` - 首页

```javascript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import PhotoGrid from '../components/PhotoGrid'
import UploadModal from '../components/UploadModal'

export default function Home() {
  const [photos, setPhotos] = useState([])
  const [user, setUser] = useState(null)
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    const session = supabase.auth.session()
    setUser(session?.user ?? null)

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (event === 'SIGNED_IN') {
          await fetchPhotos()
        }
      }
    )

    fetchPhotos()

    return () => {
      authListener?.unsubscribe()
    }
  }, [])

  const fetchPhotos = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching photos:', error)
    } else {
      setPhotos(data)
    }
  }

  const handleUpload = async (file, title, description) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    // 上传到 Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filePath, file)

    if (uploadError) {
      throw uploadError
    }

    // 获取公开 URL
    const { publicURL, error: urlError } = supabase.storage
      .from('photos')
      .getPublicUrl(filePath)

    if (urlError) {
      throw urlError
    }

    // 插入数据库记录
    const { error: dbError } = await supabase.from('photos').insert([
      {
        user_id: user.id,
        title,
        description,
        image_path: filePath,
        is_public: false
      }
    ])

    if (dbError) {
      throw dbError
    }

    await fetchPhotos()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">我的照片库</h1>
        {user ? (
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowUpload(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              上传照片
            </button>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="text-gray-600"
            >
              退出
            </button>
          </div>
        ) : (
          <button 
            onClick={() => supabase.auth.signInWithPassword({
              email: 'your@email.com',
              password: 'yourpassword'
            })}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            登录
          </button>
        )}
      </header>

      {user ? (
        <>
          <PhotoGrid photos={photos} />
          <UploadModal 
            show={showUpload}
            onClose={() => setShowUpload(false)}
            onUpload={handleUpload}
          />
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-xl">请登录查看您的照片</p>
        </div>
      )}
    </div>
  )
}
```

### `components/PhotoGrid.js`

```javascript
import Image from 'next/image'

export default function PhotoGrid({ photos }) {
  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">暂无照片，请上传您的第一张照片</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <div key={photo.id} className="relative group overflow-hidden rounded-lg">
          <Image
            src={supabase.storage.from('photos').getPublicUrl(photo.image_path).publicURL}
            alt={photo.title || '未命名照片'}
            width={300}
            height={300}
            className="w-full h-64 object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-end p-4">
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
  )
}
```

### `components/UploadModal.js`

```javascript
import { useState } from 'react'

export default function UploadModal({ show, onClose, onUpload }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('请选择要上传的文件')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      await onUpload(file, title, description)
      setFile(null)
      setTitle('')
      setDescription('')
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">上传照片</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">选择文件</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="照片标题"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded"
              rows="3"
              placeholder="照片描述"
            />
          </div>

          {error && <div className="text-red-500 mb-4">{error}</div>}

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
              disabled={isUploading}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded"
              disabled={isUploading}
            >
              {isUploading ? '上传中...' : '上传'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

## 5. 环境变量配置

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名密钥
```

## 6. 部署配置

### Vercel 部署

1. 将代码推送到 GitHub 仓库
2. 在 Vercel 中导入项目
3. 添加环境变量（同 `.env.local`）

### Cloudflare Pages 部署

1. 将代码推送到 GitHub 仓库
2. 在 Cloudflare Pages 中创建新项目
3. 选择 GitHub 仓库
4. 构建设置：
   - 框架预设：Next.js
   - 构建命令：`npm run build`
   - 构建输出目录：`.next`
5. 添加环境变量

## 7. 内网 Supabase 配置

1. 在内网部署 Supabase
2. 配置存储桶：
   - 创建名为 `photos` 的存储桶
   - 设置适当的权限策略
3. 配置数据库表（如第3部分所述）
4. 确保内网 Supabase 可以通过互联网访问（或设置 VPN 连接）

## 8. 安全措施

1. 启用 Supabase 行级安全 (RLS) 并配置策略：

```sql
-- photos 表策略
CREATE POLICY "用户只能管理自己的照片" 
ON photos FOR ALL USING (auth.uid() = user_id);

-- albums 表策略
CREATE POLICY "用户只能管理自己的相册" 
ON albums FOR ALL USING (auth.uid() = user_id);

-- album_photos 表策略
CREATE POLICY "用户只能通过相册管理照片" 
ON album_photos FOR ALL USING (
  EXISTS (SELECT 1 FROM albums WHERE id = album_id AND user_id = auth.uid())
);
```

2. 使用强密码保护登录
3. 考虑添加二次验证
4. 限制上传文件类型和大小

## 9. 扩展功能

1. **相册管理**：创建、编辑和删除相册
2. **照片分类**：添加标签或分类系统
3. **批量上传**：支持多文件同时上传
4. **照片编辑**：基本的裁剪和滤镜功能
5. **分享链接**：生成临时分享链接（即使是不公开的照片）

这个实现提供了一个基本的个人照片直播网站，您可以根据需要进一步扩展功能。由于数据存储在内网，确保了隐私性，同时通过 Vercel 或 Cloudflare Pages 提供了良好的访问性能。