const axios = require('axios');
async function main() {
  const urls = [
    'https://m.news.cn',
    'https://www.news.cn',
    'https://m.news.cn/politics/',
    'https://m.news.cn/world/',
    'https://www.news.cn/gaoceng/',
    'https://m.news.cn/politics/xhrs/',
  ];
  
  for (const url of urls) {
    try {
      const r = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' } });
      const h = r.data;
      const title = (h.match(/<title>([^<]+)<\/title>/) || [])[1] || 'N/A';
      const articles = (h.match(/\/home\/\d+\/[a-f0-9]+\/c\.html/g) || []).length;
      console.log(url.substring(0,45) + ' | ' + title.substring(0,25) + ' | ' + articles + ' articles');
    } catch(e) {
      console.log(url.substring(0,45) + ' | ERROR: ' + e.message.substring(0, 40));
    }
  }
}
main().catch(e => console.error(e.message));
