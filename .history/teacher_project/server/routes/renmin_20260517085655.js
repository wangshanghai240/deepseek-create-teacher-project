const express = require('express');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const router = express.Router();

// 人民日报文章列表（从人民网 RSS 获取，不存数据库）
router.get('/renmin', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;

    // 从人民网时政频道 RSS 获取文章
    const rssUrl = 'http://www.people.com.cn/rss/politics.xml';
    const response = await axios.get(rssUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    // 解析 XML
    const parser = new XMLParser({
      cdataPropName: '__cdata',
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
    const jsonObj = parser.parse(response.data);

    let items = [];
    if (jsonObj?.rss?.channel?.item) {
      items = jsonObj.rss.channel.item;
    }

    const articles = items.map((item, index) => {
      const title = item.title?.__cdata || item.title || '';
      const link = item.link || '';
      const pubDate = item.pubDate || '';
      const author = item.author || '人民网';
      const description = item.description?.__cdata || item.description || '';

      // 从 description 中提取纯文本作为摘要
      let summary = description
        .replace(/<[^>]+>/g, '')  // 去除 HTML 标签
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 200);

      // 从 description 中提取第一张图片
      let image = '';
      const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/);
      if (imgMatch) {
        let src = imgMatch[1];
        // 处理相对路径
        if (src.startsWith('/')) {
          src = 'http://www.people.com.cn' + src;
        }
        image = src;
      }

      return {
        id: `renmin_${index}`,
        title,
        summary: summary || '暂无摘要',
        content: description, // 完整 HTML 内容
        image,
        time: pubDate,
        source: '人民网',
        url: link
      };
    }).filter(a => a.title);

    // 分页
    const start = (page - 1) * pageSize;
    const paged = articles.slice(start, start + pageSize);

    res.json({
      success: true,
      data: paged,
      total: articles.length,
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
