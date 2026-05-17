const express = require('express');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const router = express.Router();

const CATEGORIES = {
  gaoceng: { name: '高层', rss: 'leaders' },
  shizheng: { name: '时政', rss: 'politics' },
  renshi: { name: '人事', rss: 'xhrs' },
  guoji: { name: '国际', rss: 'world' },
  caijing: { name: '财经', rss: 'fortune' },
  junshi: { name: '军事', rss: 'mil' },
};

const parser = new XMLParser({ cdataPropName: '__cdata', ignoreAttributes: false });

router.get('/xinhua/categories', (req, res) => {
  res.json({ success: true, data: Object.entries(CATEGORIES).map(([k, v]) => ({ id: k, name: v.name })) });
});

router.get('/xinhua/list', async (req, res) => {
  try {
    const catId = req.query.cat || 'gaoceng';
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const cat = CATEGORIES[catId];
    if (!cat) return res.json({ success: false, message: '栏目不存在' });

    const rssUrl = 'http://www.news.cn/' + cat.rss + '/news_' + cat.rss + '.xml';
    const response = await axios.get(rssUrl, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    
    const json = parser.parse(response.data);
    let items = json?.rss?.channel?.item || [];
    if (!Array.isArray(items)) items = [items];
    
    const articles = items.map((item, i) => {
      const title = (item.title?.__cdata || item.title || '').replace(/\[.*?\]/g, '').trim();
      const link = item.link || '';
      const pubDate = item.pubDate || '';
      const desc = item.description?.__cdata || item.description || '';
      
      let image = '';
      const imgMatch = desc.match(/<img[^>]*src="([^"]+)"/);
      if (imgMatch) {
        let src = imgMatch[1];
        if (!src.startsWith('http')) src = 'http://www.news.cn' + src;
        image = src;
      }
      let summary = desc.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (summary.length > 150) summary = summary.substring(0, 150);
      
      return { id: 'xh_' + i, title, summary, image, time: pubDate, source: '新华网', url: link };
    }).filter(a => a.title.length > 5);

    const start = (page - 1) * pageSize;
    res.json({ success: true, data: articles.slice(start, start + pageSize), total: articles.length, page, pageSize });
  } catch (err) {
    console.error('新华社获取失败:', err.message);
    res.json({ success: false, message: err.message, data: [] });
  }
});

router.get('/xinhua/detail', async (req, res) => {
  try {
    const url = decodeURIComponent(req.query.url || '');
    if (!url) return res.json({ success: false, message: '缺少URL' });
    
    const r = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' } });
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
        images.push(s);
      }
    });
    const videos = [];
    $('video source[src]').each((i, el) => { const s = $(el).attr('src'); if (s) videos.push(s); });
    $('video[src]').each((i, el) => { const s = $(el).attr('src'); if (s) videos.push(s); });
    
    const parts = [];
    images.slice(0, 3).forEach(img => parts.push('<div class="article-img"><img src="' + img + '" alt="" loading="lazy" /></div>'));
    paragraphs.slice(0, 30).forEach((p, i) => {
      parts.push('<p class="article-p">' + p + '</p>');
      if (i > 0 && i % 4 === 0 && images[Math.floor(i / 4) + 2]) {
        parts.push('<div class="article-img"><img src="' + images[Math.floor(i / 4) + 2] + '" alt="" loading="lazy" /></div>');
      }
    });
    videos.forEach(v => parts.push('<div class="article-video"><video controls preload="metadata" playsinline><source src="' + v + '"></video></div>'));
    
    res.json({ success: true, data: { title, content: parts.join('\n'), image: images[0] || '', source: '新华网', url: url } });
  } catch (err) {
    console.error('新华社详情获取失败:', err.message);
    res.json({ success: false, message: err.message, data: null });
  }
});

module.exports = router;
