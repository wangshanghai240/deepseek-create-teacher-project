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
    
    // NUXT数据结构是序列化的，需要找到文章列表
    // 查找所有包含 title 和 image_url 等的对象
    function findArticleObjects(obj, depth) {
      if (depth > 7 || !obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            const keys = Object.keys(item);
            // 检查是否是文章对象
            if (keys.includes('title') && keys.includes('image_url') && typeof item.title === 'string') {
              if (item.title.length > 5) {
                console.log('\n=== Article Object ===');
                console.log('Title:', item.title);
                console.log('Keys:', keys.join(', '));
                console.log('Image URL:', item.image_url || '');
                console.log('Summary:', (item.summary || item.digest || '').substring(0, 100));
                console.log('Time:', item.create_time || item.publish_time || item.ctime || '');
                console.log('Content:', item.content ? item.content.substring(0, 100) : 'no content');
                console.log('URL:', item.share_url || item.url || '');
                console.log('Source:', item.source_name || '');
                console.log('Channel ID:', item.channel_id || '');
                console.log('Article ID:', item.article_id || item.id || '');
              }
            }
          }
          findArticleObjects(item, depth + 1);
        }
      } else {
        for (const val of Object.values(obj)) {
          findArticleObjects(val, depth + 1);
        }
      }
    }
    findArticleObjects(data, 0);
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
