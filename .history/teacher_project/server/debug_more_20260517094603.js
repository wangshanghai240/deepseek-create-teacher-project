const axios = require('axios');
async function main() {
  const r = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20', {
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

  // Find ALL objects with title (even without relId)
  console.log('=== All objects with title ===');
  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      if (item.title) {
        const t = typeof item.title === 'number' && strings[item.title] ? strings[item.title] : '';
        if (t && t.length > 5) {
          const hasRelId = item.relId ? 'YES' : 'NO';
          const hasUrl = item.share_url || item.url ? 'YES' : 'NO';
          const hasImage = item.image || item.image_url ? 'YES' : 'NO';
          console.log(`[${i}] relId=${hasRelId} url=${hasUrl} img=${hasImage}`, t.substring(0, 50));
        }
      }
    }
  }
  
  // Also find ALL objects with share_url 
  console.log('\n=== Objects with share_url or url (not images) ===');
  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const keys = Object.keys(item);
      if ((keys.includes('share_url') || keys.includes('url')) && !keys.includes('height') && !keys.includes('width')) {
        console.log(`[${i}] keys:`, keys.join(', '));
        for (const k of keys) {
          const v = item[k];
          if (typeof v === 'number' && strings[v]) {
            console.log(`  ${k} -> ${strings[v].substring(0, 80)}`);
          }
        }
      }
    }
  }
}
main().catch(e => console.error(e.message));
