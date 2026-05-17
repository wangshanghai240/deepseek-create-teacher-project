const axios = require('axios');
async function main() {
  const feed = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20', {
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
  });
  const ds = feed.data.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  const rawData = JSON.parse(ds[1]);
  const strings = {};
  for (let i = 0; i < rawData.length; i++) {
    if (typeof rawData[i] === 'string') strings[i] = rawData[i];
  }

  const searchTitle = '微镜头·中美元首在北京举行会谈';
  const searchKey = searchTitle.substring(0, 15);
  console.log('Searching for:', searchKey);

  let found = 0;
  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      if (item.title) {
        const t = typeof item.title === 'number' && strings[item.title] ? strings[item.title] : '';
        if (t) {
          if (t.length > 5) {
            found++;
            if (found <= 10) console.log('[' + i + ']', t.substring(0, 40), 'has relId:', !!item.relId);
          }
          if (t.includes(searchKey)) {
            console.log('\nMATCH [' + i + ']:', t);
            if (item.relId) {
              const relId = rawData[item.relId];
              console.log('relId:', relId);
            }
          }
        }
      }
    }
  }
  console.log('\nTotal titles found:', found);
}
main().catch(e => console.error(e.message));
