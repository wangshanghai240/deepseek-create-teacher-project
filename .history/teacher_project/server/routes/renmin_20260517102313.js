const express = require('express');
const axios = require('axios');
const router = express.Router();

// 从 peopleapp.com HTML 的 NUXT 数据中提取文章
// 从 feed 列表 + hot 热点板块提取完整的文章对象
function extractArticlesFromHtml(html) {
  const articles = [];
  const seenUrls = new Set();
  const seenTitles = new Set();

  const dataScript = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  if (!dataScript) return articles;

  try {
    const rawData = JSON.parse(dataScript[1]);
    const strings = {};
    for (let i = 0; i < rawData.length; i++) {
      if (typeof rawData[i] === 'string') strings[i] = rawData[i];
    }

    // 收集时间戳
    const timestamps = [];
    for (let i = 0; i < rawData.length; i++) {
      if (typeof rawData[i] === 'string' && /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(rawData[i])) {
        timestamps.push(rawData[i]);
      }
    }

    // 深度递归搜索字符串值
    function deepFindString(obj, depth) {
      if (depth > 4 || !obj || typeof obj !== 'object') return '';
      if (Array.isArray(obj)) {
        for (const v of obj) {
          const r = deepFindString(v, depth + 1);
          if (r) return r;
        }
        return '';
      }
      for (const v of Object.values(obj)) {
        if (typeof v === 'number' && strings[v]) return strings[v];
        if (typeof v === 'string' && v.length > 5 && /[\u4e00-\u9fff]/.test(v)) return v;
        const r = deepFindString(v, depth + 1);
        if (r) return r;
      }
      return '';
    }

    // 解析标题 - 主feed用title字段，热点用newsTitle字段
    function resolveTitle(item) {
      const titleIdx = item.title;
      if (typeof titleIdx === 'number') {
        const resolved = rawData[titleIdx];
        if (typeof resolved === 'string') return resolved;
        if (resolved && typeof resolved === 'object') {
          return deepFindString(resolved, 0);
        }
      }
      // 热点文章使用 newsTitle
      if (typeof item.newsTitle === 'number') {
        const resolved = rawData[item.newsTitle];
        if (typeof resolved === 'string') return resolved;
        if (resolved && typeof resolved === 'object') {
          return deepFindString(resolved, 0);
        }
      }
      return '';
    }

    // 添加文章：从对象中提取
    function addArticle(item, timeIdx) {
      let title = resolveTitle(item);
      
      let articleId = '';
      if (typeof item.relId === 'number') {
        const resolved = rawData[item.relId];
        articleId = typeof resolved === 'string' ? resolved : String(resolved);
      }
      if (!articleId || articleId === '0' || articleId === '') return;

      const articleUrl = 'https://www.peopleapp.com/article/' + articleId;
      if (seenUrls.has(articleUrl)) return;
      seenUrls.add(articleUrl);

      // 标题为空时跳过（无法展示）
      if (!title || title.length < 5) return;
      if (seenTitles.has(title)) return;
      seenTitles.add(title);

      let image = '';
      const imgIdx = item.image || item.image_url || item.coverUrl;
      if (typeof imgIdx === 'number' && strings[imgIdx]) {
        image = strings[imgIdx];
        if (image.startsWith('//')) image = 'https:' + image;
      }

      let newsTxt = '';
      const txtIdx = item.newsTxt || item.newsSummary;
      if (typeof txtIdx === 'number' && strings[txtIdx]) {
        newsTxt = strings[txtIdx];
      }

      // 检测视频：检查 videoInfo 是否有真实内容
      let hasVideo = !!(item.video_url || item.video || item.videoUrl);
      if (!hasVideo && typeof item.videoInfo === 'number') {
        const vi = rawData[item.videoInfo];
        hasVideo = vi && typeof vi === 'object' && Object.keys(vi).length > 1;
      }
      
      let summary = newsTxt.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (summary.length > 200) summary = summary.substring(0, 200);

      const createTime = typeof timeIdx === 'number' && strings[timeIdx] ? strings[timeIdx] : '';

      articles.push({
        id: 'renmin_' + articleId,
        title,
        summary: summary || '',
        content: newsTxt || '',
        image,
        time: createTime,
        source: '人民日报',
        url: articleUrl,
        hasVideo
      });
    }

    // 遍历所有包含 relId 的对象（主 feed + 各板块）
    for (let i = 0; i < rawData.length; i++) {
      const item = rawData[i];
      if (item && typeof item === 'object' && !Array.isArray(item) && item.relId) {
        addArticle(item, '');
      }
    }

  } catch (e) {
    console.error('NUXT extraction error:', e.message);
  }

  return articles;
}

// 人民日报文章列表（从 peopleapp.com 获取，不存数据库）
router.get('/renmin', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;

    // 从 peopleapp.com 人民日报频道获取页面
    const response = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://www.peopleapp.com/'
      }
    });

    const allArticles = extractArticlesFromHtml(response.data);

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

// 加载更多人民日报文章（尝试其他 feed 源）
router.get('/renmin/more', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 2;
    // 尝试多个 feed_id 获取更多文章
    const feedIds = [131, 132, 133, 134, 135];
    const allArticles = [];

    for (const feedId of feedIds) {
      try {
        const response = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=' + feedId + '&page=1&page_size=10', {
          timeout: 8000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' }
        });
        const extra = extractArticlesFromHtml(response.data);
        for (const a of extra) {
          if (a.url && a.url.includes('/article/')) {
            allArticles.push(a);
          }
        }
      } catch (e) { /* skip */ }
    }

    res.json({
      success: true,
      data: allArticles,
      total: allArticles.length,
      page
    });
  } catch (err) {
    res.json({ success: false, message: err.message, data: [] });
  }
});

// 抓取 peopleapp.com 文章页并提取内容
async function fetchArticleContent(pageUrl, targetRelId) {
  const res = await axios.get(pageUrl, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html',
      'Referer': 'https://www.peopleapp.com/'
    }
  });
  return extractContentFromHtml(res.data, targetRelId);
}

// 从页面 HTML 的 NUXT 数据中提取指定文章内容
function extractContentFromHtml(html, targetRelId) {
  const result = { content: '', image: '' };
  const ds = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  if (!ds) return result;

  try {
    const rawData = JSON.parse(ds[1]);
    const strings = {};
    for (let i = 0; i < rawData.length; i++) {
      if (typeof rawData[i] === 'string') strings[i] = rawData[i];
    }

    // 先找到目标文章对象
    let targetItem = null;
    if (targetRelId) {
      const targetIdStr = String(targetRelId);
      for (let i = 0; i < rawData.length; i++) {
        const item = rawData[i];
        if (item && typeof item === 'object' && !Array.isArray(item) && item.relId) {
          const rid = typeof item.relId === 'number' ? String(rawData[item.relId]) : '';
          if (rid === targetIdStr) {
            targetItem = item;
            break;
          }
        }
      }
    }

    // 如果找到了目标对象，只提取它的内容；否则提取所有（兼容旧行为）
    const itemsToScan = targetItem ? [targetItem] : [];
    if (!targetItem) {
      for (let i = 0; i < rawData.length; i++) {
        const item = rawData[i];
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          itemsToScan.push(item);
        }
      }
    }

    let allParagraphs = [];
    let allImages = [];
    let allVideos = [];

    for (const item of itemsToScan) {
      for (const [key, val] of Object.entries(item)) {
        if ((key === 'newsTxt' || key === 'newsSummary') && typeof val === 'number' && strings[val]) {
          const t = strings[val].trim();
          if (t.length > 20) allParagraphs.push(t);
        }
        if ((key === 'image' || key === 'image_url' || key === 'cover' || key === 'coverUrl') && typeof val === 'number' && strings[val]) {
          let u = strings[val];
          if (u && !u.includes('.ico') && !allImages.includes(u)) {
            if (u.startsWith('//')) u = 'https:' + u;
            allImages.push(u);
          }
        }
        if ((key === 'video_url' || key === 'video' || key === 'videoUrl') && typeof val === 'number' && strings[val]) {
          let v = strings[val];
          if (v && !allVideos.includes(v)) {
            if (v.startsWith('//')) v = 'https:' + v;
            allVideos.push(v);
          }
        }
      }
    }

    const htmlParts = [];
    const uniqueParagraphs = [...new Set(allParagraphs)];
    const uniqueImages = [...new Set(allImages)];
    let imgIdx = 0;

    for (let pi = 0; pi < uniqueParagraphs.length; pi++) {
      const cleanP = uniqueParagraphs[pi].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanP.length > 10) {
        htmlParts.push(`<p class="article-p">${cleanP}</p>`);
      }
      if (imgIdx < uniqueImages.length && (pi + 1) % 3 === 0) {
        htmlParts.push(`<div class="article-img"><img src="${uniqueImages[imgIdx]}" alt="" loading="lazy" /></div>`);
        imgIdx++;
      }
    }
    while (imgIdx < uniqueImages.length) {
      htmlParts.push(`<div class="article-img"><img src="${uniqueImages[imgIdx]}" alt="" loading="lazy" /></div>`);
      imgIdx++;
    }

    for (const vu of allVideos) {
      if (vu.includes('.mp4') || vu.includes('.m3u8')) {
        htmlParts.push(`<div class="article-video"><video controls preload="metadata" playsinline><source src="${vu}">您的浏览器不支持视频播放</video></div>`);
      }
    }

    result.content = htmlParts.join('\n');
    result.image = uniqueImages[0] || '';
  } catch (e) {
    console.error('Content extraction error:', e.message);
  }
  return result;
}

// 从 feed 页面 NUXT 数据中按标题查找文章 relId
async function findArticleIdByTitle(title) {
  const feed = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20', {
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
  });
  const ds = feed.data.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  if (!ds) return null;
  
  const rawData = JSON.parse(ds[1]);
  const strings = {};
  for (let i = 0; i < rawData.length; i++) {
    if (typeof rawData[i] === 'string') strings[i] = rawData[i];
  }

  // 用标题的前15个字匹配
  const searchKey = title.substring(0, 15);
  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      if (item.title && item.relId) {
        const t = typeof item.title === 'number' && strings[item.title] ? strings[item.title] : '';
        if (t && t.includes(searchKey)) {
          const relId = typeof item.relId === 'number' ? rawData[item.relId] : null;
          if (relId) return String(relId);
        }
      }
    }
  }
  return null;
}

// 获取人民日报文章详情
router.get('/renmin/detail', async (req, res) => {
  try {
    const urlParam = req.query.url;
    const title = req.query.title;
    
    if (!urlParam && !title) {
      return res.json({ success: false, message: '缺少参数', data: null });
    }

    let articleUrl = urlParam ? decodeURIComponent(urlParam) : '';
    let resolvedTitle = title ? decodeURIComponent(title) : '';

    // 如果有标题但没有文章URL，尝试搜索
    if ((!articleUrl || !articleUrl.includes('/article/')) && resolvedTitle) {
      const articleId = await findArticleIdByTitle(resolvedTitle);
      if (articleId) {
        articleUrl = 'https://www.peopleapp.com/article/' + articleId;
      }
    }

    if (!articleUrl || !articleUrl.includes('peopleapp.com')) {
      return res.json({ success: true, data: { content: '', image: '', url: articleUrl || '' } });
    }

    // 从 URL 中提取 relId
    const relIdMatch = articleUrl.match(/\/article\/(\d+)/);
    const targetRelId = relIdMatch ? relIdMatch[1] : '';
    
    const extracted = await fetchArticleContent(articleUrl, targetRelId);
    res.json({
      success: true,
      data: { content: extracted.content, image: extracted.image, url: articleUrl }
    });
  } catch (err) {
    console.error('人民日报详情获取失败:', err.message);
    res.json({ success: false, message: '获取详情失败: ' + err.message, data: null });
  }
});

module.exports = router;
