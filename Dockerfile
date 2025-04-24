FROM node:18-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 仅安装文件服务器所需依赖，减少镜像大小
RUN npm install --production --only=prod express multer cors

# 复制文件服务器代码和上传目录
COPY scripts/localFileServer.js ./scripts/
RUN mkdir -p uploads

# 暴露13001端口
EXPOSE 13001

# 启动文件服务器
CMD ["node", "scripts/localFileServer.js"] 