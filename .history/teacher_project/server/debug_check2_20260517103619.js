const axios = require('axios');
async function main() {
  const r = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20', {
    timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const ds = r.data.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  const d = JSON.parse(ds[1]);
  const strings = {};
  for (let i = 0; i < d.length; i++) if (typeof d[i] === 'string') strings[i] = d[i];

  // Find "盲道摆拍" article
  for (let i = 0; i < d.length; i++) {
    const it = d[i];
    if (it && typeof it === 'object' && !Array.isArray(it)) {
      // Check title
      let title = '';
      if (typeof it.title === 'number' && strings[it.title]) title = strings[it.title];
      if (typeof it.newsTitle === 'number') {
        const nt = d[it.newsTitle];
        if (typeof nt === 'string') title = nt;
        else if (typeof nt === 'object') {
          for (const v of Object.values(nt)) {
            if (typeof v === 'number' && strings[v]) { title = strings[v]; break; }
          }
        }
      }
      
      if (title && title.includes('盲道')) {
        console.log('FOUND at [' + i + ']');
        console.log('Title:', title);
        console.log('Keys:', Object.keys(it).join(', '));
        if (it.relId) {
          const rid = typeof it.relId === 'number' ? d[it.relId] : it.relId;
          console.log('relId:', rid);
          console.log('Article URL: https://www.peopleapp.com/article/' + rid);
        }
        if (typeof it.newsSummary === 'number') {
          const ns = d[it.newsSummary];
          console.log('newsSummary type:', typeof ns);
          if (typeof ns === 'string') console.log('newsSummary:', ns.substring(0, 300));
          else console.log('newsSummary obj:', JSON.stringify(ns).substring(0, 200));
        }
        if (it.newsTxt) {
          const nt = typeof it.newsTxt === 'number' ? d[it.newsTxt] : it.newsTxt;
          console.log('newsTxt:', typeof nt === 'string' ? nt.substring(0, 200) : JSON.stringify(nt).substring(0, 100));
        }
        if (it.voiceInfo) console.log('Has voiceInfo:', it.voiceInfo);
        if (it.videoInfo) console.log('Has videoInfo');
        if (it.video || it.video_url || it.videoUrl) console.log('Has video');
        break;
      }
    }
  }
}
main().catch(e => console.error(e.message));
