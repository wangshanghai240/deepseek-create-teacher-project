const axios = require('axios');
async function main() {
  const r = await axios.get('https://m.news.cn', {
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const h = r.data;
  console.log('Title:', (h.match(/<title>([^<]+)<\/title>/) || [])[1]);
  console.log('Length:', h.length);
  console.log('Has SSR content:', h.includes('__NUXT__') || h.includes('window.__'));
  
  // Find all links that look like categories
  const links = h.match(/<a[^>]*href="(\/[^"]+)"[^>]*>([^<]{2,30})<\/a>/g);
  if (links) {
    const seen = new Set();
    links.forEach(l => {
      const href = (l.match(/href="([^"]+)"/) || [])[1];
      const text = l.replace(/<[^>]+>/g, '').trim();
      if (text.length > 1 && text.length < 20 && href && !seen.has(href) && !href.includes('http')) {
        seen.add(href);
        if (text.match(/^[\u4e00-\u9fff]/)) console.log(text, '->', href);
      }
    });
  }
  
  // Find possible API endpoints
  const apis = h.match(/\/api\/[^"' ]+/g);
  if (apis) {
    const unique = [...new Set(apis)];
    console.log('\nAPI endpoints:', unique.slice(0, 15));
  }
}
main().catch(e => console.error(e.message));
