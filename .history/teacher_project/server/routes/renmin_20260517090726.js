const express = require('express');
const axios = require('axios');
const router = express.Router();

// 从 peopleapp.com 的 NUXT 序列化数据中提取文章
// 数据格式: [["Reactive",1],{data,state,errors,serverRendered,path,pinia},...]
// 这是一种类似"Escape JSON"的序列化格式，所有值通过数组索引引用
function extractArticlesFromNuxt(data) {
  // 第一步：构建一个完整的值映射表，包含所有已解析的值
  const resolvedCache = new Map();

  function resolve(val) {
    if (val === null || val === undefined) return val;
    if (typeof val !== 'number' || val < 0 || val >= data.length) return val;
    if (resolvedCache.has(val)) return resolvedCache.get(val);
    
    const raw = data[val];
    if (raw === null || raw === undefined) return raw;
    
    // 标记正在解析，防止循环引用
    resolvedCache.set(val, null);
    
    let result;
    if (typeof raw === 'string') {
      result = raw;
    } else if (typeof raw === 'boolean' || typeof raw === 'number') {
      result = raw;
    } else if (Array.isArray(raw)) {
      result = raw.map(v => resolve(v));
    } else if (typeof raw === 'object') {
      result = {};
      for (const key of Object.keys(raw)) {
        result[key] = resolve(raw[key]);
      }
    } else {
      result = raw;
    }
    
    resolvedCache.set(val, result);
    return result;
  }

  const articles = [];
  const seenTitles = new Set();

  // 遍历所有数据项，找到文章对象并解析
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      // 检查是否包含文章相关属性
      const keys = Object.keys(item);
      const hasTitle = keys.some(k => k === 'title' || k === 'Title');
      const hasNewsTxt = keys.some(k => k === 'newsTxt' || k === 'news_txt');
      const hasImage = keys.some(k => k === 'image' || k === 'image_url');
      
      if (hasTitle || (hasNewsTxt && keys.length > 3)) {
        try {
          const resolved = resolve(i);
          if (resolved && typeof resolved === 'object' && !Array.isArray(resolved)) {
            const title = typeof resolved.title === 'string' ? resolved.title : 
                         typeof resolved.Title === 'string' ? resolved.Title : '';
            
            if (title && title.length > 5 && !seenTitles.has(title)) {
              seenTitles.add(title);
              
              const newsTxt = typeof resolved.newsTxt === 'string' ? resolved.newsTxt : '';
              const rawImage = resolved.image || resolved.image_url || '';
              const image = typeof rawImage === 'string' ? rawImage : '';
              const shareUrl = typeof resolved.share_url === 'string' ? resolved.share_url : 
                              typeof resolved.url === 'string' ? resolved.url : '';
              const createTime = typeof resolved.create_time === 'string' ? resolved.create_time :
                               typeof resolved.publish_time === 'string' ? resolved.publish_time : '';
              const newsId = resolved.newsId || resolved.relId || resolved.id || i;

              let summary = newsTxt.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
              if (summary.length > 200) summary = summary.substring(0, 200);

              articles.push({
                id: `renmin_${newsId}`,
                title,
                summary: summary || '暂无摘要',
                content: newsTxt || '',
                image: image.startsWith('//') ? 'https:' + image : image,
                time: createTime,
                source: '人民日报',
                url: shareUrl.startsWith('http') ? shareUrl : 
                     (shareUrl ? 'https://www.peopleapp.com' + shareUrl : '')
              });
            }
          }
        } catch (e) {
          // 跳过解析失败的对象
        }
      }
    }
  }

  return articles;
}

// 人民日报文章列表（从 peopleapp.com 获取，不存数据库）
router.get('/renmin', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;

    // 从 peopleapp.com 人民日报频道获取页面（含 NUXT 数据）
    const response = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://www.peopleapp.com/'
      }
    });

    const html = response.data;

    // 提取 NUXT 数据脚本
    const nuxtMatch = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
    if (!nuxtMatch) {
      throw new Error('无法找到文章数据');
    }

    const rawData = JSON.parse(nuxtMatch[1]);
    const allArticles = extractArticlesFromNuxt(rawData);

    // 分页
    const start = (page - 1) * pageSize;
    const paged = allArticles.slice(start, start + pageSize);

    res.json({
      success: true,
      data: paged,
      total: allArticles.length,
      page,
      pageSize
    });
  } catch (err) {
    console.error('人民日报获取失败:', err.message);
    res.json({
      success: false,
      message: '获取人民日报文章失败: ' + err.message,
      data: []
    });
  }
});

module.exports = router;
