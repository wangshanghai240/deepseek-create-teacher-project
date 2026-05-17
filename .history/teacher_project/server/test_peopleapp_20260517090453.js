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
  
  // 找到所有文章标题 (在 HTML 中的文本)
  // 找 a 标签里像文章标题的
  const patterns = [
    /<a[^>]+article[^>]*>([\s\S]*?)<\/a>/gi,
    /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi,
    /<div[^>]*title[^>]*>([\s\S]*?)<\/div>/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    let count = 0;
    while ((match = pattern.exec(html)) !== null && count < 20) {
      const text = match[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
      if (text.length > 10 && text.length < 100) {
        console.log('Text:', text);
        count++;
      }
    }
  }
  
  // 打印页面中所有的中文文本块
  console.log('\n\n=== Raw text chunks ===');
  const textChunks = html.match(/>([^<>]{15,80})</g);
  if (textChunks) {
    const filtered = [...new Set(textChunks.map(t => t.replace(/^>|<$/g, '').trim()))]
      .filter(t => t.length > 10 && !t.includes('{') && !t.includes(';') && /[\u4e00-\u9fff]/.test(t));
    filtered.slice(0, 40).forEach((t, i) => console.log((i+1) + '.', t));
  }
}

test().catch(e => console.error(e.message));
