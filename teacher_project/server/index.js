// Node.js 服务器主入口文件（已迁移至 InsForge）

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const insforge = require('./config/insforge');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const uploadRoutes = require('./routes/upload');
const newsRoutes = require('./routes/news');
const renminRoutes = require('./routes/renmin');
const cctvRoutes = require('./routes/cctv');

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const isProduction = process.env.NODE_ENV === 'production';
const frontendDist = path.join(__dirname, '..', 'vue-app', 'dist');

// API 路由挂载
app.use('/api', authRoutes);
app.use('/api', postRoutes);
app.use('/api', uploadRoutes);
app.use('/api', newsRoutes);
app.use('/api', renminRoutes);
app.use('/api', cctvRoutes);

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

// ========== 前端静态文件托管（生产/开发通用） ==========
app.use(express.static(frontendDist))

// ========== SPA 历史路由回退 ==========
// 所有非 API、非静态文件的 GET 请求返回 index.html
const fs = require('fs')
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next()
  const ext = path.extname(req.path)
  if (ext) return next()
  const indexPath = path.join(frontendDist, 'index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    next()
  }
})

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
    // 测试 InsForge 数据库连接
    const { data, error } = await insforge.select('teacher_list', { limit: 1 });

    if (error) {
      console.error('✗ InsForge 数据库连接失败:', JSON.stringify(error));
    } else {
      console.log('✓ InsForge 数据库连接成功');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log('========================================');
      console.log(`✓ 服务器已启动（已迁移至 InsForge）`);
      console.log(`📍 地址：http://localhost:${PORT}`);
      console.log(`🔐 登录接口：POST http://localhost:${PORT}/api/login`);
      console.log(`📝 注册接口：POST http://localhost:${PORT}/api/register`);
      if (isProduction) {
        console.log(`🌐 前端页面：http://localhost:${PORT}`);
      }
      console.log('========================================');

      // 启动新闻定时同步
      const { startNewsSync } = require('./sync_news');
      startNewsSync(true);
    });
  } catch (error) {
    console.error('服务器启动失败:', error.message);
    process.exit(1);
  }
};

startServer();

startServer();

module.exports = app; // 导出应用实例，便于测试