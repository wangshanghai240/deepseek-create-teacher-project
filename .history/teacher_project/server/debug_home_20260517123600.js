const axios = require('axios');
async function main() {
  const r = await axios.get('https://www.news.cn/', {timeout:10000, headers:{'User-Agent':'Mozilla/5.0'}});
  const html = r.data;
  
  // Find URLs containing both news.cn and /c
  const allUrls = html.match(/https?:[^"']*news\.cn[^"']*\/c[^"']*/g);
  if (allUrls) {
    const unique = [...new Set(allUrls)].filter(u => u.includes('2026'));
    console.log('Found', unique.length, 'URLs with /c suffix');
    unique.slice(0, 10).forEach(u => console.log(u.substring(0, 80)));
  } else {
    console.log('No matching URLs found');
    // Try simpler pattern
    const simple = html.match(/news\.cn\/[^"'\s<>]+/g);
    if (simple) {
      const unique = [...new Set(simple)].filter(u => u.includes('2026'));
      console.log('Simple pattern found', unique.length);
      unique.slice(0, 10).forEach(u => console.log('https://www.' + u));
    }
  }
}
main().catch(e => console.error(e.message));
