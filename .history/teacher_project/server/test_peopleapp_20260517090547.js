const axios = require('axios');

async function test() {
  const r = await axios.get('https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20', {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html',
      'Referer': 'https://www.peopleapp.com/'
    }
  });
  const html = r.data;
  
  // Find NUXT data
  const nuxtMatch = html.match(/<script id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!nuxtMatch) {
    console.log('No NUXT data found');
    console.log('Has __NUXT__:', html.includes('__NUXT__'));
    return;
  }
  
  const raw = nuxtMatch[1];
  const data = JSON.parse(raw);
  console.log('Data length:', data.length);
  
  // Collect all strings
  const strings = {};
  for (let i = 0; i < data.length; i++) {
    if (typeof data[i] === 'string') {
      strings[i] = data[i];
    }
  }
  
  // Resolve numeric references to strings
  function resolveValue(val, depth) {
    if (depth > 5) return val;
    if (typeof val === 'number' && val in strings) return strings[val];
    if (val && typeof val === 'object') {
      if (Array.isArray(val)) return val.map(v => resolveValue(v, depth + 1));
      const resolved = {};
      for (const [k, v] of Object.entries(val)) {
        resolved[k] = resolveValue(v, depth + 1);
      }
      return resolved;
    }
    return val;
  }
  
  console.log('\n=== Resolved Article Objects ===');
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const resolved = resolveValue(item, 0);
      if (typeof resolved === 'object' && !Array.isArray(resolved)) {
        if (resolved.title && typeof resolved.title === 'string' && resolved.title.length > 5) {
          console.log('\n[' + i + ']', resolved.title);
          if (resolved.newsTxt) console.log('   Summary:', typeof resolved.newsTxt === 'string' ? resolved.newsTxt.substring(0, 100) : JSON.stringify(resolved.newsTxt).substring(0, 100));
          if (resolved.image) console.log('   Image:', typeof resolved.image === 'string' ? resolved.image : JSON.stringify(resolved.image));
          if (resolved.share_url || resolved.url) console.log('   URL:', resolved.share_url || resolved.url);
          if (resolved.create_time || resolved.publish_time) console.log('   Time:', resolved.create_time || resolved.publish_time);
          console.log('   Keys:', Object.keys(resolved).join(', '));
        }
      }
    }
  }
}

test().catch(e => console.error('Error:', e.message));
