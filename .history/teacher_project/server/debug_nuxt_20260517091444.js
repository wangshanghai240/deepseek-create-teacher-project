const axios = require('axios');
async function main() {
  const r = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=5', {
    timeout: 10000,
    headers: {'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html'}
  });
  const html = r.data;
  const match = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  const data = JSON.parse(match[1]);
  
  const strings = {};
  for (let i = 0; i < data.length; i++) {
    if (typeof data[i] === 'string') strings[i] = data[i];
  }
  
  // Find objects that have share_url or url
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const keys = Object.keys(item);
      if (keys.includes('share_url') || keys.includes('url')) {
        console.log('[' + i + '] has share_url/url:', JSON.stringify(item).substring(0, 300));
        // Resolve values to see actual content
        for (const [key, val] of Object.entries(item)) {
          if (typeof val === 'number' && strings[val]) {
            console.log('   ' + key + ' -> [' + val + ']', strings[val].substring(0, 100));
          } else {
            console.log('   ' + key + ' ->', JSON.stringify(val));
          }
        }
        console.log('');
      }
    }
  }
}
main().catch(e => console.error(e));
