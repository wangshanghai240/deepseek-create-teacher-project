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
    
    // 还原序列化引用数据 - 深度解析
    function deepResolve(val, depth) {
      if (depth > 3) return val;
      if (typeof val === 'number' && val < data.length) {
        const ref = data[val];
        if (ref && typeof ref === 'object') {
          if (Array.isArray(ref)) {
            return ref.map(v => deepResolve(v, depth + 1));
          }
          const resolved = {};
          for (const [k, v] of Object.entries(ref)) {
            resolved[k] = deepResolve(v, depth + 1);
          }
          return resolved;
        }
        return ref;
      }
      return val;
    }

    // 查找文章对象
    const articles = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const resolved = deepResolve(i, 0);
        if (resolved && resolved.title && typeof resolved.title === 'string' && resolved.title.length > 5 && resolved.title.length < 100) {
          const image = typeof resolved.image === 'string' ? resolved.image : 
                        typeof resolved.image_url === 'string' ? resolved.image_url : '';
          const newsTxt = typeof resolved.newsTxt === 'string' ? resolved.newsTxt : '';
          articles.push({
            id: resolved.newsId || resolved.relId || resolved.id || i,
            title: resolved.title,
            summary: newsTxt || '',
            image: image,
            time: resolved.create_time || resolved.publish_time || '',
            source: resolved.sourceName || resolved.source_name || '人民日报',
            url: resolved.share_url || resolved.url || ''
          });
        }
      }
    }

    console.log('\nFound', articles.length, 'articles:\n');
    articles.slice(0, 20).forEach((a, i) => {
      console.log((i+1) + '.', a.title);
      console.log('   Image:', a.image.substring(0, 60) || '(none)');
      console.log('   Summary:', a.summary.substring(0, 80));
      console.log('');
    });
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
