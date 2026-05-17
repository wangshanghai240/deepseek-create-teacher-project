const axios = require('axios');

async function main() {
  console.log('=== Fetching m.news.cn ===');
  const r = await axios.get('https://m.news.cn/', {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const h = r.data;
  console.log('Status:', r.status);
  console.log('HTML length:', h.length);
  
  // Title
  const title = h.match(/<title>([^<]+)<\/title>/);
  console.log('Title:', title ? title[1] : 'N/A');
  
  // Find navigation/menu items
  const navs = h.match(/(?:>)([\u4e00-\u9fff]{2,6})(?:<)/g);
  if (navs) {
    const unique = [...new Set(navs.map(n => n.replace(/[<>]/g, '')))];
    console.log('\nChinese text blocks:', unique.filter(t => 
      ['高层','时政','人事','国际','军事','财经','社会','科技','体育','文化','评论','视频',
       '新华网','新华社','新闻','要闻','国内','焦点','直播','图片','法治','深度','健康'].includes(t)
    ));
  }
  
  // Find all links
  const links = h.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi);
  if (links) {
    const categories = [];
    for (const link of links) {
      const text = link.replace(/<[^>]+>/g, '').trim();
      const href = link.match(/href="([^"]+)"/);
      const url = href ? href[1] : '';
      if (text.length <= 6 && text.length >= 2 && url) {
        categories.push({ text, url });
      }
    }
    console.log('\nPossible category links:');
    const seen = new Set();
    categories.filter(c => !seen.has(c.text) && seen.add(c.text))
      .forEach(c => console.log('  ' + c.text + ' -> ' + c.url.substring(0, 60)));
  }
  
  // Find script tags with data/config
  const scripts = h.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
  if (scripts) {
    for (const s of scripts) {
      if (s.includes('window.__NUXT__') || s.includes('window.__INITIAL') || s.includes('channel') || s.includes('category')) {
        console.log('\nFound config script:', s.substring(0, 500));
        break;
      }
    }
  }
  
  // Check for RSS/API feeds
  const feeds = h.match(/https?:\/\/[^"']+(rss|feed|api|json)[^"']*/gi);
  if (feeds) console.log('\nFeeds/API:', feeds.slice(0, 5));
}
main().catch(e => console.error(e.message));
