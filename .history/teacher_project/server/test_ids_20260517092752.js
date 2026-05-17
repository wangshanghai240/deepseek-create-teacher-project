const axios = require('axios');

async function main() {
  const r = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20', {
    timeout: 10000,
    headers: {'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html'}
  });
  const html = r.data;
  const m = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  const data = JSON.parse(m[1]);
  
  const strings = {};
  for (let i = 0; i < data.length; i++) {
    if (typeof data[i] === 'string') strings[i] = data[i];
  }

  // Find article objects with title + relId or newsId  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const keys = Object.keys(item);
      if (keys.includes('title') && (keys.includes('relId') || keys.includes('newsId'))) {
        const titleIdx = item.title;
        const title = typeof titleIdx === 'number' && strings[titleIdx] ? strings[titleIdx] : '';
        if (title && title.length > 5) {
          const relId = item.relId;
          const newsId = item.newsId;
          const resolvedRelId = typeof relId === 'number' && data[relId];
          const resolvedNewsId = typeof newsId === 'number' && data[newsId];
          console.log('Title:', title.substring(0, 40));
          console.log('  raw relId:', relId, 'resolved:', typeof resolvedRelId === 'string' ? resolvedRelId : JSON.stringify(resolvedRelId).substring(0, 50));
          console.log('  raw newsId:', newsId, 'resolved:', typeof resolvedNewsId === 'string' ? resolvedNewsId : JSON.stringify(resolvedNewsId).substring(0, 50));
          console.log('  share_url key:', item.share_url !== undefined ? 'yes (idx=' + item.share_url + ')' : 'no');
          console.log('  url key:', item.url !== undefined ? 'yes' : 'no');
          
          // Try constructing article URL
          if (typeof resolvedRelId === 'string' && resolvedRelId.length > 5) {
            console.log('  -> https://www.peopleapp.com/article/' + resolvedRelId);
          }
          if (typeof resolvedNewsId === 'string' && resolvedNewsId.length > 5) {
            console.log('  -> https://www.peopleapp.com/article/' + resolvedNewsId);
          }
          console.log('');
        }
      }
    }
  }
}

main().catch(e => console.error(e.message));
