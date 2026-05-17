const axios = require('axios');
async function main() {
  const r = await axios.get('https://www.peopleapp.com/article/500007496031', {
    timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
  });
  const h = r.data;
  
  // The article page might use a different NUXT structure
  // Check if the page has the article's title in HTML
  const hasTitle = h.includes('盲道摆拍');
  console.log('Page contains title:', hasTitle);
  console.log('Page length:', h.length);
  
  // Check for og meta tags  
  const ogDesc = h.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/);
  if (ogDesc) console.log('og:description:', ogDesc[1].substring(0, 200));
  
  const ogTitle = h.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
  if (ogTitle) console.log('og:title:', ogTitle[1]);
  
  // Check for description meta  
  const metaDesc = h.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/);
  if (metaDesc) console.log('meta description:', metaDesc[1].substring(0, 200));
  
  // The article page returns SAME feed data. Check if it has the article at all
  const ds = h.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  if (ds) {
    const data = JSON.parse(ds[1]);
    const strings = {};
    for (let i = 0; i < data.length; i++) if (typeof data[i] === 'string') strings[i] = data[i];
    
    // Find article by relId 500007496031
    let found = false;
    for (let i = 0; i < data.length; i++) {
      const it = data[i];
      if (it && typeof it === 'object' && !Array.isArray(it) && it.relId) {
        const rid = typeof it.relId === 'number' ? String(data[it.relId]) : '';
        if (rid === '500007496031') {
          found = true;
          console.log('\nArticle found in NUXT at index', i);
          console.log('Keys:', Object.keys(it).join(', '));
          
          // Check all string values
          for (const key of Object.keys(it)) {
            const val = it[key];
            if (typeof val === 'number' && strings[val]) {
              const str = strings[val];
              if (str.length > 30) {
                console.log('  ' + key + ' (' + str.length + '):', str.substring(0, 120));
              }
            }
          }
        }
      }
    }
    if (!found) console.log('\nArticle 500007496031 NOT found in page NUXT!');
  }
}
main().catch(e => console.error(e.message));
