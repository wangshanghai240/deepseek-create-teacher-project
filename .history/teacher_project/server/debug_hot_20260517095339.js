const axios = require('axios');
async function main() {
  const r = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20', {
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
  });
  const ds = r.data.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  const data = JSON.parse(ds[1]);
  const strings = {};
  for(let i=0;i<data.length;i++) if(typeof data[i]==='string') strings[i]=data[i];

  // Resolve hot object (index 646)
  const hot = data[646];
  console.log('hot type:', typeof hot, 'keys:', hot ? Object.keys(hot) : 'null');
  if (hot && typeof hot === 'object') {
    for (const [k, v] of Object.entries(hot)) {
      if (typeof v === 'number') {
        const resolved = data[v];
        if (Array.isArray(resolved)) {
          console.log('hot.' + k + ' -> array[' + resolved.length + ']');
          resolved.slice(0, 10).forEach((idx, j) => {
            if (typeof idx === 'number') {
              const item = data[idx];
              if (item && typeof item === 'object') {
                const t = typeof item.title === 'number' ? strings[item.title] : '';
                if (t) console.log('  [' + idx + ']', t.substring(0, 50), item.relId ? 'relId=' + data[item.relId] : '');
              }
            }
          });
        } else {
          console.log('hot.' + k + ' -> [' + v + ']', typeof resolved, Array.isArray(resolved) ? 'arr['+resolved.length+']' : '');
        }
      }
    }
  }

  // Try feed_id 131-140 for hot content
  for (let fid = 131; fid <= 140; fid++) {
    try {
      const r2 = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=' + fid + '&page=1&page_size=5', {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
      });
      if (r2.data.includes('data-ssr')) {
        const ds2 = r2.data.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
        if (ds2) {
          const d2 = JSON.parse(ds2[1]);
          const s2 = {};
          for (let i = 0; i < d2.length; i++) if (typeof d2[i] === 'string') s2[i] = d2[i];
          let cnt = 0;
          for (let i = 0; i < d2.length; i++) {
            const item = d2[i];
            if (item && typeof item === 'object' && !Array.isArray(item) && item.title && item.relId) {
              const t = typeof item.title === 'number' ? s2[item.title] : '';
              if (t && t.length > 5 && cnt < 5) {
                console.log('feed_' + fid + ' [' + i + ']', t.substring(0, 40), 'relId=' + d2[item.relId]);
                cnt++;
              }
            }
          }
          if (cnt > 0) console.log('  -> feed_' + fid + ' total:', cnt);
        }
      }
    } catch(e) { /* skip */ }
  }
}
main().catch(e => console.error(e.message));
