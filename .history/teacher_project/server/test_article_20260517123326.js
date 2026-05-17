const axios = require('axios');
async function main() {
  // Get homepage and extract today's article URLs
  const home = await axios.get('https://www.news.cn/', {timeout:10000, headers:{'User-Agent':'Mozilla/5.0'}});
  
  // Find all article-like URLs
  const urls = [];
  const regex = /https?:\/\/[^"']*news\.cn\/[^"']*c(?:\.html)?/g;
  let m;
  while ((m = regex.exec(home.data)) !== null) {
    if (m[0].includes('202605')) urls.push(m[0]);
  }
  
  const uniqueUrls = [...new Set(urls)];
  console.log('Found', uniqueUrls.length, 'today article URLs');
  
  // Try to fetch first few
  for (const url of uniqueUrls.slice(0, 5)) {
    try {
      const r = await axios.get(url, {timeout:8000, headers:{'User-Agent':'Mozilla/5.0'}});
      const title = (r.data.match(/<title>([^<]+)<\/title>/) || [])[1] || '';
      const paragraphs = (r.data.match(/<p[^>]*>[\s\S]{50,}?<\/p>/g) || []).length;
      console.log('OK:', url.substring(0,70), '|', title.substring(0,30), '|', paragraphs, 'paragraphs');
    } catch(e) {
      console.log('FAIL:', url.substring(0,70), '|', e.message.substring(0,30));
    }
  }
}
main().catch(e => console.error(e.message));
