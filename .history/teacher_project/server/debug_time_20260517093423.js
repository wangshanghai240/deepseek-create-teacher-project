const axios = require('axios');
async function main() {
  const r = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20', {
    timeout: 10000,
    headers: {'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html'}
  });
  const html = r.data;
  const m = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  const data = JSON.parse(m[1]);
  
  const strings = {};
  for (let i = 0; i < data.length; i++) {
    if (typeof data[i] === 'string') strings[i] = data[i];
  }

  // Find article objects and check all keys
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      if (item.title && item.relId) {
        console.log('Object [' + i + '] keys:', Object.keys(item));
        // Print all key-value pairs with string values
        for (const [key, val] of Object.entries(item)) {
          if (typeof val === 'number' && strings[val]) {
            if (key === 'title' || key === 'shortTitle' || strings[val].includes(':') || strings[val].includes('2026') || strings[val].includes('2025')) {
              console.log('  ' + key + ' -> [' + val + ']', strings[val].substring(0, 30));
            }
          }
        }
        console.log('');
        break; // just one sample
      }
    }
  }
  
  // Check specific indices referenced by first article object [37]
  console.log('\nChecking indices referenced by first article object:');
  const refs = {56: 'downTitle/points', 64: 'sourcePoints', 63: 'shortTitle', 13: 'imageHeight/width'};
  for (const [idx, label] of Object.entries(refs)) {
    console.log(`  [${idx}] (${label}):`, data[parseInt(idx)]);
  }
  
  // Check if there's a pattern - article objects share index 56 for downTitle/points
  // Maybe there's a general config that has timestamps
  console.log('\nChecking objects with time-related keys:');
  for (let i = 0; i < data.length; i++) {
    if (data[i] && typeof data[i] === 'object' && !Array.isArray(data[i])) {
      const keys = Object.keys(data[i]);
      if (keys.some(k => k.includes('time') || k.includes('Time') || k.includes('date') || k.includes('Date'))) {
        console.log('[' + i + ']', JSON.stringify(data[i]).substring(0, 200));
      }
    }
  }
}
main().catch(e => console.error(e.message));
