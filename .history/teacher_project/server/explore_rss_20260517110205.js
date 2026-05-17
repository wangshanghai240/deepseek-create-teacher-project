const axios = require('axios');

async function main() {
  // Try Xinhua RSS feeds
  const feeds = [
    { name: '高层', url: 'http://www.news.cn/politics/leaders/' },
    { name: '时政', url: 'http://www.news.cn/politics/' },
    { name: '国际', url: 'http://www.news.cn/world/' },
    { name: '人事', url: 'http://www.news.cn/politics/xhrs/' },
    { name: '新华网首页', url: 'http://www.news.cn/' },
  ];
  
  for (const feed of feeds) {
    try {
      const r = await axios.get(feed.url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const h = r.data;
      
      // Find article links with titles
      const linkRegex = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      const articles = [];
      let match;
      while ((match = linkRegex.exec(h)) !== null) {
        const text = match[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        const url = match[1];
        if (text.length > 10 && text.length < 100 && !text.includes('{') && 
            (url.includes('.htm') || url.includes('.html')) &&
            !url.includes('javascript') && !text.includes('copyright') &&
            !text.includes('Copyright')) {
          // Full URL
          let fullUrl = url;
          if (url.startsWith('//')) fullUrl = 'https:' + url;
          else if (url.startsWith('/')) fullUrl = 'https://www.news.cn' + url;
          
          articles.push({ title: text.substring(0, 50), url: fullUrl });
        }
      }
      
      console.log(feed.name + ': ' + articles.length + ' articles');
      articles.slice(0, 5).forEach(a => console.log('  ' + a.title));
      
      // Also check for any JSON feeds
      const jsonLinks = h.match(/https?:\/\/[^"']+(json|ajax|api|data)[^"']*/gi);
      if (jsonLinks) console.log('  JSON/API:', jsonLinks.slice(0, 3));
      
    } catch(e) {
      console.log(feed.name + ': ' + e.message.substring(0, 40));
    }
  }
}
main().catch(e => console.error(e.message));
