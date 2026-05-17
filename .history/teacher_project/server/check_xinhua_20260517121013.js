const axios = require('axios');
async function main() {
  // Get article links from homepage
  const home = await axios.get('https://m.news.cn', {timeout:10000, headers:{'User-Agent':'Mozilla/5.0'}});
  const links = [...new Set(home.data.match(/\/home\/\d+\/[a-f0-9]+\/c\.html/g) || [])];
  console.log('Found', links.length, 'article links on homepage');
  
  if (links.length > 0) {
    const articleUrl = 'https://m.news.cn' + links[0];
    console.log('\nFetching:', articleUrl);
    const art = await axios.get(articleUrl, {timeout:10000, headers:{'User-Agent':'Mozilla/5.0'}});
    const h = art.data;
    
    console.log('Title:', (h.match(/<title>([^<]+)<\/title>/) || [])[1]);
    console.log('Page length:', h.length);
    console.log('Has <video>:', h.includes('<video'));
    console.log('Has <img>:', h.includes('<img'));
    
    // Find text content paragraphs
    const paragraphs = h.match(/<p[^>]*>[\s\S]{50,}?<\/p>/g);
    if (paragraphs) {
      console.log('Text paragraphs:', paragraphs.length);
      paragraphs.slice(0, 3).forEach(p => {
        const text = p.replace(/<[^>]+>/g, '').trim();
        console.log('  ->', text.substring(0, 80));
      });
    }
    
    // Find images
    const imgs = h.match(/<img[^>]+src="([^"]+)"[^>]*>/g);
    if (imgs) {
      console.log('Images:', imgs.length);
      imgs.slice(0, 3).forEach(img => {
        const src = (img.match(/src="([^"]+)"/) || [])[1];
        if (src && !src.includes('.ico')) console.log('  ->', src.substring(0, 80));
      });
    }
    
    // Check for article content div
    const contentDiv = h.match(/class="[^"]*(?:article|content|detail|main-text)[^"]*"/i);
    console.log('Content div class:', contentDiv ? contentDiv[0] : 'not found');
    
    // Try to find section links
    const sectionLinks = home.data.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]{2,10})<\/a>/gi);
    if (sectionLinks) {
      const categories = ['高层','时政','人事','国际','财经','军事'];
      console.log('\nCategory links:');
      categories.forEach(cat => {
        const found = sectionLinks.filter(l => l.includes(cat) || l.includes(encodeURI(cat)));
        if (found.length > 0) {
          found.slice(0, 2).forEach(l => console.log('  ' + cat + ':', (l.match(/href="([^"]+)"/)||[])[1]));
        }
      });
    }
  }
}
main().catch(e => console.error(e.message));
