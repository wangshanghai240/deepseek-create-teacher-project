const axios = require('axios');
async function main() {
  const r = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20', {
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
  });
  const ds = r.data.match(/<script[^>]*data-ssr[^>]*>([\s\S]*?)<\/script>/);
  const data = JSON.parse(ds[1]);
  const strings = {};
  for (let i = 0; i < data.length; i++) {
    if (typeof data[i] === 'string') strings[i] = data[i];
  }

  // Explore the 'hot' section (index 646)
  let hotData = data[646];
  console.log('hot type:', typeof hotData, Array.isArray(hotData));
  if (Array.isArray(hotData)) {
    console.log('hot length:', hotData.length);
    for (let j = 0; j < Math.min(hotData.length, 30); j++) {
      const idx = hotData[j];
      if (typeof idx === 'number') {
        const item = data[idx];
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const t = typeof item.title === 'number' ? strings[item.title] : '';
          const hasRelId = item.relId ? 'relId=' + data[item.relId] : '';
          const hasImg = item.image || item.image_url ? 'hasImg' : '';
          const hasUrl = item.share_url || item.url ? 'hasUrl' : '';
          const hasVideo = item.video_url || item.video ? 'hasVideo' : '';
          if (t) console.log('  [' + idx + ']', t.substring(0, 50), hasRelId, hasImg, hasUrl, hasVideo);
        }
      }
    }
  }

  // Also explore 'live' (201)
  console.log('\n=== live section ===');
  let liveData = data[201];
  if (Array.isArray(liveData)) {
    console.log('live length:', liveData.length);
    for (let j = 0; j < Math.min(liveData.length, 20); j++) {
      const idx = liveData[j];
      const item = typeof idx === 'number' ? data[idx] : idx;
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const t = typeof item.title === 'number' ? strings[item.title] || data[item.title] : '';
        if (t && typeof t === 'string' && t.length > 5) console.log('  [' + idx + ']', t.substring(0, 50));
      }
    }
  }

  // Explore total article count via homeData path
  console.log('\n=== All objects with video references ===');
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const keys = Object.keys(item);
      if (keys.some(k => k.includes('video') || k === 'voiceInfo')) {
        const t = typeof item.title === 'number' ? strings[item.title] : '';
        if (t) {
          const hasRelId = item.relId ? 'relId=' + data[item.relId] : '';
          console.log('  [' + i + ']', t.substring(0, 40), hasRelId, 'keys:', keys.filter(k => k.includes('video') || k === 'voiceInfo').join(','));
        }
      }
    }
  }
}
main().catch(e => console.error(e.message));
