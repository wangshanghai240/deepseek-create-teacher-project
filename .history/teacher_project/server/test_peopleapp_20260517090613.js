const axios = require('axios');

async function test() {
  const r = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=5', {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html',
      'Referer': 'https://www.peopleapp.com/'
    }
  });
  const html = r.data;
  
  // Print what's right after <script>window.__NUXT__
  const nuxtIdx = html.indexOf('window.__NUXT__');
  if (nuxtIdx >= 0) {
    console.log('Found __NUXT__ at index', nuxtIdx);
    console.log('Context:', html.substring(nuxtIdx, nuxtIdx + 500));
  }
  
  // Look for the large data script
  const dataScript = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  if (dataScript) {
    console.log('\nFound data-ssr script, length:', dataScript[1].length);
    console.log('Start:', dataScript[1].substring(0, 500));
  } else {
    // Find all script tags by looking for </script> patterns
    let idx = 0;
    let count = 0;
    while ((idx = html.indexOf('</script>', idx)) !== -1 && count < 5) {
      const start = Math.max(0, idx - 200);
      console.log('\n--- Script ending at', idx, '---');
      console.log(html.substring(start, idx + 9));
      idx += 9;
      count++;
    }
  }
  
  // Check the very end of HTML for embedded data
  console.log('\n\n--- HTML tail (last 3000 chars) ---');
  console.log(html.substring(html.length - 3000));
}

test().catch(e => console.error('Error:', e.message));
