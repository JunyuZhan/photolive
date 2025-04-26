FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 环境变量
ENV NODE_ENV=production
ENV PORT=13001

# 安装必要工具
RUN apk add --no-cache wget curl

# 复制package文件
COPY package*.json ./

# 安装文件服务器所需依赖
RUN npm install --production --only=prod express multer cors pg sharp jimp archiver uuid qrcode dotenv morgan

# 复制文件服务器代码和创建必要目录
COPY scripts/localFileServer.js ./scripts/
RUN mkdir -p uploads
RUN mkdir -p logs

# 创建非root用户
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 设置正确的目录权限
RUN chown -R appuser:appgroup /app
RUN chmod 755 /app/logs
RUN chmod 755 /app/uploads

# 切换到非root用户
USER appuser

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:13001/health || exit 1

# 设置数据卷
VOLUME ["/app/uploads", "/app/logs"]

# 暴露13001端口
EXPOSE 13001

# 启动文件服务器
CMD ["node", "scripts/localFileServer.js"] 