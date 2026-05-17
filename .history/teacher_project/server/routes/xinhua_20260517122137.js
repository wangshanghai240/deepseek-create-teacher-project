const express = require('express');
const axios = require('axios');
const router = express.Router();

// 新华社栏目配置
const CATEGORIES = {
  gaoceng: { name: '高层', url: 'https://www.news.cn/politics/leaders/' },
  shizheng: { name: '时政', url: 'https://www.news.cn/politics/' },
  guoji: { name: '国际', url: 'https://www.news.cn/world/' },
  renshi: { name: '人事', url: 'https://www.news.cn/politics/xhrs/' },
  caijing: { name: '财经', url: 'https://www.news.cn/fortune/' },
  junshi: { name: '军事', url: 'https://www.news.cn/mil/' }
};

// 获取栏目列表
router.get('/xinhua/categories', (req, res) => {
  const cats = Object.entries(CATEGORIES).map(([key, val]) => ({
    id: key,
    name: val.name
  }));
  res.json({ success: true, data: cats });
});

// 从HTML中提取文章列表
function extractArticles(html, baseUrl) {
  const articles = [];
  const seen = new Set();
  
  // 匹配文章链接: /YYYYMMDD/uuid/c.html 或 /home/YYYYMMDD/uuid/c
  const linkRegex = /<a[^>]*href="([^"]*(?:\/home)?\/20\d{6}\/[a-f0-9]+\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    let url = match[1];
    const innerHtml = match[2];
    const title = innerHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    
    if (!url.startsWith('http')) {
      url = 'https://www.news.cn' + (url.startsWith('/') ? url : '/' + url);
    }
    // 确保以 .html 结尾
    if (!url.endsWith('.html') && !url.endsWith('c')) url = url + '.html';
    if (url.endsWith('c') && !url.endsWith('c.html')) url = url + '.html';
    
    // 提取图片
    const imgMatch = innerHtml.match(/<img[^>]*src="([^"]+)"/);
    let image = imgMatch ? imgMatch[1] : '';
    if (image && !image.startsWith('http')) {
      image = 'https://www.news.cn' + (image.startsWith('/') ? image : '/' + image);
    }
    
    if (title && title.length > 5 && !seen.has(title) && !title.includes('javascript') && !title.includes('Copyright')) {
      seen.add(title);
      articles.push({
        id: 'xh_' + Buffer.from(url).toString('base64').substring(0, 16),
        title,
        image: image || '',
        summary: '',
        url: url
      });
    }
  }
  return articles;
}

// 获取栏目文章列表
router.get('/xinhua/list', async (req, res) => {
  try {
    const category = req.query.cat || 'gaoceng';
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    
    const catConfig = CATEGORIES[category];
    if (!catConfig) {
      return res.json({ success: false, message: '栏目不存在' });
    }
    
    const response = await axios.get(catConfig.url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    let allArticles = extractArticles(response.data, catConfig.url.replace(/\/$/, ''));
    
    // 图片过滤：去掉没有图片的文章
    allArticles = allArticles.filter(a => a.image || a.title.length > 8);
    
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
    console.error('新华社获取失败:', err.message);
    res.json({ success: false, message: err.message, data: [] });
  }
});

// 获取文章详情
router.get('/xinhua/detail', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.json({ success: false, message: '缺少URL' });
    
    const articleUrl = decodeURIComponent(url);
    const response = await axios.get(articleUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      }
    });
    
    const cheerio = require('cheerio');
    const $ = cheerio.load(response.data);
    
    // 提取标题
    let title = $('title').text().replace(/_新华网$|_news\.cn$/g, '').trim();
    // 提取来源和时间
    let source = $('.source, .info span').first().text().trim() || '新华网';
    let pubTime = $('.time, .info, .date').first().text().trim();
    
    // 提取正文段落
    const paragraphs = [];
    $('p').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 15 && !text.includes('Copyright') && !text.includes('All rights')) {
        paragraphs.push(text);
      }
    });
    
    // 提取图片
    const images = [];
    $('img[src]').each((i, el) => {
      let src = $(el).attr('src');
      if (src && src.match(/\.(jpg|jpeg|png|gif|webp)/i) && !src.includes('.ico')) {
        if (!src.startsWith('http')) src = 'https://www.news.cn' + src;
        images.push(src);
      }
    });
    
    // 提取视频
    const videos = [];
    $('video source[src]').each((i, el) => {
      const src = $(el).attr('src');
      if (src) videos.push(src);
    });
    $('video[src]').each((i, el) => {
      const src = $(el).attr('src');
      if (src) videos.push(src);
    });
    
    // 构建HTML内容
    let content = '';
    const contentParts = [];
    
    // 先添加图片
    for (const img of images.slice(0, 3)) {
      contentParts.push(`<div class="article-img"><img src="${img}" alt="" loading="lazy" /></div>`);
    }
    
    // 添加文字段落
    for (const p of paragraphs.slice(0, 20)) {
      contentParts.push(`<p class="article-p">${p}</p>`);
      // 段落中插入更多图片
      const idx = paragraphs.indexOf(p);
      if (idx > 0 && idx % 4 === 0 && images[idx / 4]) {
        contentParts.push(`<div class="article-img"><img src="${images[idx / 4]}" alt="" loading="lazy" /></div>`);
      }
    }
    
    // 添加视频
    for (const v of videos) {
      contentParts.push(`<div class="article-video"><video controls preload="metadata" playsinline><source src="${v}">您的浏览器不支持视频播放</video></div>`);
    }
    
    content = contentParts.join('\n');
    
    res.json({
      success: true,
      data: {
        title,
        content: content || '',
        image: images[0] || '',
        time: pubTime,
        source: source,
        url: articleUrl
      }
    });
  } catch (err) {
    console.error('新华社详情获取失败:', err.message);
    res.json({ success: false, message: err.message, data: null });
  }
});

module.exports = router;
