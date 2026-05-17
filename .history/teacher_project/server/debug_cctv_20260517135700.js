const axios = require('axios');
async function main() {
  const r = await axios.get('https://news.cctv.com/2026/05/15/ARTIAneEsa1bFKov9P4c0nIM260515.shtml', {
    timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = r.data;
  
  // Check for video-related variables
  const patterns = [
    'htmlvideocode', 'videocode', 'videoPlayer', 'videoUrl', 'video_url',
    'videodata', 'videoData', 'video_info', 'videoInfo', 'flashvars',
    'player', 'mp4', 'm3u8', 'flv'
  ];
  
  for (const p of patterns) {
    const regex = new RegExp(p + '[^;]{0,300}', 'gi');
    const m = html.match(regex);
    if (m) {
      console.log('Found "' + p + '":');
      m.slice(0, 3).forEach(x => console.log('  ->', x.substring(0, 150)));
      console.log('');
    }
  }
  
  // Also check for any video iframe or embed
  const iframes = html.match(/<iframe[^>]*src=["'][^"']*(video|player|youku|qq\.com|bilibili)[^"']*["'][^>]*>/gi);
  if (iframes) {
    console.log('Video iframes:');
    iframes.forEach(x => console.log('  ->', x.substring(0, 200)));
  }
  
  // Check for script that contains video URL patterns
  const scripts = html.match(/<script[^>]*>[\s\S]{100,2000}?\.(mp4|m3u8|flv)[\s\S]{0,200}?<\/script>/gi);
  if (scripts) {
    console.log('Scripts with video URLs:');
    scripts.slice(0, 3).forEach(s => console.log('  ->', s.substring(0, 300)));
  }
}
main().catch(e => console.error(e.message));
