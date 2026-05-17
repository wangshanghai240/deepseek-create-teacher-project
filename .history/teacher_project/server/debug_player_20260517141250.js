const axios = require('axios');
async function main() {
  const url = 'https://news.cctv.com/2026/05/15/ARTIJ1t1ZF3oeDItJsniMuAb260515.shtml';
  const r = await axios.get(url, {timeout:15000, headers:{'User-Agent':'Mozilla/5.0'}});
  const html = r.data;
  
  // Find the JavaScript that loads the video player
  // Look for CCTVVideo function or similar
  const scripts = html.match(/<script[^>]*>[\s\S]{50,3000}?<\/script>/gi);
  if (scripts) {
    for (const script of scripts) {
      if (script.includes('htmlVideoCode') || script.includes('CCTVVideo') || script.includes('player') || script.includes('video')) {
        const clean = script.replace(/<[^>]+>/g, '').trim();
        if (clean.length < 2000) {
          console.log('Relevant script:');
          console.log(clean.substring(0, 800));
          console.log('---');
        }
      }
    }
  }
  
  // Also search for the player initialization code  
  const playerCalls = html.match(/CCTVVideo[\s\S]{0,500}?\);/gi);
  if (playerCalls) {
    console.log('\nCCTVVideo calls:');
    playerCalls.forEach(c => console.log(c.substring(0, 300)));
  }
  
  // Search for newPlayer or similar
  const newPlayer = html.match(/newPlayer[\s\S]{0,500}?\);/gi);
  if (newPlayer) {
    console.log('\nnewPlayer calls:');
    newPlayer.forEach(c => console.log(c.substring(0, 300)));
  }
}
main().catch(e => console.error(e.message));
