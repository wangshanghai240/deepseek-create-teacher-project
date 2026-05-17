const express = require('express');
const axios = require('axios');
const router = express.Router();

// 从 peopleapp.com 的 NUXT 序列化数据中提取文章
// 数据格式: [["Reactive",1],{...},{...}] - 索引引用格式
function extractArticlesFromNuxt(data) {
  // 收集所有字符串值
  const strings = {};
  for (let i = 0; i < data.length; i++) {
    if (typeof data[i] === 'string') {
      strings[i] = data[i];
    }
  }

  // 递归解析数值引用为字符串
  function resolve(val, depth) {
    if (depth > 5) return val;
    if (typeof val === 'number' && val in strings) return strings[val];
    if (val && typeof val === 'object') {
      if (Array.isArray(val)) return val.map(v => resolve(v, depth + 1));
      const obj = {};
      for (const [k, v] of Object.entries(val)) {
        obj[k] = resolve(v, depth + 1);
      }
      return obj;
    }
    return val;
  }

  // 解析所有对象并提取文章
  const articles = [];
  const seenTitles = new Set();

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const resolved = resolve(item, 0);
      if (resolved && typeof resolved === 'object' && !Array.isArray(resolved)) {
        const title = resolved.title || resolved.Title || '';
        if (typeof title === 'string' && title.length > 5 && !seenTitles.has(title)) {
          seenTitles.add(title);
          
          const newsTxt = typeof resolved.newsTxt === 'string' ? resolved.newsTxt : '';
          const image = typeof resolved.image === 'string' ? resolved.image : '';
          const shareUrl = typeof resolved.share_url === 'string' ? resolved.share_url : resolved.url || '';
          const createTime = typeof resolved.create_time === 'string' ? resolved.create_time : 
                           typeof resolved.publish_time === 'string' ? resolved.publish_time : '';
          const newsId = resolved.newsId || resolved.relId || resolved.id || i;

          // 从 newsTxt 中提取纯文本摘要（去除 HTML）
          let summary = newsTxt.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
          if (summary.length > 200) summary = summary.substring(0, 200);

          articles.push({
            id: `renmin_${newsId}`,
            title,
            summary: summary || '暂无摘要',
            content: newsTxt || '',
            image,
            time: createTime,
            source: '人民日报',
            url: shareUrl.startsWith('http') ? shareUrl : (shareUrl ? 'https://www.peopleapp.com' + shareUrl : '')
          });
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
