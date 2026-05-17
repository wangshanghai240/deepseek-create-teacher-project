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
    
    // 先看看数据结构的顶层有哪些key
    function exploreStructure(obj, depth, path) {
      if (depth > 3 || !obj) return;
      if (Array.isArray(obj)) {
        if (obj.length > 0 && typeof obj[0] === 'object') {
          console.log(path, '-> Array[' + obj.length + ']');
          if (depth < 3) exploreStructure(obj[0], depth + 1, path + '[0]');
        } else if (obj.length > 0) {
          console.log(path, '-> Array[' + obj.length + ']', typeof obj[0], ':', String(obj[0]).substring(0, 60));
        }
      } else if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        console.log(path, '{', keys.slice(0, 15).join(', '), (keys.length > 15 ? '...' : ''), '}');
        if (depth < 3) {
          for (const key of keys) {
            if (key === 'data' || key === 'list' || key === 'items' || key === 'result' || key === 'newsList' || key.includes('article') || key.includes('news')) {
              exploreStructure(obj[key], depth + 1, path + '.' + key);
            }
          }
        }
      }
    }
    exploreStructure(data, 0, 'root');
    
    // 查找所有字符串值看看有没有文章标题
    function findStrings(obj, depth) {
      if (depth > 4 || !obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (typeof item === 'string' && item.length > 10 && item.length < 100) {
            console.log('String:', item);
          }
          findStrings(item, depth + 1);
        }
      } else {
        for (const val of Object.values(obj)) {
          findStrings(val, depth + 1);
        }
      }
    }
    findStrings(data, 0);
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
