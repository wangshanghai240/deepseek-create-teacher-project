const axios = require('axios');
async function main() {
  const r = await axios.get('https://www.peopleapp.com/article/500007496031', {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      'Accept': 'text/html'
    }
  });
  const h = r.data;
  
  // Check for any SSR content
  const hasPageContent = h.includes('article-content') || h.includes('post-content') || h.includes('detail-content');
  console.log('Has content class:', hasPageContent);
  
  // Find title in HTML
  const titleMatch = h.match(/盲道摆拍/g);
  console.log('Title mentions:', titleMatch ? titleMatch.length : 0);
  
  // Find long paragraphs
  const longTexts = h.match(/>[^<>]{100,}</g);
  if (longTexts) {
    const unique = [...new Set(longTexts.map(t => t.replace(/[<>]/g, '').trim()))]
      .filter(t => /[\u4e00-\u9fff]/.test(t) && !t.includes('VITE') && !t.includes('Copyright'));
    console.log('\nLong text blocks:', unique.length);
    unique.slice(0, 5).forEach(t => console.log(' -', t.substring(0, 80)));
  }
  
  // Search for the article body text
  const bodyText = h.match(/岂有此理[^<]{50,}/g);
  if (bodyText) {
    console.log('\nContext around title:', bodyText.slice(0, 3).map(x => x.substring(0, 100)));
  }
}
main().catch(e => console.error(e.message));
