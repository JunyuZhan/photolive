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

// 1. 文件上传接口（支持相册级水印）
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未接收到文件' });
    }
    const { path: filePath, album_id, username } = req.body;
    const destPath = path.join(uploadsDir, filePath);

    // 1. 查询相册水印参数
    let album = null;
    if (album_id) {
      const { rows } = await pool.query(
        'SELECT watermark_type, watermark_text, watermark_image, watermark_opacity, watermark_position, name FROM albums WHERE id = $1',
        [album_id]
      );
      album = rows[0];
    }

    // 2. 处理水印
    let image = sharp(req.file.path);
    let compositeOptions = [];

    // 模板变量渲染
    function renderTemplate(str, ctx) {
      return str.replace(/\{(\w+)\}/g, (_, k) => ctx[k] || '');
    }
    const now = new Date();
    const ctx = {
      username: username || '用户',
      datetime: now.toLocaleString(),
      album: album ? album.name : ''
    };

    if (album && album.watermark_type === 'text' && album.watermark_text) {
      // 支持模板变量
      const text = renderTemplate(album.watermark_text, ctx);
      const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
      const textImage = new Jimp(400, 60, 0x00000000); // 透明底
      textImage.print(font, 0, 0, text);
      const textBuffer = await textImage.getBufferAsync(Jimp.MIME_PNG);
      compositeOptions.push({
        input: textBuffer,
        gravity: album.watermark_position || 'southeast',
        blend: 'over',
        opacity: album.watermark_opacity || 0.5
      });
    } else if (album && album.watermark_type === 'image' && album.watermark_image) {
      compositeOptions.push({
        input: path.join(uploadsDir, album.watermark_image),
        gravity: album.watermark_position || 'southeast',
        blend: 'over',
        opacity: album.watermark_opacity || 0.5
      });
    } else if (album && album.watermark_type === 'qrcode') {
      // 生成二维码水印，内容为外链或自定义
      const qrContent = renderTemplate(album.watermark_text || '', ctx) || `https://yourdomain.com/photos/${filePath}`;
      const qrBuffer = await QRCode.toBuffer(qrContent, { type: 'png', width: 120, margin: 1 });
      compositeOptions.push({
        input: qrBuffer,
        gravity: album.watermark_position || 'southeast',
        blend: 'over',
        opacity: album.watermark_opacity || 0.7
      });
    }

    let outputBuffer;
    if (compositeOptions.length > 0) {
      outputBuffer = await image.composite(compositeOptions).toBuffer();
    } else {
      outputBuffer = await image.toBuffer();
    }

    fs.writeFileSync(destPath, outputBuffer);
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      filePath,
      fileInfo: {
        size: outputBuffer.length,
        uploadedAt: new Date().toISOString()
      }
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

// 批量下载接口
app.post('/download-zip', async (req, res) => {
  try {
    const { photo_ids, user_id, username, watermark_type, watermark_template } = req.body;
    if (!Array.isArray(photo_ids) || photo_ids.length === 0) {
      return res.status(400).json({ success: false, error: '参数错误' });
    }
    // 查询数据库获取图片路径
    const pool = new Pool({
      user: process.env.PGUSER,
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      password: process.env.PGPASSWORD,
      port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
    });
    const { rows } = await pool.query('SELECT id, image_path FROM photos WHERE id = ANY($1)', [photo_ids]);
    // 计数+日志
    await pool.query('UPDATE photos SET download_count = download_count + 1 WHERE id = ANY($1)', [photo_ids]);
    for (const photo_id of photo_ids) {
      await pool.query(
        'INSERT INTO operation_logs (user_id, photo_id, action) VALUES ($1, $2, $3)',
        [user_id || null, photo_id, 'download']
      );
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
    for (const photo of rows) {
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

// 照片编辑接口
app.post('/photos/edit', async (req, res) => {
  try {
    const { photo_id, edit_type, edit_params, save_as_new } = req.body;
    if (!photo_id || !edit_type) {
      return res.status(400).json({ success: false, error: '参数缺失' });
    }
    // 查询原图路径
    const pool = new Pool({
      user: process.env.PGUSER,
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      password: process.env.PGPASSWORD,
      port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
    });
    const { rows } = await pool.query('SELECT * FROM photos WHERE id = $1', [photo_id]);
    if (!rows[0]) return res.status(404).json({ success: false, error: '照片不存在' });
    const photo = rows[0];
    const filePath = path.join(uploadsDir, photo.image_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: '文件不存在' });
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
    // 如另存为新图，写入数据库
    if (save_as_new) {
      const newId = uuidv4();
      await pool.query(
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

// 启动服务器
app.listen(port, '0.0.0.0', () => {
  console.log(`本地文件服务器运行在 http://localhost:${port}`);
  console.log(`照片存储目录: ${uploadsDir}`);
});

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
  // ssl: { rejectUnauthorized: false } // 如果用 Supabase，通常需要加上
}); 