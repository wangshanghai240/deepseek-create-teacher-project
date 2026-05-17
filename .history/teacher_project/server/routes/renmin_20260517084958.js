const express = require('express');
const axios = require('axios');
const router = express.Router();

// 人民日报文章列表（前端直接调用，不存数据库）
router.get('/renmin', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;

    // 尝试从 peopleapp.com 获取人民日报内容
    // feed_id=130 对应人民日报
    const url = `https://peopleapp.com/api/v2/feed/list?feed_id=130&page=${page}&page_size=${pageSize}`;
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://peopleapp.com/'
      }
    });

    // 解析响应数据
    const result = response.data;
    let articles = [];

    if (result && result.data && Array.isArray(result.data)) {
      // 标准格式
      articles = result.data.map(item => ({
        id: item.id || '',
        title: item.title || item.content_text || '',
        summary: item.summary || item.description || '',
        image: item.image_url || item.cover_url || (item.images && item.images[0]) || '',
        time: item.create_time || item.publish_time || item.ctime || '',
        source: item.source_name || '人民日报',
        url: item.share_url || item.url || item.article_url || ''
      }));
    } else if (Array.isArray(result)) {
      articles = result.map(item => ({
        id: item.id || '',
        title: item.title || '',
        summary: item.summary || item.content_text || '',
        image: item.image_url || item.cover_url || '',
        time: item.create_time || item.publish_time || '',
        source: item.source_name || '人民日报',
        url: item.share_url || item.url || ''
      }));
    } else if (result && result.result && Array.isArray(result.result)) {
      articles = result.result.map(item => ({
        id: item.id || '',
        title: item.title || '',
        summary: item.summary || item.desc || '',
        image: item.image_url || item.pic || '',
        time: item.create_time || item.time || '',
        source: item.source_name || '人民日报',
        url: item.share_url || item.url || ''
      }));
    }

    // 过滤掉没有标题的数据
    articles = articles.filter(a => a.title);

    res.json({
      success: true,
      data: articles,
      total: articles.length,
      page,
      pageSize
    });
  } catch (err) {
    console.error('人民日报获取失败:', err.message);
    
    // 如果主接口失败，返回错误信息
    res.json({
      success: false,
      message: '获取人民日报文章失败: ' + err.message,
      data: []
    });
  }
});

module.exports = router;
