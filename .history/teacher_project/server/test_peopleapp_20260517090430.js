const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  // 直接获取人民日报频道首页
  const r = await axios.get('https://www.peopleapp.com/rmrb', { 
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Referer': 'https://www.peopleapp.com/'
    }
  });
  const html = r.data;
  
  // 尝试用 cheerio 解析 HTML
  const $ = cheerio.load(html);
  
  // 查找文章链接和标题
  const articles = [];
  $('a[href*="/article/"]').each((i, el) => {
    const href = $(el).attr('href');
    const title = $(el).attr('title') || $(el).text().trim() || $(el).find('img').attr('alt') || '';
    if (title && title.length > 5) {
      articles.push({ title: title.substring(0, 80), url: href });
    }
  });
  
  if (articles.length > 0) {
    console.log('Found', articles.length, 'articles from links:');
    articles.slice(0, 20).forEach((a, i) => console.log((i+1) + '.', a.title, '->', a.url));
  } else {
    console.log('No articles from links, trying selectors...');
    // 尝试更通用的选择器
    $('a').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 10 && text.length < 80 && $(el).attr('href') && !$(el).attr('href').startsWith('#')) {
        console.log('Link:', text.substring(0, 60), '->', $(el).attr('href').substring(0, 80));
      }
    });
  }
    
    // 还原序列化引用数据 - 深度解析
    function deepResolve(val, depth) {
      if (depth > 3) return val;
      if (typeof val === 'number' && val < data.length) {
        const ref = data[val];
        if (ref && typeof ref === 'object') {
          if (Array.isArray(ref)) {
            return ref.map(v => deepResolve(v, depth + 1));
          }
          const resolved = {};
          for (const [k, v] of Object.entries(ref)) {
            resolved[k] = deepResolve(v, depth + 1);
          }
          return resolved;
        }
        return ref;
      }
      return val;
    }

    // 查找文章对象
    const articles = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const resolved = deepResolve(i, 0);
        if (resolved && resolved.title && typeof resolved.title === 'string' && resolved.title.length > 5 && resolved.title.length < 100) {
          const image = typeof resolved.image === 'string' ? resolved.image : 
                        typeof resolved.image_url === 'string' ? resolved.image_url : '';
          const newsTxt = typeof resolved.newsTxt === 'string' ? resolved.newsTxt : '';
          articles.push({
            id: resolved.newsId || resolved.relId || resolved.id || i,
            title: resolved.title,
            summary: newsTxt || '',
            image: image,
            time: resolved.create_time || resolved.publish_time || '',
            source: resolved.sourceName || resolved.source_name || '人民日报',
            url: resolved.share_url || resolved.url || ''
          });
        }
      }
    }

    console.log('\nFound', articles.length, 'articles:\n');
    articles.slice(0, 20).forEach((a, i) => {
      console.log((i+1) + '.', a.title);
      console.log('   Image:', a.image.substring(0, 60) || '(none)');
      console.log('   Summary:', a.summary.substring(0, 80));
      console.log('');
    });
    console.log('\n--- Done ---');
  } else {
    console.log('No NUXT data found, checking raw HTML for articles...');
    // Look for articles in HTML directly
    const articleMatches = html.match(/article-title[^>]*>([^<]+)</g);
    if (articleMatches) {
      articleMatches.forEach(m => console.log('Found:', m.substring(0, 80)));
    }
  }
}

test().catch(e => console.error(e.message));
