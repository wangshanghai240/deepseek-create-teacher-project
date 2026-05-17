const axios = require('axios');
const cheerio = require('cheerio');

async function main() {
  // Check if cheerio is available
  try {
    const $ = cheerio.load('<p>test</p>');
    console.log('cheerio is available');
  } catch(e) {
    console.log('cheerio not installed, installing...');
    return;
  }
  
  const r = await axios.get('https://m.news.cn', {timeout:10000, headers:{'User-Agent':'Mozilla/5.0'}});
  const $ = cheerio.load(r.data);
  
  // Extract all links
  const links = [];
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && text.length > 5) {
      links.push({ text: text.substring(0, 40), href: href.substring(0, 80) });
    }
  });
  
  // Show news article links
  console.log('News links:');
  links.filter(l => l.href.match(/\/\d{8}\//)).slice(0, 10).forEach(l => console.log('  ' + l.text + ' -> ' + l.href));
  
  // Show category links
  console.log('\nCategory links:');
  const cats = ['高层','时政','人事','国际','财经','军事','体育'];
  cats.forEach(cat => {
    const found = links.filter(l => l.text.includes(cat));
    if (found.length > 0) {
      found.slice(0, 2).forEach(l => console.log('  ' + cat + ': ' + l.href));
    } else {
      console.log('  ' + cat + ': NOT FOUND');
    }
  });
  
  // Try fetching first article
  const articleLinks = links.filter(l => l.href.match(/\/\d{8}\//));
  if (articleLinks.length > 0) {
    const articleUrl = articleLinks[0].href.startsWith('http') ? articleLinks[0].href : 'https://m.news.cn' + articleLinks[0].href;
    console.log('\nFetching article:', articleUrl);
    try {
      const ar = await axios.get(articleUrl, {timeout:10000, headers:{'User-Agent':'Mozilla/5.0'}});
      const $a = cheerio.load(ar.data);
      console.log('Title:', $a('title').text());
      console.log('Paragraphs:', $a('p').length);
      console.log('Images:', $a('img').length);
      console.log('Videos:', $a('video').length);
      const firstP = $a('p').first().text();
      if (firstP) console.log('First paragraph:', firstP.substring(0, 80));
    } catch(e) {
      console.log('  Error:', e.message.substring(0, 60));
    }
  }
}
main().catch(e => console.error(e.message));
