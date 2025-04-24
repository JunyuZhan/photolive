# PhotoLive 文件服务器 Docker 部署指南

## 简介

本指南介绍如何使用 Docker 部署 PhotoLive 的本地文件存储服务器，方便在内网中安全地存储和访问照片。

## 前提条件

- Debian 服务器（或其他 Linux 系统）
- 已安装 Docker 和 Docker Compose
- 内网环境

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

2. 创建 uploads 目录（如果不存在）

```bash
mkdir -p uploads
```

3. 构建并启动 Docker 容器

```bash
# 启动容器
docker-compose up -d
```

4. 验证服务器运行状态

```bash
# 查看容器状态
docker ps

# 查看日志
docker logs photolive-storage
```

## 文件持久化

文件存储在 `./uploads` 目录中，该目录已通过 volumes 挂载到容器内部，确保数据不会因容器重启而丢失。

## 访问服务

文件服务器将在 `http://服务器IP:13001` 上运行。

- 上传端点: `http://服务器IP:13001/upload`
- 图片访问: `http://服务器IP:13001/photos/<图片路径>`

## 注意事项

1. 确保服务器防火墙允许 13001 端口访问
2. 此服务适合在内网环境下使用，若需要外网访问，建议增加额外的安全措施
3. 定期备份 `uploads` 目录中的数据

## 常见问题

1. 如果端口冲突，可在 `docker-compose.yml` 中修改端口映射
2. 如需更改存储目录，修改 `docker-compose.yml` 中的 volumes 配置 