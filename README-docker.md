# PhotoLive 文件服务器 Docker 部署指南

## 简介

本指南介绍如何使用 Docker 部署 PhotoLive 的本地文件存储服务器，方便在内网中安全地存储和访问照片。

## 前提条件

- Debian 服务器（或其他 Linux 系统）
- 已安装 Docker 和 Docker Compose
- 内网环境
- Supabase 数据库（或其他 PostgreSQL 数据库）

## 安装 Docker (如未安装)

```bash
# 更新包索引
sudo apt update

# 安装必要的依赖
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# 添加 Docker 官方 GPG 密钥
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 设置稳定版仓库
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 更新包索引
sudo apt update

# 安装 Docker
sudo apt install -y docker-ce docker-ce-cli containerd.io

# 安装 Docker Compose
sudo apt install -y docker-compose
```

## 部署步骤

1. 克隆或复制项目到服务器

```bash
git clone <项目地址> photolive
cd photolive
```

2. 创建环境变量文件

```bash
# 创建.env.local文件
touch .env.local

# 编辑.env.local文件，填入正确的数据库连接信息
nano .env.local
```

### Supabase数据库配置

在`.env.local`文件中添加以下配置：

```
# Supabase数据库配置
PGUSER=postgres
PGHOST=db.xxx.supabase.co  # 替换为您的Supabase主机地址
PGDATABASE=postgres
PGPASSWORD=your_password   # 替换为您的数据库密码
PGPORT=5432

# 应用配置
NODE_ENV=production
PORT=13001

# 上传文件大小限制 (默认10MB)
FILE_SIZE_LIMIT=10485760
```

您可以从Supabase控制面板的"Settings > Database"页面找到数据库连接信息。

3. 创建必要的目录

```bash
mkdir -p uploads
mkdir -p logs
```

4. 构建并启动 Docker 容器

```bash
# 构建镜像
docker-compose build

# 启动容器
docker-compose up -d
```

5. 验证服务器运行状态

```bash
# 查看容器状态
docker ps

# 查看日志
docker logs photolive-storage

# 检查健康状态
curl http://localhost:13001/health
```

## 文件持久化

文件存储在 `./uploads` 目录中，日志存储在 `./logs` 目录中，这些目录已通过 volumes 挂载到容器内部，确保数据不会因容器重启而丢失。

## 环境变量配置

在 `.env.local` 文件中配置以下环境变量：

```
# 数据库配置
PGUSER=postgres           # 数据库用户名
PGHOST=db.xxx.supabase.co # Supabase数据库主机地址
PGDATABASE=postgres       # 数据库名称
PGPASSWORD=your_password  # 数据库密码
PGPORT=5432               # 数据库端口

# 应用配置
NODE_ENV=production       # 运行环境，生产环境使用production
PORT=13001                # 应用端口

# 其他配置
FILE_SIZE_LIMIT=10485760  # 上传文件大小限制，单位字节（默认10MB）
```

## 访问服务

文件服务器将在 `http://服务器IP:13001` 上运行。

- 上传端点: `http://服务器IP:13001/upload`
- 图片访问: `http://服务器IP:13001/photos/<图片路径>`
- 健康检查: `http://服务器IP:13001/health`

## 注意事项

1. 确保服务器防火墙允许 13001 端口访问
2. 此服务适合在内网环境下使用，若需要外网访问，建议配置反向代理（如Nginx）并增加额外的安全措施
3. 定期备份 `uploads` 目录中的数据和数据库
4. 监控 `logs` 目录下的日志文件，了解系统运行状态
5. Supabase数据库连接需要SSL支持，已在代码中配置

## 维护命令

```bash
# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f

# 更新服务（拉取最新代码后）
git pull
docker-compose build
docker-compose up -d
```

## 常见问题

1. 如果端口冲突，可在 `docker-compose.yml` 中修改端口映射
2. 如需更改存储目录，修改 `docker-compose.yml` 中的 volumes 配置
3. 如果出现数据库连接问题，检查 `.env.local` 中的数据库配置是否正确，以及Supabase是否允许从您的服务器IP连接
4. 如果服务无法启动，检查日志文件了解详细错误原因
5. 如遇到SSL连接问题，确认`rejectUnauthorized: false`配置已存在 