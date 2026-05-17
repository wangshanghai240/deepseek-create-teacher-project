const axios = require('axios');
async function main() {
  const url = 'https://news.cctv.com/2026/05/15/ARTIJ1t1ZF3oeDItJsniMuAb260515.shtml';
  const r = await axios.get(url, {timeout:15000, headers:{'User-Agent':'Mozilla/5.0'}});
  const html = r.data;
  
  // Search for ALL possible video sources
  const patterns = [
    /htmlvideocode\s*=\s*['"]([\s\S]{0,500}?)['"]\s*;/,
    /var\s+videourl\s*=\s*['"]([^'"]+)['"]/i,
    /var\s+videoUrl\s*=\s*['"]([^'"]+)['"]/i,
    /var\s+flvUrl\s*=\s*['"]([^'"]+)['"]/i,
    /var\s+mp4Url\s*=\s*['"]([^'"]+)['"]/i,
    /video_source\s*=\s*['"]([^'"]+)['"]/i,
    /srcUrl\s*=\s*['"]([^'"]+)['"]/i,
    /data-url\s*=\s*['"]([^'"]+)['"]/i,
    /CCTVVideo\s*\(\)/,
    /player\s*\([^)]+\)/,
  ];
  
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m) {
      console.log('Pattern:', pattern.toString().substring(0, 50));
      console.log('Match:', m[0].substring(0, 300));
      console.log('');
    }
  }
  
  // Check for any video-related container
  const videoContainers = html.match(/<div[^>]*id="[^"]*(video|player)[^"]*"[^>]*>/gi);
  if (videoContainers) {
    console.log('\nVideo containers:');
    videoContainers.forEach(d => console.log('  ', d.substring(0, 150)));
  }
  
  // Find any script that references video
  const scripts = html.match(/<script[^>]*>[\s\S]{50,1000}?\.(mp4|m3u8|flv)[\s\S]{0,1000}?<\/script>/gi);
  if (scripts) {
    console.log('\nScripts with video URLs:');
    scripts.slice(0, 3).forEach(s => {
      const clean = s.replace(/<[^>]+>/g, '').substring(0, 500);
      console.log('  ', clean);
    });
  }
  
  // Search for any .mp4 URL
  const allUrls = html.match(/https?:[^"'\s]*\.(mp4|m3u8|flv)[^"'\s]*/gi);
  if (allUrls) {
    console.log('\nDirect video URLs:');
    allUrls.forEach(u => console.log('  ' + u.substring(0, 100)));
  }
  
  // Check if page has <video> tag
  console.log('\nHas <video> tag:', html.includes('<video'));
  console.log('Has video.js:', html.includes('video.js'));
  console.log('Has ckplayer:', html.includes('ckplayer'));
  console.log('Has flowplayer:', html.includes('flowplayer'));
  console.log('Has JWPlayer:', html.includes('JWPlayer'));
}
main().catch(e => console.error(e.message));
