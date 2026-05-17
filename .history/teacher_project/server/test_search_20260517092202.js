const axios = require('axios');

async function test() {
  const titles = [
    '微镜头·中美元首在北京举行会谈',
    '俄罗斯总统普京将于5月19日至20日对华进行国事访问'
  ];
  
  for (const title of titles) {
    console.log('\n=== Searching for:', title.substring(0, 30) + '... ===');
    
    // Try peopleapp search
    try {
      const r = await axios.get('https://www.peopleapp.com/search?keyword=' + encodeURIComponent(title), {
        timeout: 10000,
        headers: {'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html'}
      });
      
      const html = r.data;
      const linkMatch = html.match(/\/article\/[^"']+/);
      if (linkMatch) {
        console.log('Article link found:', 'https://www.peopleapp.com' + linkMatch[0]);
      } else {
        // Check data-ssr for article links
        const dataScript = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
        if (dataScript) {
          const data = JSON.parse(dataScript[1]);
          for (let i = 0; i < data.length; i++) {
            if (typeof data[i] === 'string' && data[i].includes('/article/')) {
              console.log('NUXT article link [' + i + ']:', data[i]);
            }
          }
        }
        console.log('No article link in search page HTML');
        console.log('Search page length:', html.length);
        console.log('Has article:', html.includes('/article/'));
        console.log('Has newsId:', html.includes('newsId'));
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
}

test().catch(e => console.error(e.message));
