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
 * 判断新闻是否为视频类型
 * CCTV 视频新闻的特征：
 * - 域名 tv.cctv.com
 * - URL 路径中包含 /VIDE（视频内容ID前缀）
 * - 域名 video.cctv.com
 */
function isVideoUrl(url) {
  if (!url) return false;
  return url.includes('tv.cctv.com') || url.includes('/VIDE') || url.includes('video.cctv.com');
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
    let fullContent = newsItem.content || newsItem.summary || '';

    // 如果有 source_url，实时抓取完整内容
    if (newsItem.source_url) {
      try {
        const htmlRes = await axios.get(newsItem.source_url, { timeout: 15000 });
        const html = htmlRes.data;

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
    newsItem.type = isVideoUrl(newsItem.source_url) ? 'video' : 'article';

    res.json({ success: true, data: newsItem });
  } catch (error) {
    console.error('获取新闻完整内容错误:', error.message);
    res.status(500).json({ success: false, message: '获取新闻完整内容失败：' + error.message });
  } finally {
    if (pool) await pool.end();
  }
});

module.exports = router;
