const axios = require('axios');
async function main() {
  const urls = [
    'https://www.news.cn/politics/leaders/',
    'https://www.news.cn/politics/',
    'https://www.news.cn/',
    'https://www.xinhuanet.com/politics/',
  ];
  for (const url of urls) {
    try {
      const r = await axios.get(url, {timeout:10000, headers:{'User-Agent':'Mozilla/5.0'}});
      console.log(url.substring(0,50) + ': ' + r.status + ' len=' + r.data.length);
      if (r.status === 200) {
        const articles = r.data.match(/\/20\d{6}\/[a-f0-9]+\/[^"']+/g);
        console.log('  Article links: ' + (articles ? articles.length : 0));
        if (articles) {
          articles.slice(0, 5).forEach(a => {
            const fullUrl = a.startsWith('http') ? a : 'https://www.news.cn' + a;
            console.log('  -> ' + fullUrl.substring(0, 80));
          });
        }
      }
    } catch(e) {
      console.log(url.substring(0,50) + ': ERROR ' + e.message.substring(0, 40));
    }
  }
}
main().catch(e => console.error(e.message));
