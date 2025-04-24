const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

// 初始化Express应用
const app = express();
const port = 13001;
const uploadsDir = path.join(__dirname, '../uploads');

// 确保上传目录存在
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(morgan('common', {
  stream: fs.createWriteStream(path.join(__dirname, '../logs/server.log'), { flags: 'a' })
}));
app.use(morgan('dev'));

// 创建logs目录
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 错误处理中间件
const errorHandler = (err, req, res, next) => {
  console.error('错误:', err.stack);
  fs.appendFileSync(
    path.join(__dirname, '../logs/error.log'), 
    `${new Date().toISOString()} - ${err.stack}\n`
  );
  res.status(500).json({ 
    success: false, 
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// 路由日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = `${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms\n`;
    fs.appendFileSync(path.join(__dirname, '../logs/access.log'), log);
  });
  next();
});

// 设置静态文件目录，用于提供照片访问
app.use('/photos', express.static(path.join(__dirname, '../uploads')));

// 配置文件存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 根据用户ID创建目录
    const userId = req.body.path.split('/')[0];
    const uploadPath = path.join(__dirname, '../uploads', userId);
    
    // 确保目录存在
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // 使用传入的文件名
    const fileName = req.body.path.split('/')[1];
    cb(null, fileName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 限制10MB
  },
  fileFilter: function (req, file, cb) {
    // 只允许图片文件
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('只允许上传图片文件'));
    }
    cb(null, true);
  }
});

// API路由

// 1. 文件上传接口
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未接收到文件' });
    }
    
    // 记录上传信息
    const fileInfo = {
      filePath: req.body.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      filePath: req.body.path,
      fileInfo
    });
  } catch (error) {
    console.error('上传错误:', error);
    res.status(500).json({ success: false, error: '文件上传失败', message: error.message });
  }
});

// 2. 文件删除接口
app.delete('/photos/:userId/:fileName', (req, res) => {
  try {
    const { userId, fileName } = req.params;
    const filePath = path.join(uploadsDir, userId, fileName);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: '文件不存在' });
    }
    
    // 删除文件
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: '文件已成功删除'
    });
  } catch (error) {
    console.error('删除错误:', error);
    res.status(500).json({ success: false, error: '文件删除失败', message: error.message });
  }
});

// 3. 获取单个文件信息
app.get('/info/:userId/:fileName', (req, res) => {
  try {
    const { userId, fileName } = req.params;
    const filePath = path.join(uploadsDir, userId, fileName);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: '文件不存在' });
    }
    
    // 获取文件信息
    const stats = fs.statSync(filePath);
    
    res.json({
      success: true,
      fileInfo: {
        path: `${userId}/${fileName}`,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        url: `${req.protocol}://${req.get('host')}/photos/${userId}/${fileName}`
      }
    });
  } catch (error) {
    console.error('获取文件信息错误:', error);
    res.status(500).json({ success: false, error: '获取文件信息失败', message: error.message });
  }
});

// 4. 获取用户所有文件
app.get('/files/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userDir = path.join(uploadsDir, userId);
    
    // 检查用户目录是否存在
    if (!fs.existsSync(userDir)) {
      return res.json({ success: true, files: [] });
    }
    
    // 获取目录下所有文件
    const files = fs.readdirSync(userDir)
      .filter(file => {
        const filePath = path.join(userDir, file);
        return fs.statSync(filePath).isFile();
      })
      .map(file => {
        const filePath = path.join(userDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          name: file,
          path: `${userId}/${file}`,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          url: `${req.protocol}://${req.get('host')}/photos/${userId}/${file}`
        };
      });
    
    res.json({
      success: true,
      files
    });
  } catch (error) {
    console.error('获取文件列表错误:', error);
    res.status(500).json({ success: false, error: '获取文件列表失败', message: error.message });
  }
});

// 5. 服务器状态接口
app.get('/status', (req, res) => {
  try {
    // 获取服务器状态信息
    const status = {
      uptime: process.uptime(),
      timestamp: Date.now(),
      storageDirectory: uploadsDir,
      freeSpace: '获取中...' // 实际生产环境中可以使用磁盘检查工具
    };
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('获取服务器状态错误:', error);
    res.status(500).json({ success: false, error: '获取服务器状态失败', message: error.message });
  }
});

// 全局错误处理
app.use(errorHandler);

// 启动服务器
app.listen(port, '0.0.0.0', () => {
  console.log(`本地文件服务器运行在 http://localhost:${port}`);
  console.log(`照片存储目录: ${uploadsDir}`);
}); 