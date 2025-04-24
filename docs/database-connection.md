# Supabase数据库连接问题排查指南

当遇到"无法连接数据库"错误时，可能有以下原因和解决方案：

## 常见问题

### 1. Supabase项目不存在或URL已变更

**症状**:
- `TypeError: fetch failed`
- `getaddrinfo ENOTFOUND`错误
- 浏览器无法访问Supabase项目URL

**解决方案**:
1. 创建新的Supabase项目:
   - 访问 https://app.supabase.com 创建新项目
   - 进入项目设置 -> API，复制URL和anon key
   - 用新值更新`lib/supabase.ts`文件

2. 运行数据库初始化脚本:
   - 登录Supabase控制台
   - 转到SQL编辑器
   - 运行项目根目录中的SQL脚本
   - 确保创建`photos`存储桶

### 2. 网络连接问题

**症状**:
- 无法访问Supabase网站
- DNS解析失败
- 防火墙错误

**解决方案**:
1. 检查网络连接:
   - 确认可以访问其他网站
   - 检查防火墙设置
   - 尝试使用不同的网络

2. 代理设置:
   ```
   // 如果在Node.js中使用HTTP代理
   export HTTP_PROXY=http://your-proxy-server:port
   export HTTPS_PROXY=http://your-proxy-server:port
   ```

### 3. 环境变量配置问题

**症状**:
- 应用可以启动但无法连接到数据库

**解决方案**:
1. 检查`lib/supabase.ts`文件:
   - 确保URL包含`https://`前缀
   - 确保密钥格式正确

2. 创建`.env.local`文件(可选):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## 如何测试连接

通过运行以下测试脚本可以排除网络问题:

```bash
# 测试网络连接
node scripts/test-network.js

# 测试数据库连接
node scripts/test-db-connection.js
```

## 完整设置流程

如果需要重新设置项目，请按照以下步骤操作:

1. 创建新的Supabase项目
2. 运行SQL初始化脚本创建表和策略
3. 创建名为`photos`的存储桶
4. 设置适当的存储权限
5. 更新`lib/supabase.ts`中的配置
6. 重启应用程序

如果以上步骤都不能解决问题，请确认您的Supabase计划是否有效，或联系Supabase支持团队寻求帮助。 