const axios = require('axios');
async function main() {
  const r = await axios.get('https://www.peopleapp.com/rmrb', {timeout:10000,headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html'}});
  const html = r.data;

  // Find all links containing /article/
  const articleLinks = html.match(/\/article\/[^\"]+/g);
  if (articleLinks) {
    const unique = [...new Set(articleLinks)];
    console.log('Found', unique.length, 'article links:');
    unique.slice(0, 20).forEach((link, i) => {
      console.log((i+1) + '. https://www.peopleapp.com' + link);
    });
  } else {
    console.log('No /article/ links found in /rmrb');
  }

  // Also check the feed/list page
  const r2 = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20', {timeout:10000,headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html'}});
  const html2 = r2.data;
  const links2 = html2.match(/\/article\/[^\"]+/g);
  if (links2) {
    const unique2 = [...new Set(links2)];
    console.log('\nIn feed/list, found', unique2.length, 'article links:');
    unique2.slice(0, 20).forEach((link, i) => {
      console.log((i+1) + '. https://www.peopleapp.com' + link);
    });
  } else {
    console.log('\nNo /article/ links found in feed/list');
  }

  // Try finding article URLs in NUXT data of /rmrb
  const dataScript = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  if (dataScript) {
    const data = JSON.parse(dataScript[1]);
    for (let i = 0; i < data.length; i++) {
      if (typeof data[i] === 'string' && data[i].includes('/article/')) {
        console.log('\nNUXT [' + i + ']:', data[i]);
      }
    }
  }
}
main().catch(e => console.error(e.message));
