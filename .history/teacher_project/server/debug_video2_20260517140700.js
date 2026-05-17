const axios = require('axios');
async function main() {
  const url = 'https://news.cctv.com/2026/05/15/ARTIJ1t1ZF3oeDItJsniMuAb260515.shtml';
  const r = await axios.get(url, {timeout:15000, headers:{'User-Agent':'Mozilla/5.0'}});
  const html = r.data;
  
  // Check contentdate for any video/iframe
  const cdMatch = html.match(/var\s+contentdate\s*=\s*'([\s\S]*?)';/);
  if (cdMatch) {
    const content = cdMatch[1];
    console.log('contentdate length:', content.length);
    
    // Check for embed tags
    const embeds = content.match(/<embed[^>]*src=["']([^"']+)["'][^>]*>/gi);
    if (embeds) console.log('Embeds:', embeds);
    
    // Check for object/param for flash
    if (content.includes('<object') || content.includes('<param')) console.log('Has object/param tags');
    
    // Check for video-related class names
    const videoClasses = content.match(/class=["'][^"']*(video|player|media)[^"']*["']/gi);
    if (videoClasses) console.log('Video classes:', videoClasses.slice(0, 3));
    
    // Check any URL patterns
    const allUrls = content.match(/https?:[^'"\s<>]+/g);
    if (allUrls) {
      const videoUrls = allUrls.filter(u => u.includes('video') || u.includes('player') || u.includes('cctv') || u.includes('mp4'));
      if (videoUrls.length > 0) console.log('Video-related URLs:', videoUrls.slice(0, 5));
    }
    
    // First 800 chars of content
    console.log('\nContent preview:');
    console.log(content.substring(0, 800));
  } else {
    console.log('No contentdate found');
  }
}
main().catch(e => console.error(e.message));
