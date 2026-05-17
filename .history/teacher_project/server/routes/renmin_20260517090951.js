const express = require('express');
const axios = require('axios');
const router = express.Router();

// 从 peopleapp.com HTML 中提取文章标题
// peopleapp.com 是 SSR 页面，文章标题直接以文本形式存在于 HTML 中
function extractArticlesFromHtml(html) {
  const articles = [];
  const seenTitles = new Set();

  // 在 HTML 的纯文本块中提取所有可能是文章标题的文本
  // 格式: >文本内容<  其中文本长度10-80字，包含中文
  const textBlocks = html.match(/>([^<>]{10,80})</g) || [];
  const uniqueTexts = [...new Set(textBlocks.map(t => t.replace(/^>|<$/g, '').trim()))]
    .filter(t => {
      // 必须是中文文本
      if (!/[\u4e00-\u9fff]/.test(t)) return false;
      // 排除非标题文本
      if (t.includes('//') || t.includes('.com') || t.includes('.cn')) return false;
      if (t.includes('function') || t.includes('var ') || t.includes('this.')) return false;
      if (t.toLowerCase().includes('copyright') || t.includes('All rights')) return false;
      if (t.includes('京ICP') || t.includes('京公网') || t.includes('冀') || t.includes('互联网新闻')) return false;
      if (t.includes('{') || t.includes(';') || t.includes('//')) return false;
      if (t.startsWith('VITE_') || t.startsWith('http')) return false;
      return true;
    });

  // 进一步过滤：去掉看起来不像文章标题的文本
  const titleCandidates = uniqueTexts.filter(t => {
    // 文章标题通常是一句完整的话，以句号/感叹号/问号/省略号结尾或没有标点
    // 排除明显的非标题：纯数字、太短、特定系统文本
    if (t.length < 10) return false;
    if (/^[\d\s%\.#]+$/.test(t)) return false;
    if (t.includes('像素') || t.includes('px') || t.includes('font-size')) return false;
    return true;
  });

  for (const title of titleCandidates) {
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

module.exports = router;
