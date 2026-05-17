const axios = require('axios');
async function main() {
  const r = await axios.get('https://www.peopleapp.com/article/500007496031', {
    timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const m = r.data.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  const d = JSON.parse(m[1]);
  const strings = {};
  for (let i = 0; i < d.length; i++) if (typeof d[i] === 'string') strings[i] = d[i];

  let found = false;
  for (let i = 0; i < d.length; i++) {
    const it = d[i];
    if (it && typeof it === 'object' && !Array.isArray(it) && it.relId) {
      const rid = typeof it.relId === 'number' ? d[it.relId] : '';
      if (rid === '500007496031') {
        found = true;
        console.log('Keys:', Object.keys(it).join(', '));
        
        // Check videoInfo
        if (typeof it.videoInfo === 'number') {
          const vi = d[it.videoInfo];
          console.log('videoInfo type:', typeof vi, Array.isArray(vi) ? 'array' : '');
          if (typeof vi === 'object') {
            const str = JSON.stringify(vi);
            console.log('videoInfo content:', str.substring(0, 500));
            // Search for video URLs
            const vidUrls = str.match(/https?:[^"',}]+\.(mp4|m3u8)[^"',}]*/g);
            if (vidUrls) console.log('VIDEO URLS FOUND:', vidUrls);
          }
        }
        
        // Check voiceInfo  
        if (typeof it.voiceInfo === 'number') {
          const vi = d[it.voiceInfo];
          console.log('voiceInfo:', JSON.stringify(vi).substring(0, 200));
        }
        
        // Check for any text
        for (const key of Object.keys(it)) {
          const val = it[key];
          if (typeof val === 'number' && strings[val] && strings[val].length > 100) {
            console.log(key + ' (' + strings[val].length + '):', strings[val].substring(0, 100));
          }
        }
        break;
      }
    }
  }
  if (!found) console.log('Article not found in page NUXT');
}
main().catch(e => console.error(e.message));
