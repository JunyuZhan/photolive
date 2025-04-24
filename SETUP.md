# PhotoLive 设置指南

## 管理员账户设置

要管理这个照片库，您需要先创建一个管理员账户。以下是详细步骤：

### 方法一：通过 Supabase 控制台创建用户

1. 进入 [Supabase 控制台](https://app.supabase.com)
2. 选择您的项目
3. 点击左侧导航栏的 "Authentication"
4. 选择 "Users" 标签页
5. 点击 "Add User" 按钮
6. 填写邮箱和密码，创建一个新用户
7. 创建后，该用户可以用于登录您的应用

### 方法二：打开浏览器控制台创建用户

如果您已经部署了应用程序，您也可以通过浏览器控制台创建用户：

1. 打开您的应用网站
2. 按 F12 打开浏览器开发者工具
3. 在控制台 (Console) 标签中输入以下代码：

```javascript
// 替换为您想使用的电子邮件和密码
const email = "admin@example.com";
const password = "your-secure-password";

// 导入 Supabase 客户端
const { supabase } = await import('/lib/supabase.js');

// 创建用户
const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password
});

// 显示结果
console.log("注册结果:", data, error);
```

4. 如果成功，您将看到一个响应对象，其中包含创建的用户信息

### 登录您的应用

1. 在应用页面上，点击右上角的 "管理员登录" 按钮
2. 输入您刚才创建的电子邮件和密码
3. 登录成功后，您将能够访问上传照片的功能

## 存储桶设置

要确保应用程序正常工作，您需要在 Supabase 中创建一个存储桶：

1. 在 Supabase 控制台中，点击左侧导航栏中的 "Storage"
2. 点击 "Create a new bucket" 按钮
3. 命名为 "photos"
4. 在 "Public access" 选项中选择 "Public read access for all users"
5. 点击 "Create bucket" 创建存储桶

## 上传和管理照片

登录后，您可以：

1. 点击 "上传照片" 按钮添加新照片
2. 为每张照片添加标题和描述
3. 上传完成后，照片将自动显示在主页上

注意：所有照片默认设置为公开，未登录用户也可以查看，但只有管理员可以上传照片。 