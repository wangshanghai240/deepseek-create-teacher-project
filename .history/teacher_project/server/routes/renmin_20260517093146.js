const express = require('express');
const axios = require('axios');
const router = express.Router();

// 从 peopleapp.com HTML 中提取文章
// 从 NUXT 数据中提取文章的 title + relId，构造真实文章 URL
function extractArticlesFromHtml(html) {
  const articles = [];
  const seenTitles = new Set();
  
  // 从 NUXT 数据中提取完整文章对象（包含 title + relId + image + newsTxt）
  const dataScript = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  if (dataScript) {
    try {
      const rawData = JSON.parse(dataScript[1]);
      // 构建字符串索引
      const strings = {};
      for (let i = 0; i < rawData.length; i++) {
        if (typeof rawData[i] === 'string') strings[i] = rawData[i];
      }

      // 找文章对象: 同时有 title 和 relId 的对象
      for (let i = 0; i < rawData.length; i++) {
        const item = rawData[i];
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const keys = Object.keys(item);
          if (keys.includes('title') && (keys.includes('relId') || keys.includes('newsId'))) {
            const titleIdx = item.title;
            const title = typeof titleIdx === 'number' && strings[titleIdx] ? strings[titleIdx] : '';
            
            if (title && title.length > 5 && !seenTitles.has(title)) {
              seenTitles.add(title);
              
              // 获取 relId
              let articleId = '';
              const relIdVal = item.relId;
              if (typeof relIdVal === 'number') {
                const resolved = rawData[relIdVal];
                articleId = typeof resolved === 'string' ? resolved : String(resolved);
              }
              
              // 获取图片
              let image = '';
              const imgIdx = item.image;
              if (typeof imgIdx === 'number' && strings[imgIdx]) {
                image = strings[imgIdx];
                if (image.startsWith('//')) image = 'https:' + image;
              }
              
              // 获取摘要
              let newsTxt = '';
              const txtIdx = item.newsTxt;
              if (typeof txtIdx === 'number' && strings[txtIdx]) {
                newsTxt = strings[txtIdx];
              }
              
              // 获取时间
              let createTime = '';
              const timeIdx = item.publish_time || item.create_time;
              if (typeof timeIdx === 'number' && strings[timeIdx]) {
                createTime = strings[timeIdx];
              }
              
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

  // 补充: 从 HTML 文本中提取更多标题（没有 URL 的用搜索链接）
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

  for (const title of uniqueTexts) {
    if (!seenTitles.has(title)) {
      seenTitles.add(title);
      articles.push({
        id: `renmin_txt_${articles.length}`,
        title,
        summary: '',
        content: '',
        image: '',
        time: '',
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

// 获取人民日报文章详情（根据 URL 从 NUXT 数据中提取完整内容）
router.get('/renmin/detail', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.json({ success: false, message: '缺少 URL 参数', data: null });
    }

    const articleUrl = decodeURIComponent(url);
    if (!articleUrl.includes('peopleapp.com')) {
      return res.json({ success: true, data: { content: '', image: '', url: articleUrl } });
    }

    // 抓取文章页面
    const detailRes = await axios.get(articleUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Referer': 'https://www.peopleapp.com/'
      }
    });

    const html = detailRes.data;
    let content = '';
    let image = '';

    // 从 NUXT 数据中提取文章内容
    const dataScript = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
    if (dataScript) {
      try {
        const rawData = JSON.parse(dataScript[1]);
        const strings = {};
        for (let i = 0; i < rawData.length; i++) {
          if (typeof rawData[i] === 'string') strings[i] = rawData[i];
        }

        // 收集所有长文本内容
        let allContent = '';
        let allImages = [];
        
        // 遍历所有对象，提取 newsTxt 和 image
        for (let i = 0; i < rawData.length; i++) {
          const item = rawData[i];
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            for (const [key, val] of Object.entries(item)) {
              if (key === 'newsTxt' && typeof val === 'number' && strings[val]) {
                allContent += strings[val] + '\n\n';
              }
              if ((key === 'image' || key === 'image_url') && typeof val === 'number' && strings[val]) {
                const img = strings[val];
                if (img && !img.includes('.ico')) {
                  allImages.push(img.startsWith('//') ? 'https:' + img : img);
                }
              }
            }
          }
        }

        // 处理内容：合并并去除重复
        const paragraphs = allContent.split('\n\n').filter(p => p.trim().length > 50);
        const uniqueParagraphs = [...new Set(paragraphs)];
        content = uniqueParagraphs.join('\n\n');

        // 处理图片
        image = [...new Set(allImages)][0] || '';
        
        // 格式化内容为 HTML
        if (content) {
          content = content
            .split('\n\n')
            .filter(p => p.trim())
            .map(p => `<p style="text-indent: 2em; line-height: 1.8; margin-bottom: 12px; font-size: 16px;">${p.trim()}</p>`)
            .join('\n');
        }
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
