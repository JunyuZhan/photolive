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
PGUSER=数据库用户名
PGHOST=数据库主机
PGDATABASE=数据库名
PGPASSWORD=数据库密码
PGPORT=5432
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

## 环境变量配置

请在项目根目录下创建 `.env.local` 文件，内容示例：

```
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名密钥
PGUSER=数据库用户名
PGHOST=数据库主机
PGDATABASE=数据库名
PGPASSWORD=数据库密码
PGPORT=5432
```

- 前端和 API 路由用 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 本地文件服务器用 PG 相关变量连接数据库

## Windows 下依赖清理命令

如需删除 `node_modules` 和 `package-lock.json`，请在 PowerShell 下使用：
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
```

## 批量下载接口

- 路径：`/api/download-zip`
- 方法：POST
- 参数：`photo_ids`（数组）
- 返回：zip 文件流（`application/zip`）

> 注意：为兼容 Next.js 15+，zip 文件会先收集到 Buffer 后再返回，适合中小型批量下载。

## Next.js 15 API 路由类型问题

- Next.js 15.3.1 存在 API Route Handler 类型推断 bug，标准写法如下：
  ```ts
  export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) { /* ... */ }
  ```
- 如遇类型报错，可临时将第二参数类型写为 `any`：
  ```ts
  export async function GET(request: NextRequest, context: any) { /* ... */ }
  ```
- 等 Next.js 官方修复后再还原为标准写法。

## 其它说明

- 文件服务器支持水印、批量下载、图片编辑等高级功能，详见代码注释。
- Cloudflare/Vercel 部署时建议清理构建缓存，确保依赖和类型最新。
