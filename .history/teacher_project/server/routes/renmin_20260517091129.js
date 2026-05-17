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

// 获取人民日报文章详情（根据 URL 抓取内容）
router.get('/renmin/detail', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.json({ success: false, message: '缺少 URL 参数', data: null });
    }

    // 从 peopleapp.com 搜索页面获取文章内容
    // 先尝试直接用传入的 URL
    let articleUrl = decodeURIComponent(url);
    
    // 如果是搜索链接，尝试搜索
    if (articleUrl.includes('/search?')) {
      const keyword = new URL(articleUrl).searchParams.get('keyword') || '';
      if (keyword) {
        // 从 peopleapp.com 首页搜索
        const searchRes = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20', {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html',
            'Referer': 'https://www.peopleapp.com/'
          }
        });
        
        const html = searchRes.data;
        // 在 HTML 中查找包含该关键词的文章链接
        const linkRegex = /<a[^>]*href="(\/article\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        let foundUrl = '';
        while ((match = linkRegex.exec(html)) !== null) {
          const innerText = match[2].replace(/<[^>]+>/g, '').trim();
          if (innerText.includes(keyword.substring(0, 10))) {
            foundUrl = 'https://www.peopleapp.com' + match[1];
            break;
          }
        }
        
        if (foundUrl) {
          articleUrl = foundUrl;
        }
      }
    }

    // 如果不是 peopleapp.com 的链接，直接返回
    if (!articleUrl.includes('peopleapp.com')) {
      return res.json({
        success: true,
        data: {
          content: '',
          summary: '',
          image: '',
          url: articleUrl
        }
      });
    }

    // 抓取文章详情页
    const detailRes = await axios.get(articleUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://www.peopleapp.com/'
      }
    });

    const detailHtml = detailRes.data;
    
    // 尝试提取文章内容
    let content = '';
    let summary = '';
    let image = '';

    // 方法1: 从 NUXT 数据中找内容
    const dataScript = detailHtml.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
    if (dataScript) {
      try {
        const rawData = JSON.parse(dataScript[1]);
        const strings = {};
        for (let i = 0; i < rawData.length; i++) {
          if (typeof rawData[i] === 'string') strings[i] = rawData[i];
        }
        
        // 找 content 或 newsTxt
        for (let i = 0; i < rawData.length; i++) {
          const item = rawData[i];
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            for (const [key, val] of Object.entries(item)) {
              if ((key === 'content' || key === 'newsTxt' || key === 'content_text') && typeof val === 'number' && strings[val]) {
                const text = strings[val];
                if (text.length > 50) {
                  content = text;
                }
              }
              if ((key === 'image' || key === 'image_url' || key === 'cover') && typeof val === 'number' && strings[val]) {
                image = strings[val].startsWith('//') ? 'https:' + strings[val] : strings[val];
              }
              if ((key === 'title' || key === 'Title') && typeof val === 'number' && strings[val]) {
                if (!summary) summary = strings[val];
              }
            }
          }
        }
      } catch (e) { /* ignore */ }
    }

    // 方法2: 从 HTML meta 标签提取
    if (!content) {
      const metaDesc = detailHtml.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/);
      if (metaDesc) summary = metaDesc[1];
      
      const ogImage = detailHtml.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
      if (ogImage) image = ogImage[1];
      
      // 尝试找文章正文
      const articleContent = detailHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      if (articleContent) {
        content = articleContent[1];
      }
      
      // 尝试找主要内容区域
      if (!content) {
        const mainContent = detailHtml.match(/<div[^>]*class="[^"]*article-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        if (mainContent) content = mainContent[1];
      }
      
      // 如果都没有，用 meta description 作为内容
      if (!content && metaDesc) {
        content = '<p>' + metaDesc[1] + '</p>';
      }
    }

    res.json({
      success: true,
      data: {
        content,
        summary: summary || '',
        image: image.startsWith('//') ? 'https:' + image : image,
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
