const axios = require('axios');
async function main() {
  const url = 'https://www.peopleapp.com/article/500007496230';
  const r = await axios.get(url, {
    timeout: 10000,
    headers: {'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html'}
  });
  const html = r.data;
  
  // Check iframe blocking headers
  console.log('X-Frame-Options:', r.headers['x-frame-options'] || '(none)');
  const csp = r.headers['content-security-policy'] || '';
  console.log('CSP frame-ancestors:', csp.includes('frame-ancestors') ? 'yes (BLOCKED)' : 'no (allowed)');
  console.log('');
  
  // Check if the article page has specific article data in NUXT
  const ds = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  if (ds) {
    const data = JSON.parse(ds[1]);
    const strings = {};
    for (let i = 0; i < data.length; i++) {
      if (typeof data[i] === 'string') strings[i] = data[i];
    }
    
    // Look for the article title in NUXT strings
    for (let i = 0; i < data.length; i++) {
      if (typeof data[i] === 'string' && data[i].includes('书写经世华章')) {
        console.log('Found title at [' + i + ']:', data[i]);
      }
    }
    
    // Look for article content
    for (let i = 0; i < data.length; i++) {
      if (typeof data[i] === 'string' && data[i].length > 500) {
        console.log('\nLong string [' + i + '] (' + data[i].length + ' chars):', data[i].substring(0, 200));
      }
    }
    
    // Check if this page's nuxt has article-specific data vs feed page
    const feedMatch = html.match(/feed_id=130/);
    console.log('\nHas feed_id reference:', !!feedMatch);
    
    // Check for any reference to the specific article ID
    const hasArticleId = html.includes('500007496230');
    console.log('Has article ID in HTML:', hasArticleId);
  }
  
  // Check for og:url, canonical link etc
  const ogUrl = html.match(/<meta[^>]*property="og:url"[^>]*content="([^"]+)"/);
  console.log('\nog:url:', ogUrl ? ogUrl[1] : 'not found');
  
  const canonical = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/);
  console.log('canonical:', canonical ? canonical[1] : 'not found');
  
  // Check alternate article URL patterns
  const linkPatterns = html.match(/href="[^"]*article[^"]*"/g);
  if (linkPatterns) {
    const unique = [...new Set(linkPatterns)];
    console.log('\nArticle link patterns:', unique.slice(0, 5));
  }
  
  // Check X-Frame-Options and CSP
  const xFrame = r.headers['x-frame-options'];
  const csp = r.headers['content-security-policy'];
  console.log('\nX-Frame-Options:', xFrame || '(none)');
  console.log('CSP frame-ancestors:', csp ? (csp.includes('frame-ancestors') ? 'yes' : 'no') : '(none)');
}
main().catch(e => console.error(e.message));
