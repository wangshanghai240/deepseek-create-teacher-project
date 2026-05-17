const axios = require('axios');
async function main() {
  const r = await axios.get('https://www.peopleapp.com/article/500007495489', {
    timeout: 10000, headers: {'User-Agent': 'Mozilla/5.0'}
  });
  const ds = r.data.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  const d = JSON.parse(ds[1]);
  const strings = {};
  for (let i = 0; i < d.length; i++) if (typeof d[i] === 'string') strings[i] = d[i];
  
  for (let i = 0; i < d.length; i++) {
    const it = d[i];
    if (it && typeof it === 'object' && !Array.isArray(it) && it.relId) {
      const rid = typeof it.relId === 'number' ? String(d[it.relId]) : '';
      if (rid === '500007495489') {
        console.log('Found at [' + i + ']');
        if (it.newsSummary != null) {
          const val = it.newsSummary;
          console.log('newsSummary type:', typeof val, 'idx:', val);
          if (typeof val === 'number') {
            const resolved = d[val];
            console.log('resolved type:', typeof resolved);
            if (typeof resolved === 'string') console.log('value:', resolved.substring(0, 80));
            else console.log('value:', JSON.stringify(resolved).substring(0, 100));
          }
        }
        if (it.newsTxt != null) {
          console.log('newsTxt idx:', it.newsTxt);
          console.log('resolved:', typeof d[it.newsTxt] === 'string' ? d[it.newsTxt].substring(0, 80) : JSON.stringify(d[it.newsTxt]).substring(0, 80));
        }
      }
    }
  }
}
main().catch(e => console.log(e.message));
