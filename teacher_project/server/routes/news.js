const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');
const router = express.Router();

const dbPoolConfig = {
  host: 'mysql.sqlpub.com',
  port: 3306,
  user: 'wangshanghai',
  password: 'TZw5UYxoPEhwNAM3',
  database: 'wang_tom'
};

/**
 * 从 URL 判断新闻是否为视频类型
 * CCTV 视频新闻的特征：
 * - 域名 tv.cctv.com
 * - URL 路径中包含 VIDE（视频内容ID前缀）
 * - 域名 video.cctv.com
 */
function isVideoUrl(url) {
  if (!url) return false;
  // CCTV 视频专用域名
  if (url.includes('tv.cctv.com')) return true;
  if (url.includes('video.cctv.com')) return true;
  // 内容ID以 VIDE 开头（视频ID标识）
  const pathname = url.replace(/https?:\/\//, '');
  if (pathname.includes('/VIDE')) return true;
  return false;
}

/**
 * 从页面 HTML 内容判断是否为视频页面
 * 在 /full 接口中抓取页面后调用，比 URL 判断更准确
 */
function isVideoPage(html) {
  if (!html) return false;
  // contentid 以 VIDE 开头是视频
  const idMatch = html.match(/contentid["']?\s*content=["']([^"']+)["']/);
  if (idMatch && idMatch[1].startsWith('VIDE')) return true;
  // 标题带 [栏目标题] 前缀通常是视频（如 [新闻直播间]xxx）
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch && /^\[.+\]/.test(titleMatch[1])) return true;
  // 页面包含 htmlVideoCode（内嵌视频代码）
  if (html.includes('htmlVideoCode')) return true;
  // 页面没有 contentdate 但有视频播放器相关元素
  if (!html.includes('contentdate') && (html.includes('class="player"') || html.includes('video-player'))) return true;
  return false;
}

/**
 * @route   GET /api/news
 * @desc    获取新闻列表（按时间倒序）
 * @query   page - 页码（默认1）
 * @query   limit - 每页条数（默认20）
 */
router.get('/news', async (req, res) => {
  let pool;
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    pool = mysql.createPool(dbPoolConfig);

    // 查询总数
    const [countResult] = await pool.execute('SELECT COUNT(*) AS total FROM news');
    const total = countResult[0].total;

    // 查询列表
    const [rows] = await pool.execute(
      `SELECT id, title, summary, reporter, source, source_url, image_url, created_at FROM news ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`
    );

    // 标记每条新闻的类型：视频或文章
    const list = rows.map(item => ({
      ...item,
      type: isVideoUrl(item.source_url) ? 'video' : 'article'
    }));

    res.json({
      success: true,
      data: {
        list,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取新闻列表错误:', error.message);
    res.status(500).json({ success: false, message: '获取新闻失败：' + error.message });
  } finally {
    if (pool) await pool.end();
  }
});

/**
 * @route   GET /api/news/:id
 * @desc    获取新闻详情
 */
router.get('/news/:id', async (req, res) => {
  let pool;
  try {
    const { id } = req.params;

    pool = mysql.createPool(dbPoolConfig);

    const [rows] = await pool.execute(
      'SELECT id, title, summary, content, reporter, source, source_url, image_url, created_at FROM news WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '新闻不存在' });
    }

    const newsItem = rows[0];
    newsItem.type = isVideoUrl(newsItem.source_url) ? 'video' : 'article';
    res.json({ success: true, data: newsItem });
  } catch (error) {
    console.error('获取新闻详情错误:', error.message);
    res.status(500).json({ success: false, message: '获取新闻详情失败：' + error.message });
  } finally {
    if (pool) await pool.end();
  }
});

/**
 * @route   GET /api/news/:id/full
 * @desc    获取新闻详情，并实时从原文抓取完整内容
 */
router.get('/news/:id/full', async (req, res) => {
  let pool;
  try {
    const { id } = req.params;

    pool = mysql.createPool(dbPoolConfig);

    const [rows] = await pool.execute(
      'SELECT id, title, summary, content, reporter, source, source_url, image_url, created_at FROM news WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '新闻不存在' });
    }

    const newsItem = rows[0];
    newsItem.type = isVideoUrl(newsItem.source_url) ? 'video' : 'article';
    let fullContent = newsItem.content || newsItem.summary || '';

    // 如果有 source_url，实时抓取完整内容
    if (newsItem.source_url) {
      try {
        const htmlRes = await axios.get(newsItem.source_url, { timeout: 15000 });
        const html = htmlRes.data;

        // 用页面特征修正 type（比 URL 判断更准确）
        if (isVideoPage(html)) {
          newsItem.type = 'video';
        }

        // 方式1: 从 JavaScript 变量 contentdate 中提取（CCTV 常见方式）
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
          if (text.length > 100) {
            fullContent = text;
          }
        }

        // 如果 contentdate 方式没取到，尝试传统 HTML DOM 选择器
        if (fullContent === (newsItem.content || newsItem.summary || '')) {
          const patterns = [
          /<div class="content_body"[^>]*>([\s\S]*?)<\/div>\s*<div class="(?:edit|pagefun|share)"/,
          /<div class="cnt_bd"[^>]*>([\s\S]*?)<\/div>\s*<!--\s*(?:责任编辑|编辑)/,
          /<article[^>]*>([\s\S]*?)<\/article>/,
          /<div class="article-body"[^>]*>([\s\S]*?)<\/div>/,
          /<div class="content"[^>]*>([\s\S]*?)<\/div>\s*<div class="(?:edit|foot)"/,
          /<!--(?:begin)?content-->([\s\S]*?)<!--endcontent-->/,
          /<div class="text"[^>]*>([\s\S]*?)<\/div>\s*<div class="(?:page|func|share)"/,
          /<div class="detail"[^>]*>([\s\S]*?)<\/div>\s*<div class="(?:foot|more|share)"/,
          /<section[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/section>/,
          /<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/,
          /<div[^>]*class="[^"]*main-content[^"]*"[^>]*>([\s\S]*?)<\/div>/,
        ];

        for (const pattern of patterns) {
          const m = html.match(pattern);
          if (m) {
            // 清理 HTML，保留段落结构
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

            if (text.length > 100) {
              fullContent = text;
              break;
            }
          }
        }

        }

        // 如果上面的正则都匹配不到，尝试提取所有正文段落
        if (fullContent === (newsItem.content || newsItem.summary || '')) {
          const pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
          if (pMatches) {
            let combined = pMatches
              .map(p => p.replace(/<[^>]+>/g, '').trim())
              .filter(t => t.length > 10)
              .join('\n\n');
            if (combined.length > 200) {
              fullContent = combined;
            }
          }
        }
      } catch (fetchErr) {
        console.error('抓取原文失败:', fetchErr.message);
        // 抓取失败时，使用数据库中已有的内容
      }
    }

    newsItem.fullContent = fullContent;

    res.json({ success: true, data: newsItem });
  } catch (error) {
    console.error('获取新闻完整内容错误:', error.message);
    res.status(500).json({ success: false, message: '获取新闻完整内容失败：' + error.message });
  } finally {
    if (pool) await pool.end();
  }
});

/**
 * @route   GET /api/news/:id/video
 * @desc    获取新闻视频的真实播放地址（m3u8/mp4）
 *          通过 CCTV 官方 API 获取，后端代理转发以绕过 referer 限制
 */
router.get('/news/:id/video', async (req, res) => {
  let pool;
  try {
    const { id } = req.params;
    pool = mysql.createPool(dbPoolConfig);

    const [rows] = await pool.execute(
      'SELECT id, title, source_url FROM news WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '新闻不存在' });
    }

    const newsItem = rows[0];

    if (!newsItem.source_url) {
      return res.status(400).json({ success: false, message: '该新闻没有视频源地址' });
    }

    // 第一步：从视频页面提取 guid
    const pageRes = await axios.get(newsItem.source_url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://tv.cctv.com/'
      }
    });
    const html = pageRes.data;

    // 提取 guid（视频唯一标识）
    const guidMatch = html.match(/guid\s*=\s*['"]\s*([^'"]+)['"]/);
    if (!guidMatch) {
      return res.status(400).json({ success: false, message: '无法获取视频标识' });
    }
    const guid = guidMatch[1].trim();

    // 第二步：通过 CCTV vdn API 获取视频播放地址（包含 m3u8）
    // 注意：guid 不是 pid，需要用 vdn.apps.cntv.cn 接口
    const apiUrl = `https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=${guid}`;
    const apiRes = await axios.get(apiUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://tv.cctv.com/'
      }
    });

    const videoData = apiRes.data;
    let videoUrl = '';
    let videoType = 'm3u8';

    // 优先使用 hls_url（m3u8 流）
    if (videoData.hls_url) {
      videoUrl = videoData.hls_url;
    } else if (videoData.video && videoData.video.url) {
      // 兜底使用 video.url（mp4）
      videoUrl = videoData.video.url;
      videoType = 'mp4';
    }

    if (!videoUrl) {
      return res.status(400).json({ success: false, message: '无法获取视频播放地址' });
    }

    res.json({
      success: true,
      data: {
        id: parseInt(id),
        title: newsItem.title,
        guid,
        videoUrl,
        videoType
      }
    });
  } catch (error) {
    console.error('获取视频地址错误:', error.message);
    res.status(500).json({ success: false, message: '获取视频地址失败：' + error.message });
  } finally {
    if (pool) await pool.end();
  }
});

/**
 * @route   GET /api/video/proxy
 * @desc    视频代理接口，用于绕过 CCTV 的 referer 限制
 *          代理 m3u8 和 ts 视频分片请求
 * @query   url - 需要代理的视频文件地址
 */
router.get('/video/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: '缺少 url 参数' });
    }

    const decodedUrl = decodeURIComponent(url);
    
    const response = await axios.get(decodedUrl, {
      timeout: 30000,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://tv.cctv.com/',
        'Origin': 'https://tv.cctv.com'
      }
    });

    // 设置响应头
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range');

    // 如果是 m3u8 文件，需要代理重写内部的 URL
    // m3u8 的 content-type 可能是 application/x-mpegURL 或 application/vnd.apple.mpegURL
    const isM3u8 = contentType.includes('mpegurl') || contentType.includes('m3u8') || 
                   decodedUrl.replace(/\?.*$/, '').endsWith('.m3u8');
    if (isM3u8) {
      let data = '';
      response.data.on('data', (chunk) => { data += chunk.toString(); });
      response.data.on('end', () => {
        // 从原始 URL 中提取基础路径
        const urlObj = new URL(decodedUrl.replace(/\?.*$/, ''));
        const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf('/') + 1);
        const protocolHost = urlObj.protocol + '//' + urlObj.host;
        
        // 重写 m3u8 中的 ts/m3u8 地址，使其也通过代理
        const rewritten = data.replace(/([^\n]+\.(ts|m3u8)[^\n]*)/gi, (match) => {
          const line = match.trim();
          if (line.startsWith('http')) {
            return `/api/video/proxy?url=${encodeURIComponent(line)}`;
          } else if (line.startsWith('/')) {
            return `/api/video/proxy?url=${encodeURIComponent(protocolHost + line)}`;
          } else {
            return `/api/video/proxy?url=${encodeURIComponent(baseUrl + line)}`;
          }
        });
        res.send(rewritten);
      });
    } else {
      // 代理 ts/mp4 等二进制流 - 先收集完整数据再发送，避免 chunked 传输
      const chunks = [];
      response.data.on('data', (chunk) => chunks.push(chunk));
      response.data.on('end', () => {
        const buffer = Buffer.concat(chunks);
        res.setHeader('Content-Length', buffer.length);
        res.end(buffer);
      });
    }
  } catch (error) {
    console.error('视频代理错误:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: '视频代理失败' });
    }
  }
});

module.exports = router;
