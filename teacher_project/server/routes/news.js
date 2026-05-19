const express = require('express');
const axios = require('axios');
const insforge = require('../config/insforge');
const router = express.Router();

/**
 * 从 URL 判断新闻是否为视频类型
 */
function isVideoUrl(url) {
  if (!url) return false;
  if (url.includes('tv.cctv.com')) return true;
  if (url.includes('video.cctv.com')) return true;
  const pathname = url.replace(/https?:\/\//, '');
  if (pathname.includes('/VIDE')) return true;
  return false;
}

/**
 * 从页面 HTML 内容判断是否为视频页面
 */
function isVideoPage(html) {
  if (!html) return false;
  const idMatch = html.match(/contentid["']?\s*content=["']([^"']+)["']/);
  if (idMatch && idMatch[1].startsWith('VIDE')) return true;
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch && /^\[.+\]/.test(titleMatch[1])) return true;
  if (html.includes('htmlVideoCode')) return true;
  if (!html.includes('contentdate') && (html.includes('class="player"') || html.includes('video-player'))) return true;
  return false;
}

/**
 * @route   GET /api/news/xwlb
 * @desc    获取新闻联播视频列表（无需数据库）
 */
router.get('/news/xwlb', async (req, res) => {
  try {
    const now = new Date();
    const dateStr = req.query.date || 
      `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    const pageRes = await axios.get(`https://tv.cctv.com/lm/xwlb/?date=${dateStr}`, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const html = pageRes.data;
    const allLinks = [...new Set(html.match(/https:\/\/tv\.cctv\.com\/[^\s"']*?\.shtml/g) || [])];
    const videoLinks = allLinks.filter(l => l.includes('VIDE') && !l.includes('/lm/') && !l.includes('/search/'));

    const videos = [];
    const linkRegex = /<a[^>]*href="(https:\/\/tv\.cctv\.com\/[^"]+\.shtml)"[^>]*>([\s\S]{0,80})<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const url = match[1];
      if (!url.includes('VIDE') || url.includes('/lm/')) continue;
      let title = match[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      title = title.replace(/^完整版/, '').replace(/^\[视频\]/, '').trim();
      if (title && !videos.find(v => v.url === url)) {
        videos.push({ title, url, date: dateStr });
      }
    }

    if (videos.length === 0) {
      videoLinks.forEach((url, i) => {
        videos.push({ title: `新闻联播片段 ${i + 1}`, url, date: dateStr });
      });
    }

    const fullVideo = videos.find(v => v.title.includes('新闻联播'));
    const fullEpisode = fullVideo || (videos.length > 0 ? videos[0] : null);

    res.json({
      success: true,
      data: {
        date: dateStr,
        fullEpisode,
        clips: videos.filter(v => v !== fullEpisode),
        total: videos.length
      }
    });
  } catch (error) {
    console.error('获取新闻联播错误:', error.message);
    res.status(500).json({ success: false, message: '获取新闻联播失败：' + error.message });
  }
});

/**
 * @route   GET /api/news
 * @desc    获取新闻列表（按时间倒序）
 */
router.get('/news', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // 查询总数
    const { data: allRows, error: countError } = await insforge.select('news', {
      select: 'id'
    });

    if (countError) throw countError;

    const total = (allRows || []).length;

    // 查询列表（使用 offset/limit）
    const { data: rows, error } = await insforge.select('news', {
      select: 'id, title, summary, reporter, source, source_url, image_url, created_at',
      order: 'created_at.desc',
      offset,
      limit
    });

    if (error) throw error;

    const list = (rows || []).map(item => ({
      ...item,
      type: isVideoUrl(item.source_url) ? 'video' : 'article'
    }));

    res.json({
      success: true,
      data: {
        list,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    console.error('获取新闻列表错误:', error.message);
    res.status(500).json({ success: false, message: '获取新闻失败：' + error.message });
  }
});

/**
 * @route   GET /api/news/:id
 * @desc    获取新闻详情
 */
router.get('/news/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: rows, error } = await insforge.select('news', {
      select: 'id, title, summary, content, reporter, source, source_url, image_url, created_at',
      eq: { column: 'id', value: id }
    });

    if (error) throw error;

    if (!rows || rows.length === 0) {
      return res.json({ success: false, message: '新闻不存在' });
    }

    const newsItem = rows[0];
    newsItem.type = isVideoUrl(newsItem.source_url) ? 'video' : 'article';
    res.json({ success: true, data: newsItem });
  } catch (error) {
    console.error('获取新闻详情错误:', error.message);
    res.status(500).json({ success: false, message: '获取新闻详情失败：' + error.message });
  }
});

/**
 * @route   GET /api/news/:id/full
 * @desc    获取新闻详情，并实时从原文抓取完整内容
 */
router.get('/news/:id/full', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: rows, error } = await insforge.select('news', {
      select: 'id, title, summary, content, reporter, source, source_url, image_url, created_at',
      eq: { column: 'id', value: id }
    });

    if (error) throw error;

    if (!rows || rows.length === 0) {
      return res.json({ success: false, message: '新闻不存在' });
    }

    const newsItem = rows[0];
    newsItem.type = isVideoUrl(newsItem.source_url) ? 'video' : 'article';
    let fullContent = newsItem.content || newsItem.summary || '';

    if (newsItem.source_url) {
      try {
        const htmlRes = await axios.get(newsItem.source_url, { timeout: 15000 });
        const html = htmlRes.data;

        if (isVideoPage(html)) {
          newsItem.type = 'video';
        }

        const contentdateMatch = html.match(/var\s+contentdate\s*=\s*'([\s\S]*?)';/);
        if (contentdateMatch) {
          let text = contentdateMatch[1]
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<\/div>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&ldquo;/g, '"')
            .replace(/&rdquo;/g, '"')
            .replace(/&middot;/g, '·')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          if (text.length > 100) fullContent = text;
        }

        if (fullContent === (newsItem.content || newsItem.summary || '')) {
          const patterns = [
            /<div class="content_body"[^>]*>([\s\S]*?)<\/div>\s*<div class="(?:edit|pagefun|share)"/,
            /<div class="cnt_bd"[^>]*>([\s\S]*?)<\/div>\s*<!--\s*(?:责任编辑|编辑)/,
            /<article[^>]*>([\s\S]*?)<\/article>/,
            /<div class="article-body"[^>]*>([\s\S]*?)<\/div>/,
            /<div class="content"[^>]*>([\s\S]*?)<\/div>\s*<div class="(?:edit|foot)"/,
            /<!--(?:begin)?content-->([\s\S]*?)<!--endcontent-->/,
          ];

          for (const pattern of patterns) {
            const m = html.match(pattern);
            if (m) {
              let text = m[1]
                .replace(/<script[\s\S]*?<\/script>/gi, '')
                .replace(/<style[\s\S]*?<\/style>/gi, '')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<\/div>/gi, '\n')
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
              if (text.length > 100) { fullContent = text; break; }
            }
          }
        }

        if (fullContent === (newsItem.content || newsItem.summary || '')) {
          const pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
          if (pMatches) {
            let combined = pMatches
              .map(p => p.replace(/<[^>]+>/g, '').trim())
              .filter(t => t.length > 10)
              .join('\n\n');
            if (combined.length > 200) fullContent = combined;
          }
        }
      } catch (fetchErr) {
        console.error('抓取原文失败:', fetchErr.message);
      }
    }

    newsItem.fullContent = fullContent;

    res.json({ success: true, data: newsItem });
  } catch (error) {
    console.error('获取新闻完整内容错误:', error.message);
    res.status(500).json({ success: false, message: '获取新闻完整内容失败：' + error.message });
  }
});

/**
 * @route   GET /api/news/:id/video
 * @desc    获取新闻视频的真实播放地址
 */
router.get('/news/:id/video', async (req, res) => {
  try {
    const { id } = req.params;

    const isVideId = /^VIDE/i.test(id);

    if (isVideId) {
      const dateMatch = id.match(/(\d{6})$/);
      if (!dateMatch) {
        return res.status(400).json({ success: false, message: '无效的视频ID' });
      }
      const dateStr = dateMatch[1];
      const pageUrl = `https://tv.cctv.com/20${dateStr.substring(0, 2)}/${dateStr.substring(2, 4)}/${dateStr.substring(4, 6)}/${id}.shtml`;
      
      try {
        const pageRes = await axios.get(pageUrl, {
          timeout: 15000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const html = pageRes.data;
        const guidMatch = html.match(/guid\s*=\s*['"]\s*([^'"]+)['"]/);
        if (!guidMatch) {
          return res.status(400).json({ success: false, message: '无法获取视频标识' });
        }
        const guid = guidMatch[1].trim();
        
        const apiUrl = `https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=${guid}`;
        const apiRes = await axios.get(apiUrl, {
          timeout: 15000,
          headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://tv.cctv.com/' }
        });
        if (apiRes.data.hls_url) {
          return res.json({
            success: true,
            data: { id, title: apiRes.data.title || '新闻联播', videoId: guid, videoUrl: apiRes.data.hls_url, videoType: 'm3u8' }
          });
        }
      } catch (e) {
        console.error('VIDE ID 处理失败:', e.message);
      }
      return res.status(400).json({ success: false, message: '无法获取视频播放地址' });
    }

    const { data: rows, error } = await insforge.select('news', {
      select: 'id, title, source_url',
      eq: { column: 'id', value: id }
    });

    if (error) throw error;

    if (!rows || rows.length === 0) {
      const fallbackUrl = req.query.url;
      if (fallbackUrl) {
        try {
          const pageRes = await axios.get(fallbackUrl, {
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://tv.cctv.com/' }
          });
          const html = pageRes.data;
          let videoId = '';
          const guidMatch = html.match(/guid\s*=\s*['"]\s*([^'"]+)['"]/);
          if (guidMatch) {
            videoId = guidMatch[1].trim();
          } else {
            const vcMatch = html.match(/htmlVideoCode--\]([a-f0-9]+),/);
            if (vcMatch) videoId = vcMatch[1];
          }
          if (videoId) {
            const apiUrl = `https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=${videoId}`;
            const apiRes = await axios.get(apiUrl, {
              timeout: 15000,
              headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://tv.cctv.com/' }
            });
            if (apiRes.data.hls_url) {
              return res.json({
                success: true,
                data: { id, title: apiRes.data.title || '新闻', videoId, videoUrl: apiRes.data.hls_url, videoType: 'm3u8' }
              });
            }
          }
        } catch (e) {
          console.error('后备视频获取失败:', e.message);
        }
      }
      return res.json({ success: false, message: '新闻不存在' });
    }

    const newsItem = rows[0];

    if (!newsItem.source_url) {
      return res.json({ success: false, message: '该新闻没有视频源地址' });
    }

    const pageRes = await axios.get(newsItem.source_url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://tv.cctv.com/' }
    });
    const html = pageRes.data;

    let videoId = '';
    const guidMatch = html.match(/guid\s*=\s*['"]\s*([^'"]+)['"]/);
    if (guidMatch) {
      videoId = guidMatch[1].trim();
    } else {
      const vcMatch = html.match(/htmlVideoCode--\]([a-f0-9]+),/);
      if (vcMatch) videoId = vcMatch[1];
    }

    if (!videoId) {
      return res.status(400).json({ success: false, message: '无法获取视频标识' });
    }

    const apiUrl = `https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=${videoId}`;
    const apiRes = await axios.get(apiUrl, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://tv.cctv.com/' }
    });

    const videoData = apiRes.data;
    let videoUrl = '';
    let videoType = 'm3u8';

    if (videoData.hls_url) {
      videoUrl = videoData.hls_url;
    } else if (videoData.video && videoData.video.url) {
      videoUrl = videoData.video.url;
      videoType = 'mp4';
    }

    if (!videoUrl) {
      return res.status(400).json({ success: false, message: '无法获取视频播放地址' });
    }

    res.json({
      success: true,
      data: { id: parseInt(id), title: newsItem.title, videoId, videoUrl, videoType }
    });
  } catch (error) {
    console.error('获取视频地址错误:', error.message);
    res.status(500).json({ success: false, message: '获取视频地址失败：' + error.message });
  }
});

/**
 * @route   GET /api/video/proxy
 * @desc    视频代理接口
 */
router.get('/video/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: '缺少 url 参数' });
    }

    const decodedUrl = decodeURIComponent(url);
    
    const response = await axios.get(decodedUrl, { 
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://tv.cctv.com/'
      }
    });

    // 转发响应的 content-type
    res.set('Content-Type', response.headers['content-type'] || 'video/mp2t');
    response.data.pipe(res);
  } catch (error) {
    console.error('视频代理失败:', error.message);
    res.status(500).json({ success: false, message: '视频代理失败' });
  }
});

module.exports = router;
