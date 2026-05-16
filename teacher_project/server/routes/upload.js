const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()

// ========== 图片上传配置 ==========

// 上传目录
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'images')

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR)
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名：时间戳 + 随机数 + 原始扩展名
    const ext = path.extname(file.originalname).toLowerCase()
    const name = Date.now() + '-' + Math.random().toString(36).substring(2, 8) + ext
    cb(null, name)
  }
})

// 文件类型过滤
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowedTypes.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error('不支持的图片格式，支持：JPG/PNG/GIF/WEBP/BMP/SVG'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制 5MB
  }
})

// POST /api/upload/image - 上传图片
router.post('/upload/image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, message: '请选择要上传的图片' })
    }

    // 构造可访问的 URL
    const imageUrl = '/uploads/images/' + req.file.filename

    res.json({
      success: true,
      data: {
        url: imageUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      message: '图片上传成功'
    })
  } catch (err) {
    console.error('图片上传失败:', err)
    res.status(500).json({ success: false, message: '图片上传失败：' + err.message })
  }
})

module.exports = router
