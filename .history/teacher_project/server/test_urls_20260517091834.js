const axios = require('axios');

async function main() {
  const urls = [
    'https://www.peopleapp.com/rmrb',
    'https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20'
  ];
  
  for (const url of urls) {
    const r = await axios.get(url, {timeout:10000,headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html'}});
    const html = r.data;
    
    // Find all /article/ links
    const articleRegex = /\/article\/[^"']+/g;
    const matches = html.match(articleRegex);
    if (matches) {
      const unique = [...new Set(matches)];
      console.log(url.substring(0, 60) + ': ' + unique.length + ' article links');
      unique.slice(0, 5).forEach(l => console.log('  https://www.peopleapp.com' + l));
    } else {
      console.log(url.substring(0, 60) + ': no article links found');
    }
  }
  
  // Also look for article links in NUXT data
  const r = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20', {timeout:10000,headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html'}});
  const html = r.data;
  const dataScript = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  if (dataScript) {
    const data = JSON.parse(dataScript[1]);
    for (let i = 0; i < data.length; i++) {
      if (typeof data[i] === 'string' && data[i].includes('/article/')) {
        console.log('\nNUXT article URL [' + i + ']:', data[i]);
      }
    }
  }
}

main().catch(e => console.error(e.message));
