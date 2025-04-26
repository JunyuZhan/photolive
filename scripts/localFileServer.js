const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const sharp = require('sharp');
const Jimp = require('jimp');
const archiver = require('archiver');
const QRCode = require('qrcode');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// 初始化Express应用
const app = express();
const port = process.env.PORT || 13001;
const uploadsDir = path.join(__dirname, '../uploads');
const logsDir = path.join(__dirname, '../logs');

// 确保目录存在
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`创建上传目录: ${uploadsDir}`);
  }
  
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`创建日志目录: ${logsDir}`);
  }
} catch (err) {
  console.error('创建目录时出错:', err);
}

// 初始化数据库连接池 - 有错误处理机制
let pool;
let dbConnected = false;

try {
  pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
    ssl: { rejectUnauthorized: false } // Supabase 需要 SSL
  });

  // 测试数据库连接
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('数据库连接失败:', err);
      console.log('请检查您的网络是否支持IPv6连接，Supabase需要IPv6支持');
      dbConnected = false;
    } else {
      console.log('数据库连接成功:', res.rows[0]);
      dbConnected = true;
    }
  });
  
  // 设置连接错误处理
  pool.on('error', (err) => {
    console.error('数据库连接池错误:', err);
    dbConnected = false;
  });
} catch (err) {
  console.error('初始化数据库连接池时出错:', err);
  dbConnected = false;
}

// 安全数据库查询函数
async function safeQuery(query, params = []) {
  if (!pool || !dbConnected) {
    console.warn('数据库未连接，跳过查询:', query);
    return { rows: [] };
  }
  
  try {
    return await pool.query(query, params);
  } catch (err) {
    console.error('数据库查询错误:', err, '查询:', query, '参数:', params);
    return { rows: [] };
  }
}

// 安全文件写入函数
function safeAppendFile(filePath, data) {
  try {
    fs.appendFileSync(filePath, data);
  } catch (err) {
    console.error(`无法写入文件 ${filePath}:`, err);
  }
}

// 中间件配置
app.use(cors({
  origin: '*', // 允许所有域名访问，包括 Vercel 域名
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 添加请求体解析中间件
app.use(express.json()); // 解析JSON请求体
app.use(express.urlencoded({ extended: true })); // 解析URL编码的请求体

// 调试中间件 - 记录所有请求、请求体和路径
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.originalUrl}`);
  if (req.method === 'POST') {
    console.log(`[DEBUG] Content-Type: ${req.headers['content-type']}`);
    if (req.headers['content-type'] && !req.headers['content-type'].includes('multipart/form-data')) {
      console.log(`[DEBUG] 请求体:`, req.body);
    } else {
      console.log(`[DEBUG] 文件上传请求，请求体已省略`);
    }
  }
  next();
});

// 尝试设置文件日志，失败则只使用控制台日志
try {
  const accessLogStream = fs.createWriteStream(path.join(__dirname, '../logs/server.log'), { flags: 'a' });
  app.use(morgan('common', { stream: accessLogStream }));
} catch (err) {
  console.warn('无法写入日志文件，将只使用控制台日志:', err);
}
app.use(morgan('dev'));

// 错误处理中间件
const errorHandler = (err, req, res, next) => {
  console.error('错误:', err.stack);
  safeAppendFile(
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
    safeAppendFile(path.join(__dirname, '../logs/access.log'), log);
  });
  next();
});

// 设置静态文件目录，用于提供照片访问
app.use('/photos', express.static(path.join(__dirname, '../uploads')));

// 配置文件存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      let reqPath = req.body?.path;
      // 处理path可能是数组的情况
      if (Array.isArray(reqPath)) {
        reqPath = reqPath[0];
      }
      if (!reqPath) {
        const userId = req.body?.user_id || 'anonymous';
        const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        reqPath = `${userId}/${fileName}`;
      }
      reqPath = String(reqPath);
      req.body.path = reqPath; // 保证全流程都是字符串

      const userId = reqPath.split('/')[0] || 'anonymous';
      const uploadPath = path.join(__dirname, '../uploads', userId);

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: function (req, file, cb) {
    try {
      let reqPath = req.body?.path;
      if (Array.isArray(reqPath)) {
        reqPath = reqPath[0];
      }
      if (!reqPath) {
        cb(null, `${Date.now()}-${file.originalname}`);
        return;
      }
      reqPath = String(reqPath);
      req.body.path = reqPath; // 保证全流程都是字符串
      const pathParts = reqPath.split('/');
      const fileName = pathParts.length > 1 ? pathParts[1] : `${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    } catch (err) {
      cb(err);
    }
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: process.env.FILE_SIZE_LIMIT ? parseInt(process.env.FILE_SIZE_LIMIT) : 10 * 1024 * 1024, // 默认10MB
  },
  fileFilter: function (req, file, cb) {
    // 只允许图片文件
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('只允许上传图片文件'));
    }
    cb(null, true);
  }
});

// 添加一个预处理中间件，在处理文件上传前记录请求信息
app.use('/upload', (req, res, next) => {
  if (req.method === 'POST') {
    console.log(`[UPLOAD] 接收到上传请求，headers:`, {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      'origin': req.headers['origin']
    });
  }
  next();
});

// 专用的上传端点，添加更详细的错误处理和调试信息
app.post('/upload', (req, res) => {
  console.log('[UPLOAD] 开始处理上传请求');
  
  // 手动处理文件上传
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('[UPLOAD] 上传处理错误:', err);
      return res.status(500).json({ 
        success: false, 
        error: '文件上传处理失败', 
        message: err.message,
        code: err.code || 'UNKNOWN'
      });
    }
    
    // 如果没有文件被上传
    if (!req.file) {
      console.log('[UPLOAD] 未接收到文件');
      return res.status(400).json({ success: false, error: '未接收到文件' });
    }
    
    // 调试输出请求体
    console.log('[UPLOAD] 上传成功，req.body:', req.body);
    console.log('[UPLOAD] 上传文件信息:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });
    
    // 处理path可能是数组的情况
    let filePath = req.body.path;
    if (Array.isArray(filePath)) filePath = filePath[0];
    filePath = String(filePath);
    
    try {
      // 处理其他字段可能是数组的情况
      let album_id = req.body.album_id;
      if (Array.isArray(album_id)) album_id = album_id[0];
      
      let username = req.body.username;
      if (Array.isArray(username)) username = username[0];
      
      // 生成目标路径
      const userId = filePath.split('/')[0];
      console.log(`[UPLOAD] 解析后的userId: ${userId}`);
      
      const destPath = path.join(uploadsDir, filePath);
      console.log(`[UPLOAD] 目标路径: ${destPath}`);
      
      // 确保目标目录存在
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        console.log(`[UPLOAD] 创建目标目录: ${destDir}`);
      }
      
      // 简单处理：直接移动文件
      fs.copyFileSync(req.file.path, destPath);
      console.log(`[UPLOAD] 文件已复制到: ${destPath}`);
      fs.unlinkSync(req.file.path);
      console.log(`[UPLOAD] 临时文件已删除: ${req.file.path}`);
      
      // 构建文件URL
      const fileUrl = req.protocol + '://' + req.get('host') + '/photos/' + filePath;
      // 如果设置了SERVER_URL环境变量，则使用它构建URL
      const serverUrl = process.env.SERVER_URL || '';
      const publicUrl = serverUrl ? serverUrl + '/photos/' + filePath : fileUrl;
      
      // 返回成功响应
      console.log(`[UPLOAD] 上传成功，返回响应`);
      res.json({
        success: true,
        filePath,
        url: publicUrl,
        fileInfo: {
          size: req.file.size,
          uploadedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('[UPLOAD] 处理上传文件时出错:', error);
      res.status(500).json({ 
        success: false, 
        error: '处理上传文件时出错', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
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
      freeSpace: '获取中...', // 实际生产环境中可以使用磁盘检查工具
      databaseConnected: dbConnected
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

// 健康检查端点
app.get('/health', (req, res) => {
  // 检查数据库连接
  if (pool && dbConnected) {
    pool.query('SELECT 1', (err, result) => {
      if (err) {
        console.error('健康检查失败 - 数据库连接错误:', err);
        dbConnected = false;
        
        // 获取服务器状态信息
        const diagnostics = getServerDiagnostics();
        
        return res.status(200).json({  // 返回200但指示数据库问题
          status: 'warning',
          message: '服务正常运行，但数据库连接失败',
          database: {
            connected: false,
            error: process.env.NODE_ENV === 'development' ? err.message : '数据库连接失败',
            host: process.env.PGHOST || '未配置'
          },
          timestamp: new Date().toISOString(),
          diagnostics: diagnostics
        });
      }
      
      // 检查存储目录是否可写
      try {
        const testFile = path.join(uploadsDir, '.health-check-' + Date.now());
        fs.writeFileSync(testFile, 'health check');
        fs.unlinkSync(testFile);
      } catch (err) {
        console.error('健康检查失败 - 存储目录不可写:', err);
        
        // 获取服务器状态信息
        const diagnostics = getServerDiagnostics();
        
        return res.status(200).json({  // 返回200但指示存储问题
          status: 'warning',
          message: '服务正常运行，但存储目录不可写',
          database: { connected: dbConnected },
          timestamp: new Date().toISOString(),
          storage: {
            error: '存储目录不可写',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
          },
          diagnostics: diagnostics
        });
      }
      
      // 获取服务器状态信息
      const diagnostics = getServerDiagnostics();
      
      // 所有检查通过
      res.status(200).json({
        status: 'ok',
        message: '服务正常运行',
        version: process.env.npm_package_version || '0.1.0',
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          host: process.env.PGHOST ? process.env.PGHOST.replace(/\..*/, '.****.co') : 'unknown'
        },
        storage: diagnostics.storage,
        memory: diagnostics.memory,
        diagnostics: diagnostics
      });
    });
  } else {
    // 获取服务器状态信息
    const diagnostics = getServerDiagnostics();
    
    // 数据库未连接，但服务仍可运行
    return res.status(200).json({
      status: 'warning',
      message: '服务正常运行，但数据库未连接',
      database: { 
        connected: false,
        host: process.env.PGHOST || '未配置'
      },
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      diagnostics: diagnostics
    });
  }
});

// 诊断函数，收集系统状态
function getServerDiagnostics() {
  // 内存使用情况
  const memoryUsage = process.memoryUsage();
  const uptimeHours = Math.floor(process.uptime() / 3600);
  const uptimeMinutes = Math.floor((process.uptime() % 3600) / 60);
  
  // 存储信息
  let storageInfo = {};
  try {
    // 检查uploads目录用户数量
    const users = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir).filter(item => {
      return fs.statSync(path.join(uploadsDir, item)).isDirectory();
    }) : [];
    
    storageInfo = {
      usersCount: users.length,
      uploadsDir: uploadsDir,
      dirExists: fs.existsSync(uploadsDir),
      dirWritable: true
    };
    
    // 测试目录可写性
    try {
      const testFile = path.join(uploadsDir, '.health-check-' + Date.now());
      fs.writeFileSync(testFile, 'health check');
      fs.unlinkSync(testFile);
    } catch (err) {
      storageInfo.dirWritable = false;
      storageInfo.writeError = err.message;
    }
  } catch (err) {
    storageInfo = { error: 'Failed to get storage info', message: err.message };
  }
  
  // 环境配置
  const envInfo = {
    NODE_ENV: process.env.NODE_ENV || 'undefined',
    PORT: process.env.PORT || '13001',
    PGHOST_SET: process.env.PGHOST ? true : false,
    PGUSER_SET: process.env.PGUSER ? true : false,
    PGDATABASE_SET: process.env.PGDATABASE ? true : false,
    SERVER_URL: process.env.SERVER_URL || '未配置'
  };
  
  // 上传配置状态
  const uploadConfig = {
    maxFileSize: upload.limits.fileSize || 10485760,
    allowedFileTypes: '*.jpg, *.jpeg, *.png, *.gif',
    uploadsDirectoryStatus: storageInfo.dirWritable ? 'OK' : 'ERROR'
  };
  
  return {
    uptime: `${uptimeHours}小时${uptimeMinutes}分钟`,
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
    },
    storage: storageInfo,
    environment: envInfo,
    uploadConfig: uploadConfig
  };
}

// 批量下载接口 - 安全处理数据库连接
app.post('/download-zip', async (req, res) => {
  try {
    const { photo_ids, user_id, username, watermark_type, watermark_template } = req.body;
    if (!Array.isArray(photo_ids) || photo_ids.length === 0) {
      return res.status(400).json({ success: false, error: '参数错误' });
    }
    
    // 查询数据库获取图片路径 - 安全查询
    let photos = [];
    
    if (dbConnected) {
      // 只在数据库连接正常时执行
      const { rows } = await safeQuery('SELECT id, image_path FROM photos WHERE id = ANY($1)', [photo_ids]);
      photos = rows;
      
      // 计数+日志 - 安全查询
      await safeQuery('UPDATE photos SET download_count = download_count + 1 WHERE id = ANY($1)', [photo_ids]);
      
      for (const photo_id of photo_ids) {
        await safeQuery(
          'INSERT INTO operation_logs (user_id, photo_id, action) VALUES ($1, $2, $3)',
          [user_id || null, photo_id, 'download']
        );
      }
    }
    
    // 如果未连接数据库或未找到照片，返回错误
    if (photos.length === 0) {
      return res.status(404).json({ success: false, error: '未找到照片' });
    }
    
    // 创建zip流
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="photos.zip"');
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    const now = new Date();
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
    
    function renderTemplate(str, ctx) {
      return str.replace(/\{(\w+)\}/g, (_, k) => ctx[k] || '');
    }
    
    for (const photo of photos) {
      const filePath = path.join(uploadsDir, photo.image_path);
      if (!fs.existsSync(filePath)) continue;
      let outBuffer = fs.readFileSync(filePath);
      // 动态水印处理
      if (watermark_type === 'dynamic_text' && watermark_template) {
        const ctx = {
          username: username || '用户',
          datetime: now.toLocaleString(),
          ip: ip.toString(),
          photo_id: photo.id
        };
        const text = renderTemplate(watermark_template, ctx);
        const font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
        const textImage = new Jimp(400, 30, 0x00000000);
        textImage.print(font, 0, 0, text);
        const textBuffer = await textImage.getBufferAsync(Jimp.MIME_PNG);
        outBuffer = await sharp(outBuffer).composite([
          {
            input: textBuffer,
            gravity: 'southeast',
            blend: 'over',
            opacity: 0.7
          }
        ]).toBuffer();
      } else if (watermark_type === 'dynamic_qrcode' && watermark_template) {
        const ctx = {
          username: username || '用户',
          datetime: now.toLocaleString(),
          ip: ip.toString(),
          photo_id: photo.id
        };
        const qrContent = renderTemplate(watermark_template, ctx);
        const qrBuffer = await QRCode.toBuffer(qrContent, { type: 'png', width: 100, margin: 1 });
        outBuffer = await sharp(outBuffer).composite([
          {
            input: qrBuffer,
            gravity: 'southeast',
            blend: 'over',
            opacity: 0.7
          }
        ]).toBuffer();
      }
      archive.append(outBuffer, { name: path.basename(filePath) });
    }
    archive.finalize();
    archive.on('error', err => {
      res.status(500).json({ success: false, error: err.message });
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 照片编辑接口 - 安全处理数据库连接
app.post('/photos/edit', express.json(), async (req, res) => {
  try {
    const { photo_id, edit_type, edit_params, save_as_new } = req.body;
    if (!photo_id || !edit_type) {
      return res.status(400).json({ success: false, error: '参数缺失' });
    }
    
    // 查询原图路径 - 安全查询
    let photo = null;
    if (dbConnected) {
      const { rows } = await safeQuery('SELECT * FROM photos WHERE id = $1', [photo_id]);
      photo = rows[0];
    }
    
    if (!photo) {
      return res.status(404).json({ success: false, error: '照片不存在或数据库未连接' });
    }
    
    const filePath = path.join(uploadsDir, photo.image_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: '文件不存在' });
    }
    
    let image = sharp(filePath);
    // 编辑操作
    if (edit_type === 'crop') {
      const { left, top, width, height } = edit_params;
      image = image.extract({ left, top, width, height });
    } else if (edit_type === 'rotate') {
      image = image.rotate(edit_params.angle || 0);
    } else if (edit_type === 'resize') {
      image = image.resize(edit_params.width, edit_params.height);
    } else if (edit_type === 'grayscale') {
      image = image.grayscale();
    } else if (edit_type === 'blur') {
      image = image.blur(edit_params.sigma || 2);
    } else if (edit_type === 'brightness') {
      image = image.modulate({ brightness: edit_params.brightness || 1 });
    }
    
    // 输出路径
    let outPath, outFileName;
    if (save_as_new) {
      outFileName = uuidv4() + path.extname(photo.image_path);
      outPath = path.join(uploadsDir, photo.user_id, outFileName);
    } else {
      outFileName = path.basename(photo.image_path);
      outPath = filePath;
    }
    
    await image.toFile(outPath);
    
    // 如另存为新图，写入数据库 - 安全查询
    if (save_as_new && dbConnected) {
      const newId = uuidv4();
      await safeQuery(
        'INSERT INTO photos (id, user_id, title, description, image_path, created_at, taken_at, is_public, tags, photographer) VALUES ($1,$2,$3,$4,$5,now(),$6,$7,$8,$9)',
        [newId, photo.user_id, photo.title, photo.description, `${photo.user_id}/${outFileName}`, photo.taken_at, photo.is_public, photo.tags, photo.photographer]
      );
      return res.json({ success: true, new_photo_id: newId, image_path: `${photo.user_id}/${outFileName}` });
    }
    
    res.json({ success: true, image_path: photo.image_path });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 全局错误处理
app.use(errorHandler);

// 捕获未处理的异常
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  safeAppendFile(
    path.join(__dirname, '../logs/error.log'), 
    `${new Date().toISOString()} - 未捕获的异常: ${err.stack}\n`
  );
});

// 捕获未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  safeAppendFile(
    path.join(__dirname, '../logs/error.log'), 
    `${new Date().toISOString()} - 未处理的Promise拒绝: ${reason}\n`
  );
});

// 启动服务器
app.listen(port, '0.0.0.0', () => {
  console.log(`文件服务器运行在 http://156.225.24.235:${port}`);
  console.log(`照片存储目录: ${uploadsDir}`);
  if (!dbConnected) {
    console.warn('警告: 数据库未连接，部分功能将不可用');
  }
}); 