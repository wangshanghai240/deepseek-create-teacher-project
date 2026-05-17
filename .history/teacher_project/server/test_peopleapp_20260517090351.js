const axios = require('axios');

async function test() {
  const r = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=5', { 
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://www.peopleapp.com/'
    }
  });
  const html = r.data;
  
  // 提取 __NUXT_DATA__ 的数据
  const match = html.match(/<script type="application\/json" id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (match) {
    const data = JSON.parse(match[1]);
    console.log('Data isArray:', Array.isArray(data), 'Length:', data.length);
    
    // 还原序列化引用数据
    function resolveRef(val) {
      if (typeof val === 'number' && val < data.length) {
        return data[val];
      }
      return val;
    }

    // 查找文章对象（包含title等字段）
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        // 解析引用
        const resolved = {};
        for (const [key, val] of Object.entries(item)) {
          resolved[key] = resolveRef(val);
        }
        if (resolved.title && typeof resolved.title === 'string' && resolved.title.length > 5 && resolved.title.length < 80) {
          console.log('\n[' + i + '] ' + resolved.title);
          console.log('  Image:', (resolved.image || resolved.image_url || '').substring(0, 80));
          console.log('  NewsTxt:', (resolved.newsTxt || '').substring(0, 100));
          console.log('  NewsId:', resolved.newsId || resolved.relId || '');
          console.log('  ShortTitle:', resolved.shortTitle || '');
          console.log('  Source:', resolved.sourceName || resolved.source_name || '');
        }
      }
    }
    console.log('\n--- Done ---');
  } else {
    console.log('No NUXT data found, checking raw HTML for articles...');
    // Look for articles in HTML directly
    const articleMatches = html.match(/article-title[^>]*>([^<]+)</g);
    if (articleMatches) {
      articleMatches.forEach(m => console.log('Found:', m.substring(0, 80)));
    }
  }
}

test().catch(e => console.error(e.message));
