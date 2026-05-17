const axios = require('axios');

async function test() {
  const r = await axios.get('https://www.peopleapp.com/rmrb', { 
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Referer': 'https://www.peopleapp.com/'
    }
  });
  const html = r.data;
  
  // 提取文章链接 <a href="...">text</a>
  const articleRegex = /<a[^>]*href="(\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const articles = [];
  const seen = new Set();
  
  let match;
  while ((match = articleRegex.exec(html)) !== null) {
    const url = match[1];
    const inner = match[2];
    const text = inner.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    
    const imgMatch = inner.match(/<img[^>]*src="([^"]+)"/);
    const img = imgMatch ? imgMatch[1] : '';
    
    if (text.length > 10 && text.length < 100 && !seen.has(text)) {
      seen.add(text);
      const fullUrl = url.startsWith('http') ? url : 'https://www.peopleapp.com' + url;
      const fullImg = img.startsWith('http') ? img : (img ? 'https://www.peopleapp.com' + img : '');
      articles.push({ title: text, url: fullUrl, image: fullImg });
    }
  }
  
  console.log('Found', articles.length, 'articles:\n');
  articles.slice(0, 30).forEach((a, i) => {
    console.log((i+1) + '.', a.title);
    console.log('   URL:', a.url);
    console.log('   Image:', a.image || '(none)');
    console.log('');
  });
}

test().catch(e => console.error(e.message));
