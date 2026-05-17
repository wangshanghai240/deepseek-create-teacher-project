const axios = require('axios');

async function test() {
  const r = await axios.get('https://www.peopleapp.com/rmrb', { 
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Referer': 'https://www.peopleapp.com/'
    }
  });
  const html = r.data;
  
  // 找到 NUXT 数据脚本
  const nuxtMatch = html.match(/<script id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!nuxtMatch) {
    console.log('No NUXT data found');
    console.log('HTML length:', html.length);
    console.log('First 2000 chars:', html.substring(0, 2000));
    return;
  }
  
  const rawData = nuxtMatch[1];
  const data = JSON.parse(rawData);
  console.log('Data is array:', Array.isArray(data), 'length:', data.length);
  
  // 这是一个序列化格式，每个元素是 [type, value] 或一个对象
  // 我们需要跟踪哪些元素是字符串
  const strings = {};
  for (let i = 0; i < data.length; i++) {
    if (typeof data[i] === 'string') {
      strings[i] = data[i];
    }
  }
  
  console.log('\nString references:');
  const stringEntries = Object.entries(strings);
  stringEntries.slice(0, 80).forEach(([idx, str]) => {
    if (str.length > 8 && str.length < 100 && /[\u4e00-\u9fff]/.test(str)) {
      console.log(`  [${idx}] ${str}`);
    }
  });
  
  // 现在找包含这些字符串引用的对象
  console.log('\n\nLooking for article objects...');
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const keys = Object.keys(item);
      // 检查是否有 title 和 url 相关的 key
      if (keys.some(k => k.includes('title') || k.includes('Title') || k.includes('url') || k.includes('Url'))) {
        console.log(`\n[${i}] Object with url/title keys:`, JSON.stringify(item).substring(0, 400));
      }
    }
  }
}

test().catch(e => console.error(e.message));
