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
    
    // 尝试还原这个序列化数据
    // 它看起来是类似な儿ク的序列化格式，用数组索引引用
    // 遍历所有对象，输出有 title 属性的
    for (let i = 0; i < data.length && i < 200; i++) {
      const item = data[i];
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        if (item.title || item.Title) {
          console.log('\n[' + i + ']', JSON.stringify(item).substring(0, 300));
        }
      } else if (item && Array.isArray(item) && item.length > 1) {
        // 可能是[type, data] 格式
        const type = item[0];
        const val = item[1];
        if (typeof type === 'string' && val && typeof val === 'object') {
          if (val.title || val.Title) {
            console.log('\n[' + i + '] type=' + type, JSON.stringify(val).substring(0, 300));
          }
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
