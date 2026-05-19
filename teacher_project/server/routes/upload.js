const express = require('express')
const multer = require('multer')
const axios = require('axios')
const { BASE_URL, ANON_KEY } = require('../config/insforge')
const router = express.Router()

// ========== 图片上传配置 ==========

// 使用内存存储，直接上传到 InsForge Storage
const storage = multer.memoryStorage()

// 文件类型过滤
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
  const ext = '.' + file.originalname.split('.').pop().toLowerCase()
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

// POST /api/upload/image - 上传图片到 InsForge Storage
router.post('/upload/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, message: '请选择要上传的图片' })
    }

    // 上传到 InsForge Storage
    const fileName = Date.now() + '-' + Math.random().toString(36).substring(2, 8) + '.' + req.file.originalname.split('.').pop()

    // Use Buffer directly via axios
    const response = await axios.put(
      `${BASE_URL}/api/storage/buckets/images/objects/${fileName}`,
      req.file.buffer,
      {
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': req.file.mimetype
        },
        timeout: 30000,
        maxBodyLength: 10 * 1024 * 1024
      }
    )

    const imageUrl = `${BASE_URL}/api/storage/buckets/images/objects/${fileName}`

    res.json({
      success: true,
      data: {
        url: imageUrl,
        filename: fileName,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      message: '图片上传成功'
    })
  } catch (err) {
    console.error('图片上传失败:', err.response?.data || err.message)
    res.status(500).json({ success: false, message: '图片上传失败：' + err.message })
  }
})

module.exports = router
