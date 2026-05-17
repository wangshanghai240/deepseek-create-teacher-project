const axios = require('axios');
async function main() {
  const r = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20', {
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
  });
  const ds = r.data.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  const data = JSON.parse(ds[1]);
  const strings = {};
  for (let i = 0; i < data.length; i++) if (typeof data[i] === 'string') strings[i] = data[i];

  // Check a hot item: index 553 (first item in section [329]'s list)
  const item = data[553];
  console.log('Item [553] keys:', Object.keys(item));
  
  // Check what title index points to
  const titleIdx = item.title;
  if (typeof titleIdx === 'number') {
    const titleResolved = data[titleIdx];
    console.log('title[' + titleIdx + '] type:', typeof titleResolved, Array.isArray(titleResolved) ? 'array' : '');
    if (typeof titleResolved === 'object' && !Array.isArray(titleResolved)) {
      console.log('title object keys:', Object.keys(titleResolved));
      // Try resolving deeper
      for (const [k, v] of Object.entries(titleResolved)) {
        console.log('  ' + k + ':', typeof v === 'number' ? '->[' + v + ']' + (strings[v] || '') : JSON.stringify(v).substring(0, 80));
        if (typeof v === 'number') {
          const deeper = data[v];
          console.log('    -> [' + v + ']:', typeof deeper === 'string' ? deeper : (typeof deeper === 'object' ? JSON.stringify(deeper).substring(0, 100) : deeper));
        }
      }
    } else {
      console.log('title resolved value:', typeof titleResolved === 'string' ? titleResolved : JSON.stringify(titleResolved).substring(0, 200));
    }
  }
}
main().catch(e => console.error(e.message));
