const axios = require('axios');
async function main() {
  // Try different API patterns that the SPA might use
  const patterns = [
    'https://www.peopleapp.com/api/rmrb-bff-display-zh/display/zh/c/pc/article/' + '500007496031',
    'https://www.peopleapp.com/api/v2/article/' + '500007496031',
    'https://www.peopleapp.com/api/v2/content/' + '500007496031',
    'https://www.peopleapp.com/api/article/' + '500007496031',
  ];
  
  for (const url of patterns) {
    try {
      const r = await axios.get(url, {
        timeout: 5000,
        headers: {'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'}
      });
      const data = typeof r.data === 'string' ? r.data.substring(0, 100) : JSON.stringify(r.data).substring(0, 100);
      const isJSON = typeof r.data === 'object' || (typeof r.data === 'string' && r.data.startsWith('{'));
      console.log(url.split('?')[0] + ': status=' + r.status + ' json=' + isJSON + ' data=' + data.substring(0, 60));
    } catch(e) {
      console.log(url.split('?')[0] + ': ' + e.message.substring(0, 40));
    }
  }
  
  // Also check the NUXT config for article API
  const feed = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20', {
    timeout: 10000, headers: {'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html'}
  });
  const ds = feed.data.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  const d = JSON.parse(ds[1]);
  const strings = {};
  for (let i = 0; i < d.length; i++) if (typeof d[i] === 'string') strings[i] = d[i];
  
  // Find article content API paths
  for (let i = 0; i < d.length; i++) {
    if (typeof d[i] === 'string' && d[i].includes('/api/') && (d[i].includes('detail') || d[i].includes('article') || d[i].includes('content'))) {
      console.log('NUXT API path [' + i + ']:', d[i]);
    }
  }
}
main().catch(e => console.error(e.message));
