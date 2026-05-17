const express = require('express');
const axios = require('axios');
const router = express.Router();

// 从 peopleapp.com HTML 中提取文章列表
// 使用正则从 SSR 页面中提取文章标题、链接和图片
function extractArticlesFromHtml(html) {
  const articles = [];
  const seenTitles = new Set();
  
  // 方法1: 从页面中的标题文本块匹配文章标题
  // peopleapp.com 在 HTML 中直接包含文章标题文本
  const textBlocks = html.match(/>([^<>]{10,80})</g) || [];
  const uniqueTexts = [...new Set(textBlocks.map(t => t.replace(/^>|<$/g, '').trim()))]
    .filter(t => t.length > 8 && t.length < 80 && /[\u4e00-\u9fff]/.test(t) 
      && !t.includes('{') && !t.includes(';') && !t.includes('//') && !t.includes('.com')
      && !t.includes('function') && !t.includes('var ') && !t.includes('copyright')
      && !t.includes('Copyright') && !t.includes('All rights') && !t.includes('//'));
  
  // 这些文本块中包含文章标题，但不是所有标题都有对应的文章链接
  // 把这些作为基本文章标题，以 peopleapp.com 的搜索链接作为 URL
  for (const text of uniqueTexts) {
    if (!seenTitles.has(text)) {
      seenTitles.add(text);
    }
  }

  // 方法2: 从 NUXT 格式数据中提取更完整的信息（包含图片和链接）
  // 查找 data-ssr 脚本中的数据
  const dataScript = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  if (dataScript) {
    try {
      const rawData = JSON.parse(dataScript[1]);
      
      // 构建字符串索引
      const strings = {};
      for (let i = 0; i < rawData.length; i++) {
        if (typeof rawData[i] === 'string') strings[i] = rawData[i];
      }

      // 快速扫描所有数组元素，提取标题和 newsTxt
      for (let i = 0; i < rawData.length; i++) {
        const item = rawData[i];
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          // 找到标题引用
          let titleIdx = null;
          let newsTxtIdx = null;
          let imageIdx = null;
          let urlIdx = null;
          let timeIdx = null;
          let idIdx = null;
          
          for (const [key, val] of Object.entries(item)) {
            if ((key === 'title' || key === 'Title') && typeof val === 'number') titleIdx = val;
            if (key === 'newsTxt' && typeof val === 'number') newsTxtIdx = val;
            if ((key === 'image' || key === 'image_url') && typeof val === 'number') imageIdx = val;
            if ((key === 'share_url' || key === 'url') && typeof val === 'number') urlIdx = val;
            if ((key === 'create_time' || key === 'publish_time') && typeof val === 'number') timeIdx = val;
            if ((key === 'newsId' || key === 'relId' || key === 'id') && typeof val === 'number') idIdx = val;
          }
          
          if (titleIdx !== null && strings[titleIdx]) {
            const title = strings[titleIdx];
            if (title.length > 5 && !seenTitles.has(title)) {
              seenTitles.add(title);
              
              const newsTxt = newsTxtIdx !== null && strings[newsTxtIdx] ? strings[newsTxtIdx] : '';
              let image = imageIdx !== null && strings[imageIdx] ? strings[imageIdx] : '';
              if (image.startsWith('//')) image = 'https:' + image;
              
              const shareUrl = urlIdx !== null && strings[urlIdx] ? strings[urlIdx] : '';
              const fullUrl = shareUrl.startsWith('http') ? shareUrl : 
                            (shareUrl ? 'https://www.peopleapp.com' + shareUrl : '');
              const createTime = timeIdx !== null && strings[timeIdx] ? strings[timeIdx] : '';
              const newsId = idIdx !== null && strings[idIdx] ? strings[idIdx] : i;

              let summary = newsTxt.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
              if (summary.length > 200) summary = summary.substring(0, 200);

              articles.push({
                id: `renmin_${newsId}`,
                title,
                summary: summary || '暂无摘要',
                content: newsTxt || '',
                image,
                time: createTime,
                source: '人民日报',
                url: fullUrl
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('NUXT 解析失败:', e.message);
    }
  }

  // 如果 NUXT 方式提取不到足够文章，回退到纯文本提取
  if (articles.length < 5) {
    const textOnlyTitles = [...new Set(textBlocks.map(t => t.replace(/^>|<$/g, '').trim()))]
      .filter(t => t.length > 10 && t.length < 80 && /[\u4e00-\u9fff]/.test(t) 
        && !t.includes('{') && !t.includes(';') && !t.includes('//') && !t.includes('.com')
        && !t.includes('function') && !t.includes('var ') && !t.toLowerCase().includes('copyright')
        && !t.includes('//') && !t.includes('冀') && !t.includes('京ICP')
        && !t.includes('京公网') && !t.includes('互联网'));

    for (const title of textOnlyTitles) {
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
