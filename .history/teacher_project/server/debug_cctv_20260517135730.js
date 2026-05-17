const axios = require('axios');
async function main() {
  const r = await axios.get('https://news.cctv.com/2026/05/15/ARTIAneEsa1bFKov9P4c0nIM260515.shtml', {
    timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = r.data;
  
  // Search for video URL patterns in all script tags
  const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  if (scripts) {
    for (const script of scripts) {
      if (script.includes('mp4') || script.includes('m3u8') || script.includes('flv') || script.includes('htmlvideocode')) {
        const clean = script.replace(/<[^>]+>/g, '').trim();
        if (clean.length < 2000) console.log('Script:', clean.substring(0, 500));
      }
    }
  }
  
  // Search for htmlvideocode directly
  const idx = html.indexOf('htmlvideocode');
  if (idx >= 0) {
    console.log('\nContext around htmlvideocode:');
    console.log(html.substring(Math.max(0, idx - 50), idx + 400));
  }
  
  // Search for flashvars or player vars
  const fvIdx = html.indexOf('flashvars');
  if (fvIdx >= 0) {
    console.log('\nContext around flashvars:');
    console.log(html.substring(fvIdx, fvIdx + 400));
  }
  
  // Search for video container in HTML
  const videoDivs = html.match(/<div[^>]*class="[^"]*(video|player)[^"]*"[^>]*>[\s\S]{0,500}?<\/div>/gi);
  if (videoDivs) {
    console.log('\nVideo containers:');
    videoDivs.slice(0, 3).forEach(d => console.log(d.substring(0, 300)));
  }
}
main().catch(e => console.error(e.message));
