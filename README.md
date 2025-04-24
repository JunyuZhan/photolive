# PhotoLive - 个人照片直播网站

这是一个基于 Next.js 和 Supabase 的个人照片直播网站，用于上传、管理和分享个人照片。

## 功能特点

- 用户认证和授权
- 照片上传和管理
- 照片分类和相册功能
- 响应式设计，适配各种设备
- 本地内网文件存储服务器

## 技术栈

- **前端框架**：Next.js 15
- **样式**：Tailwind CSS
- **后端/数据库**：Supabase (PostgreSQL)
- **文件存储**：本地内网文件服务器
- **部署**：Vercel/Cloudflare Pages (前端), Docker (文件服务器)

## 本地开发

1. 克隆仓库
```bash
git clone https://github.com/yourusername/photolive.git
cd photolive
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
创建 `.env.local` 文件，添加以下内容：
```
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名密钥
```

4. 启动文件服务器
```bash
npm run file-server
```

5. 启动开发服务器
```bash
npm run dev
```

6. 访问 http://localhost:3000 查看应用

## 文件服务器 API

本项目使用自定义的本地文件服务器来存储和管理照片文件，以下是可用的API:

- `POST /upload` - 上传文件
- `DELETE /photos/:userId/:fileName` - 删除文件
- `GET /info/:userId/:fileName` - 获取文件信息
- `GET /files/:userId` - 获取用户所有文件列表
- `GET /status` - 获取服务器状态

## Docker 部署

文件服务器可以使用 Docker 进行部署，详见 [README-docker.md](README-docker.md) 文件。

## 数据库设置

在 Supabase 中需要创建以下表：

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

## 项目结构

```
photolive/
├── app/              # Next.js 应用页面
│   ├── page.tsx      # 主页面
│   ├── albums/       # 相册相关页面
│   └── ...
├── components/       # React 组件
├── lib/              # 通用库和工具
├── public/           # 静态资源
├── scripts/          # 脚本文件
│   └── localFileServer.js  # 本地文件服务器
├── uploads/          # 上传的照片存储目录
└── logs/             # 服务器日志
```

## 许可证

MIT
