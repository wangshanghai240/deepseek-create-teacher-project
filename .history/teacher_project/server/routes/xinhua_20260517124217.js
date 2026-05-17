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

// 从news.cn首页提取今日文章链接
async function fetchTodayArticles() {
  const res = await axios.get('https://www.news.cn/', {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });

  const html = res.data;
  const urls = new Set();
  // 匹配所有 news.cn 文章 URL（简单的全局匹配后拆分）
  const all = html.match(/https?:\/\/[^"'\s<>]*news\.cn[^"'\s<>]*\/2026\d{4}\/[a-f0-9]+\//g) || [];
  for (const match of all) {
    // 剥离紧跟的下一个URL
    let url = match.replace(/https?:\/\/[^/]+\//, 'https://www.news.cn/');
    // 确保不以字母结尾（不包含被拼接的下一URL开头）
    if (url.match(/\/[a-f0-9]+\/$/)) {
      // 从原始匹配中提取完整URL（到/c或/c.html）
      const idx = html.indexOf(match);
      const segment = html.substring(idx, idx + match.length + 60);
      const endMatch = segment.match(/^https?:\/\/[^"'\s<>]*?\/c(\.html)?(?=["'\s<>]|https?:\/\/|$)/);
      if (endMatch) urls.add(endMatch[0]);
    }
  }

  const articles = [];
  const seen = new Set();

  for (const url of urls) {
    // 提取标题（从链接附近的文本）
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const linkMatch = html.match(new RegExp('<a[^>]*href="' + escapedUrl.replace(/^https?:\/\//, '') + '"[^>]*>([\\s\\S]*?)<\\/a>', 'i'));
    let title = '';
    let image = '';

    if (linkMatch) {
      const inner = linkMatch[1];
      title = inner.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      const imgMatch = inner.match(/<img[^>]*src="([^"]+)"/);
      if (imgMatch) {
        let src = imgMatch[1];
        if (!src.startsWith('http')) src = 'https://www.news.cn' + (src.startsWith('/') ? src : '/' + src);
        image = src;
      }
    }

    if (!title || title.length < 5 || seen.has(title)) continue;
    seen.add(title);

    // 确定分类
    let catId = 'shizheng';
    for (const [id, cfg] of Object.entries(CATEGORY_KEYWORDS)) {
      if (url.includes(cfg.keyword)) { catId = id; break; }
    }

    articles.push({
      id: 'xh_' + Buffer.from(url).toString('base64').substring(0, 12),
      title: title.replace(/^\s+|\s+$/g, ''),
      summary: '',
      image,
      time: '',
      source: '新华网',
      url: url.replace(/["'<> ]+$/, ''),
      category: catId
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
