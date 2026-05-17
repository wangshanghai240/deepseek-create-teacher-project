const axios = require('axios');
async function main() {
  const r = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=50', {
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
  });
  const html = r.data;
  const ds = html.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  const rawData = JSON.parse(ds[1]);
  const strings = {};
  for (let i = 0; i < rawData.length; i++) {
    if (typeof rawData[i] === 'string') strings[i] = rawData[i];
  }

  let count = 0;
  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      if (item.title) {
        const t = typeof item.title === 'number' && strings[item.title] ? strings[item.title] : '';
        if (t && t.length > 5 && !t.includes('人民日报-有品质')) {
          count++;
          if (count <= 20) {
            console.log('[' + i + ']', t.substring(0, 50), item.relId ? 'relId=' + rawData[item.relId] : 'no relId');
          }
        }
      }
    }
  }
  console.log('\nTotal with page_size=50:', count);
}
main().catch(e => console.error(e.message));
