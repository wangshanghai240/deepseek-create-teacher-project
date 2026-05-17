const express = require('express');
const axios = require('axios');
const router = express.Router();

// 从 peopleapp.com HTML 中提取文章
// 从 NUXT 数据中提取文章的 title + relId，构造真实文章 URL
function extractArticlesFromHtml(html) {
  const articles = [];
  const seenTitles = new Set();
  
  const dataScript = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  if (dataScript) {
    try {
      const rawData = JSON.parse(dataScript[1]);
      const strings = {};
      for (let i = 0; i < rawData.length; i++) {
        if (typeof rawData[i] === 'string') strings[i] = rawData[i];
      }

      // 收集所有时间戳字符串（格式化的日期）
      const timestamps = [];
      for (let i = 0; i < rawData.length; i++) {
        if (typeof rawData[i] === 'string' && /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(rawData[i])) {
          timestamps.push(rawData[i]);
        }
      }

      let articleIdx = 0;
      for (let i = 0; i < rawData.length; i++) {
        const item = rawData[i];
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const keys = Object.keys(item);
          if (keys.includes('title') && (keys.includes('relId') || keys.includes('newsId'))) {
            const titleIdx = item.title;
            const title = typeof titleIdx === 'number' && strings[titleIdx] ? strings[titleIdx] : '';
            
            if (title && title.length > 5 && !seenTitles.has(title)) {
              seenTitles.add(title);
              
              let articleId = '';
              const relIdVal = item.relId;
              if (typeof relIdVal === 'number') {
                const resolved = rawData[relIdVal];
                articleId = typeof resolved === 'string' ? resolved : String(resolved);
              }
              
              let image = '';
              const imgIdx = item.image;
              if (typeof imgIdx === 'number' && strings[imgIdx]) {
                image = strings[imgIdx];
                if (image.startsWith('//')) image = 'https:' + image;
              }
              
              let newsTxt = '';
              const txtIdx = item.newsTxt;
              if (typeof txtIdx === 'number' && strings[txtIdx]) {
                newsTxt = strings[txtIdx];
              }
              
              // 按顺序匹配时间戳
              const createTime = timestamps[articleIdx] || '';
              articleIdx++;
              
              let summary = newsTxt.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
              if (summary.length > 200) summary = summary.substring(0, 200);
              
              const articleUrl = articleId ? 'https://www.peopleapp.com/article/' + articleId : '';

              articles.push({
                id: `renmin_${articleId || articles.length}`,
                title,
                summary: summary || '',
                content: newsTxt || '',
                image,
                time: createTime,
                source: '人民日报',
                url: articleUrl
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('NUXT article extraction error:', e.message);
    }
  }

  // 补充: 从 HTML 文本中提取更多标题
  const textBlocks = html.match(/>([^<>]{10,80})</g) || [];
  const uniqueTexts = [...new Set(textBlocks.map(t => t.replace(/^>|<$/g, '').trim()))]
    .filter(t => {
      if (!/[\u4e00-\u9fff]/.test(t)) return false;
      if (t.includes('//') || t.includes('.com') || t.includes('.cn')) return false;
      if (t.includes('function') || t.includes('var ') || t.includes('this.')) return false;
      if (t.toLowerCase().includes('copyright') || t.includes('All rights')) return false;
      if (t.includes('京ICP') || t.includes('京公网') || t.includes('冀') || t.includes('互联网新闻')) return false;
      if (t.includes('{') || t.includes(';') || t.includes('//')) return false;
      if (t.startsWith('VITE_') || t.startsWith('http')) return false;
      if (t.length < 10) return false;
      if (/^[\d\s%\.#]+$/.test(t)) return false;
      if (t.includes('像素') || t.includes('px') || t.includes('font-size')) return false;
      return true;
    });

  // 当天日期
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  for (const title of uniqueTexts) {
    if (!seenTitles.has(title)) {
      seenTitles.add(title);
      articles.push({
        id: `renmin_txt_${articles.length}`,
        title,
        summary: '',
        content: '',
        image: '',
        time: todayStr,
        source: '人民日报',
        url: 'https://www.peopleapp.com/search?keyword=' + encodeURIComponent(title)
      });
    }
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

// 抓取 peopleapp.com 文章页并提取内容
async function fetchArticleContent(pageUrl) {
  const res = await axios.get(pageUrl, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html',
      'Referer': 'https://www.peopleapp.com/'
    }
  });
  return extractContentFromHtml(res.data);
}

// 从页面 HTML 的 NUXT 数据中提取文章内容
function extractContentFromHtml(html) {
  const result = { content: '', image: '' };
  const ds = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  if (!ds) return result;

  try {
    const rawData = JSON.parse(ds[1]);
    const strings = {};
    for (let i = 0; i < rawData.length; i++) {
      if (typeof rawData[i] === 'string') strings[i] = rawData[i];
    }

    let allParagraphs = [];
    let allImages = [];
    let allVideos = [];

    for (let i = 0; i < rawData.length; i++) {
      const item = rawData[i];
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        for (const [key, val] of Object.entries(item)) {
          if (key === 'newsTxt' && typeof val === 'number' && strings[val]) {
            const t = strings[val].trim();
            if (t.length > 20) allParagraphs.push(t);
          }
          if ((key === 'image' || key === 'image_url' || key === 'cover') && typeof val === 'number' && strings[val]) {
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

    const extracted = await fetchArticleContent(articleUrl);
    res.json({
      success: true,
      data: { content: extracted.content, image: extracted.image, url: articleUrl }
    });
  } catch (err) {
    console.error('人民日报详情获取失败:', err.message);
    res.json({ success: false, message: '获取详情失败: ' + err.message, data: null });
  }
});
      try {
        const rawData = JSON.parse(dataScript[1]);
        const strings = {};
        for (let i = 0; i < rawData.length; i++) {
          if (typeof rawData[i] === 'string') strings[i] = rawData[i];
        }

        // 收集所有内容元素
        let allParagraphs = [];
        let allImages = [];
        let allVideos = [];
        
        for (let i = 0; i < rawData.length; i++) {
          const item = rawData[i];
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            for (const [key, val] of Object.entries(item)) {
              if (key === 'newsTxt' && typeof val === 'number' && strings[val]) {
                const t = strings[val].trim();
                if (t.length > 20) allParagraphs.push(t);
              }
              if ((key === 'image' || key === 'image_url' || key === 'cover') && typeof val === 'number' && strings[val]) {
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
        }

        // 构造包含图片的 HTML
        const htmlParts = [];
        const uniqueParagraphs = [...new Set(allParagraphs)];
        const uniqueImages = [...new Set(allImages)];
        let imgIdx = 0;

        for (let pi = 0; pi < uniqueParagraphs.length; pi++) {
          const cleanP = uniqueParagraphs[pi].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
          if (cleanP.length > 10) {
            htmlParts.push(`<p class="article-p">${cleanP}</p>`);
          }
          // 每 3 段插入一张图片
          if (imgIdx < uniqueImages.length && (pi + 1) % 3 === 0) {
            htmlParts.push(`<div class="article-img"><img src="${uniqueImages[imgIdx]}" alt="" loading="lazy" /></div>`);
            imgIdx++;
          }
        }
        while (imgIdx < uniqueImages.length) {
          htmlParts.push(`<div class="article-img"><img src="${uniqueImages[imgIdx]}" alt="" loading="lazy" /></div>`);
          imgIdx++;
        }

        // 添加视频
        for (const vu of allVideos) {
          if (vu.includes('.mp4') || vu.includes('.m3u8')) {
            htmlParts.push(`<div class="article-video"><video controls preload="metadata" playsinline><source src="${vu}">您的浏览器不支持视频播放</video></div>`);
          }
        }

        content = htmlParts.join('\n');
        image = uniqueImages[0] || '';
      } catch (e) {
        console.error('NUXT content extraction error:', e.message);
      }
    }

    res.json({
      success: true,
      data: {
        content: content || '',
        image: image,
        url: articleUrl
      }
    });
  } catch (err) {
    console.error('人民日报详情获取失败:', err.message);
    res.json({
      success: false,
      message: '获取详情失败: ' + err.message,
      data: null
    });
  }
});

module.exports = router;
