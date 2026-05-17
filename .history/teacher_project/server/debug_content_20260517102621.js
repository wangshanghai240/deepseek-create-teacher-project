const axios = require('axios');
async function main() {
  const r = await axios.get('https://www.peopleapp.com/article/500007496230', {
    timeout: 10000, headers: {'User-Agent': 'Mozilla/5.0'}
  });
  const ds = r.data.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  const data = JSON.parse(ds[1]);
  const strings = {};
  for (let i = 0; i < data.length; i++) {
    if (typeof data[i] === 'string') strings[i] = data[i];
  }

  // Find long strings
  console.log('Long strings (>=300 chars):');
  for (let i = 0; i < data.length; i++) {
    if (typeof data[i] === 'string' && data[i].length >= 300) {
      console.log('[' + i + '](' + data[i].length + '):', data[i].substring(0, 100));
    }
  }

  // Also look for objects with content key
  console.log('\nObjects with "content" key:');
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      if (item.content || item.Content) {
        const val = item.content || item.Content;
        const str = typeof val === 'number' && strings[val] ? strings[val].substring(0, 80) : String(val).substring(0, 80);
        console.log('[' + i + '] content:', str, '| relId:', item.relId ? data[item.relId] : '');
      }
    }
  }
  
  // Find the target article and see all its fields
  console.log('\nTarget article object (relId=500007496230):');
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item && typeof item === 'object' && !Array.isArray(item) && item.relId) {
      const rid = typeof item.relId === 'number' ? String(data[item.relId]) : '';
      if (rid === '500007496230') {
        console.log('Found at [' + i + '], keys:', Object.keys(item));
        for (const [k, v] of Object.entries(item)) {
          if (typeof v === 'number' && strings[v]) {
            console.log('  ' + k + ' ->', strings[v].substring(0, 80));
          }
        }
      }
    }
  }
}
main().catch(e => console.error(e.message));
