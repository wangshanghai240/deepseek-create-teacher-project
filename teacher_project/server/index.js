// Node.js 服务器主入口文件

// 创建 Express 应用实例
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcryptjs = require('bcryptjs');
const mysql = require('mysql2/promise'); // 直接使用 mysql2，不通过 createPool

// Express 4.18+ 内置了 JSON 和 URL-encoded body parser，无需额外安装 body-parser
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const uploadRoutes = require('./routes/upload');
const newsRoutes = require('./routes/news');

// 创建应用实例（必须在使用 express() 之前）
const app = express();
const PORT = process.env.PORT || 5000; // 后端端口改为 5000

// 中间件配置
app.use(cors()); // 启用 CORS，允许跨域请求
app.use(express.json()); // 解析 JSON 请求体
app.use(express.urlencoded({ extended: true })); // 解析 URL-encoded 请求体

// ========== 生产环境：托管前端静态文件 ==========
const isProduction = process.env.NODE_ENV === 'production'
const frontendDist = path.join(__dirname, '..', 'vue-app', 'dist')
if (isProduction) {
  app.use(express.static(frontendDist))
  console.log('✓ 生产模式：前端静态文件已加载')
}

// 静态文件服务 - 允许访问上传的图片
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API 路由挂载
app.use('/api', authRoutes);
app.use('/api', postRoutes);
app.use('/api', uploadRoutes);
app.use('/api', newsRoutes);

// 健康检查接口
app.get('/', (req, res) => {
  res.json({ 
    message: 'Teacher Management System API',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========== 生产环境：处理前端路由（SPA 回退） ==========
if (isProduction) {
  const fs = require('fs')
  const indexPath = path.join(frontendDist, 'index.html')
  app.get('*', (req, res, next) => {
    // 仅对非 API 请求返回前端页面
    if (!req.path.startsWith('/api')) {
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath)
      }
    }
    next()
  })
}

// 404 处理 - 未找到的路由
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: '接口不存在' 
  });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    success: false, 
    message: '服务器内部错误：' + err.message 
  });
});

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    const pool = mysql.createPool({
      host: 'mysql.sqlpub.com',
      port: 3306,
      user: 'wangshanghai',
      password: 'TZw5UYxoPEhwNAM3',
      database: 'wang_tom'
    });

    await pool.getConnection().then(connection => {
      console.log('✓ MySQL 数据库连接成功');
      connection.release();
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log('========================================');
      console.log(`✓ 服务器已启动`);
      console.log(`📍 地址：http://localhost:${PORT}`);
      console.log(`🔐 登录接口：POST http://localhost:${PORT}/api/login`);
      console.log(`📝 注册接口：POST http://localhost:${PORT}/api/register`);
      if (isProduction) {
        console.log(`🌐 前端页面：http://localhost:${PORT}`);
        console.log(`💡 如需外网访问，请在服务器防火墙开放端口 ${PORT}`);
      }
      console.log('========================================');

      // 启动新闻定时同步（每 30 分钟从 CCTV 获取最新新闻，最多保留 30 条）
      const { startNewsSync } = require('./sync_news');
      startNewsSync(true);
    });
  } catch (error) {
    console.error('服务器启动失败:', error.message);
    process.exit(1);
  }
};

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise 拒绝:', reason);
});

startServer();

module.exports = app; // 导出应用实例，便于测试