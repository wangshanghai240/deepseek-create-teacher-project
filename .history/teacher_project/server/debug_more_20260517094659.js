const axios = require('axios');
async function main() {
  // Try page 2
  const pages = [1, 2, 3];
  for (const page of pages) {
    const r = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=' + page + '&page_size=20', {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
    });
    const html = r.data;
    const ds = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
    const rawData = JSON.parse(ds[1]);
    const strings = {};
    for (let i = 0; i < rawData.length; i++) {
      if (typeof rawData[i] === 'string') strings[i] = rawData[i];
    }
    let count = 0;
    for (let i = 0; i < rawData.length; i++) {
      const item = rawData[i];
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        if (item.title) {
          const t = typeof item.title === 'number' && strings[item.title] ? strings[item.title] : '';
          if (t && t.length > 5 && !t.startsWith('人民日报')) {
            count++;
          }
        }
      }
    }
    console.log('Page ' + page + ': ' + count + ' article objects');
    // Check if all pages have same nuxt data
    if (page > 1) {
      console.log('  Same as page 1:', html === firstHtml ? 'YES' : 'NO');
    }
    if (page === 1) var firstHtml = html;
  }
}
main().catch(e => console.error(e.message));
