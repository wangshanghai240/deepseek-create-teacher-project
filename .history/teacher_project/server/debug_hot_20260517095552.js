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

  // Find the hot section
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item && typeof item === 'object' && !Array.isArray(item) && item.list) {
      const listIdx = item.list;
      if (typeof listIdx === 'number') {
        const listArr = data[listIdx];
        console.log('Found section at [' + i + '] with list at [' + listIdx + '], length:', listArr ? listArr.length : '?');
        if (Array.isArray(listArr)) {
          for (const idx of listArr) {
            if (typeof idx === 'number') {
              const obj = data[idx];
              if (obj && typeof obj === 'object') {
                const t = typeof obj.title === 'number' ? strings[obj.title] : '';
                const hasRelId = obj.relId ? 'relId=' + data[obj.relId] : 'no relId';
                const hasShareUrl = obj.share_url ? 'has share_url' : '';
                const hasUrl = obj.url ? 'has url' : '';
                console.log('  [' + idx + ']', (t || '(no title)').substring(0, 40), hasRelId, hasShareUrl, hasUrl);
              }
            }
          }
        }
      }
    }
  }
}
main().catch(e => console.error(e.message));
