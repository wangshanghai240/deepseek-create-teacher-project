const express = require('express');
const axios = require('axios');
const router = express.Router();

const CATEGORY_KEYWORDS = {
  gaoceng: { name: '高层', keyword: 'leaders' },
  shizheng: { name: '时政', keyword: 'politics' },
  guoji: { name: '国际', keyword: 'world' },
  caijing: { name: '财经', keyword: 'fortune' },
  junshi: { name: '军事', keyword: 'mil' },
};

// 从新华网RSS获取文章（按栏目）
async function fetchArticlesByCategory(catRss) {
  const rssUrl = 'http://www.news.cn/' + catRss + '/news_' + catRss + '.xml';
  const res = await axios.get(rssUrl, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
  
  const { XMLParser } = require('fast-xml-parser');
  const parser = new XMLParser({ cdataPropName: '__cdata', ignoreAttributes: false });
  const json = parser.parse(res.data);
  let items = json?.rss?.channel?.item || [];
  if (!Array.isArray(items)) items = [items];
  
  const weekAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const articles = [];
  const seen = new Set();
  
  for (const item of items) {
    const title = (item.title?.__cdata || item.title || '').replace(/\[.*?\]/g, '').trim();
    if (!title || title.length < 5 || seen.has(title)) continue;
    seen.add(title);
    
    // 过滤：只保留近3天的文章
    const pubTime = new Date(item.pubDate || '').getTime();
    if (isNaN(pubTime) || pubTime < weekAgo) continue;
    
    const link = item.link || '';
    const desc = typeof item.description?.__cdata === 'string' ? item.description.__cdata :
                 typeof item.description === 'string' ? item.description : '';
    
    let image = '';
    const imgMatch = desc.match(/<img[^>]*src="([^"]+)"/);
    if (imgMatch) {
      let src = imgMatch[1];
      if (!src.startsWith('http')) src = 'http://www.news.cn' + src;
      image = src;
    }
    let summary = desc.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    if (summary.length > 150) summary = summary.substring(0, 150);

    articles.push({
      id: 'xh_' + articles.length + '_' + Date.now(),
      title,
      summary: summary || '',
      image,
      time: item.pubDate || '',
      source: '新华网',
      url: link
    });
  }
  return articles;
    });
  }

  return articles;
}

// 栏目列表
router.get('/xinhua/categories', (req, res) => {
  res.json({ success: true, data: Object.entries(CATEGORY_KEYWORDS).map(([k, v]) => ({ id: k, name: v.name })) });
});

// 文章列表
router.get('/xinhua/list', async (req, res) => {
  try {
    const catId = req.query.cat || 'shizheng';
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const allArticles = await fetchTodayArticles();
    const filtered = allArticles.filter(a => a.category === catId);
    const start = (page - 1) * pageSize;

    res.json({ success: true, data: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize });
  } catch (err) {
    console.error('新华社获取失败:', err.message);
    res.json({ success: false, message: err.message, data: [] });
  }
});

// 文章详情
router.get('/xinhua/detail', async (req, res) => {
  try {
    const url = decodeURIComponent(req.query.url || '');
    if (!url) return res.json({ success: false, message: '缺少URL' });

    const r = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' }
    });
    const cheerio = require('cheerio');
    const $ = cheerio.load(r.data);

    const title = $('title').text().replace(/_[^_]+$/, '').trim();
    const paragraphs = [];
    $('p').each((i, el) => {
      const t = $(el).text().trim();
      if (t.length > 20 && !t.includes('Copyright') && !t.includes('责任编辑')) paragraphs.push(t);
    });
    const images = [];
    $('img[src]').each((i, el) => {
      let s = $(el).attr('src');
      if (s && s.match(/\.(jpg|jpeg|png|gif)/) && !s.includes('.ico')) {
        if (!s.startsWith('http')) s = 'http://www.news.cn' + (s.startsWith('/') ? s : '/' + s);
        if (!images.includes(s)) images.push(s);
      }
    });
    const videos = [];
    $('video source[src]').each((i, el) => { const s = $(el).attr('src'); if (s && !videos.includes(s)) videos.push(s); });
    $('video[src]').each((i, el) => { const s = $(el).attr('src'); if (s && !videos.includes(s)) videos.push(s); });

    const parts = [];
    for (const img of images.slice(0, 3)) {
      parts.push('<div class="article-img"><img src="' + img + '" alt="" loading="lazy" /></div>');
    }
    for (let i = 0; i < Math.min(paragraphs.length, 30); i++) {
      parts.push('<p class="article-p">' + paragraphs[i] + '</p>');
      const imgIdx = Math.floor(i / 4) + 3;
      if (i > 0 && i % 4 === 0 && images[imgIdx]) {
        parts.push('<div class="article-img"><img src="' + images[imgIdx] + '" alt="" loading="lazy" /></div>');
      }
    }
    for (const v of videos) {
      parts.push('<div class="article-video"><video controls preload="metadata" playsinline><source src="' + v + '"></video></div>');
    }

    res.json({ success: true, data: { title, content: parts.join('\n'), image: images[0] || '', source: '新华网', url } });
  } catch (err) {
    console.error('新华社详情获取失败:', err.message);
    res.json({ success: false, message: err.message, data: null });
  }
});

module.exports = router;
