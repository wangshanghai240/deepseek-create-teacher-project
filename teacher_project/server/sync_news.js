const axios = require('axios');
const insforge = require('./config/insforge');

const MAX_NEWS_COUNT = 30;
const SYNC_INTERVAL_MS = 30 * 60 * 1000;

const CCTV_NEWS = [
  { title: '习近平同美国总统特朗普在中南海小范围会晤', summary: '5月15日上午，国家主席习近平在中南海同美国总统特朗普举行小范围会晤。', url: 'https://news.cctv.com/2026/05/15/ARTIAneEsa1bFKov9P4c0nIM260515.shtml' },
  { title: '时政快讯丨习近平同美国总统特朗普在中南海小范围会晤', summary: '5月15日，国家主席习近平在中南海同美国总统特朗普举行小范围会晤。', url: 'https://news.cctv.com/2026/05/15/ARTIwKwN9zncxplCwpDuyEa6260515.shtml' },
  { title: '时政微观察丨习主席深刻阐释"中美建设性战略稳定关系"的核心要义', summary: '应习近平主席邀请，美国总统特朗普于5月13日至15日对中国进行国事访问。', url: 'https://news.cctv.com/2026/05/15/ARTIYXbUMm3qnJztHjgZJMwF260515.shtml' },
  { title: '央行开展3000亿元买断式逆回购操作', summary: '中国人民银行以固定数量、利率招标、多重价位中标方式开展3000亿元买断式逆回购操作。', url: 'https://jingji.cctv.com/2026/05/15/ARTIiHjutDppqxpUIL8PIazK260515.shtml' },
  { title: '明天起国内航线燃油附加费上调', summary: '国内航线燃油附加费即将上调。', url: 'https://tv.cctv.com/2026/05/15/VIDEDOZ9xHPVLiZKl2wkCVMe260515.shtml' },
  { title: '探索历史文脉 长江三峡首个考古遗址展示中心在渝开放', summary: '长江三峡首个考古遗址展示中心在重庆忠县皇华城考古遗址公园正式开放。', url: 'https://news.cctv.com/2026/05/15/ARTITfxphUzcunYh5uwyxvD4260515.shtml' },
];

// (其他新闻条目略，完整列表见备份文件)

async function scrapeNewsFromCCTV() {
  console.log('  → 尝试从 news.cctv.com 抓取补充新闻...');
  try {
    const res = await axios.get('https://news.cctv.com/', {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const html = res.data;
    const linkPattern = /<a[^>]*href="(https:\/\/(?:[a-z]+\.)?cctv\.com\/[^"]+\.shtml)"[^>]*>([\s\S]*?)<\/a>/gi;
    
    const scraped = [];
    let match;
    while ((match = linkPattern.exec(html)) !== null) {
      const url = match[1].trim();
      let title = match[2].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (title.length < 6) continue;
      if (title.includes('javascript') || title.includes('更多') || title.includes('CCTV') || title.includes('直播')) continue;
      if (!scraped.find(s => s.url === url)) {
        scraped.push({ title, url, summary: title });
      }
    }
    console.log(`  → 抓取到 ${scraped.length} 条补充新闻`);
    return scraped;
  } catch (err) {
    console.error(`  ⚠ 抓取补充新闻失败: ${err.message}`);
    return [];
  }
}

async function fetchNewsDetail(url) {
  try {
    const res = await axios.get(url, { 
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = res.data;

    let reporter = '';
    const reporterMatch = html.match(/(?:记者|作者)[：:]\s*([^<\s]{2,10})/);
    if (reporterMatch) reporter = reporterMatch[1].trim();

    let content = '';
    const contentdateMatch = html.match(/var\s+contentdate\s*=\s*'([\s\S]*?)';/);
    if (contentdateMatch) {
      content = contentdateMatch[1]
        .replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    }

    if (!content || content.length < 50) {
      const contentPatterns = [
        /<div class="content_body"[^>]*>([\s\S]*?)<\/div>\s*<div class="(?:edit|pagefun|share)"/,
        /<div class="cnt_bd"[^>]*>([\s\S]*?)<\/div>\s*<!--\s*(?:责任编辑|编辑)/,
        /<article[^>]*>([\s\S]*?)<\/article>/,
        /<div class="article-body"[^>]*>([\s\S]*?)<\/div>/,
        /<div class="content"[^>]*>([\s\S]*?)<\/div>/,
      ];
      for (const pattern of contentPatterns) {
        const m = html.match(pattern);
        if (m) {
          content = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
          if (content.length > 50) break;
        }
      }
    }

    let imageUrl = '';
    const imgMatch = html.match(/<img[^>]+src="([^"]+)"[^>]*class="[^"]*image[^"]*"/);
    if (imgMatch) {
      imageUrl = imgMatch[1].startsWith('http') ? imgMatch[1] : 'https:' + imgMatch[1];
    }

    return { reporter, content: content.substring(0, 5000), imageUrl };
  } catch (err) {
    return { reporter: '', content: '', imageUrl: '' };
  }
}

async function trimOldNews() {
  try {
    const { data: allRows, error: countError } = await insforge.select('news', { select: 'id' });
    if (countError) throw countError;
    const total = (allRows || []).length;

    if (total > MAX_NEWS_COUNT) {
      const toDelete = total - MAX_NEWS_COUNT;
      const { data: rows, error: fetchError } = await insforge.select('news', {
        select: 'id',
        order: 'created_at.asc',
        limit: toDelete
      });
      if (fetchError) throw fetchError;

      if (rows && rows.length > 0) {
        const ids = rows.map(r => r.id);
        const { error: deleteError } = await insforge.remove('news', [{ column: 'id', operator: 'in', value: `(${ids.join(',')})` }]);
        if (deleteError) throw deleteError;
        console.log(`  → 已删除 ${ids.length} 条旧新闻（当前共 ${total} 条）`);
        return ids.length;
      }
    }
    return 0;
  } catch (err) {
    console.error('  ⚠ 删除旧新闻失败:', err.message);
    return 0;
  }
}

async function syncNews() {
  console.log('\n========================================');
  console.log(`  CCTV 新闻同步 [${new Date().toLocaleString('zh-CN')}]`);
  console.log('========================================');

  try {
    const scrapedItems = await scrapeNewsFromCCTV();
    
    const newsItems = [...CCTV_NEWS];
    const existingUrls = new Set(CCTV_NEWS.map(n => n.url));
    for (const item of scrapedItems) {
      if (!existingUrls.has(item.url) && !newsItems.find(n => n.title === item.title)) {
        newsItems.push(item);
        existingUrls.add(item.url);
      }
    }
    
    console.log(`  → 共 ${newsItems.length} 条新闻`);

    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < newsItems.length; i++) {
      const item = newsItems[i];
      console.log(`[${i + 1}/${newsItems.length}] ${item.title}`);

      const { data: existing } = await insforge.select('news', {
        select: 'id',
        eq: { column: 'title', value: item.title }
      });

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      console.log(`  → 获取详情...`);
      let detail;
      try {
        detail = await fetchNewsDetail(item.url);
      } catch (fetchErr) {
        console.error(`  ⚠ 获取详情失败: ${fetchErr.message}`);
        detail = { reporter: '', content: '', imageUrl: '' };
      }

      const summary = item.summary || item.title;
      const content = detail.content || item.summary || item.title;
      const reporter = detail.reporter || '央视新闻';
      
      try {
        const { error: insertError } = await insforge.insert('news', {
          title: item.title, summary, content: content || summary,
          reporter, source: 'news.cctv.com', source_url: item.url,
          image_url: detail.imageUrl || null
        });
        if (insertError) throw insertError;
        inserted++;
        console.log(`  ✓ 已导入`);
      } catch (insertErr) {
        console.error(`  ✗ 插入失败: ${insertErr.message}`);
      }
    }

    const deleted = await trimOldNews();

    console.log('\n----------------------------------------');
    console.log(`  新增: ${inserted} 条 | 跳过: ${skipped} 条 | 删除: ${deleted} 条`);
    console.log('----------------------------------------\n');

    return { inserted, skipped, deleted };
  } catch (err) {
    console.error('同步失败:', err.message);
    return { inserted: 0, skipped: 0, deleted: 0, error: err.message };
  }
}

function startNewsSync(runImmediately = true) {
  console.log(`📰 新闻定时同步已启动，每 ${SYNC_INTERVAL_MS / 60000} 分钟执行一次`);
  if (runImmediately) {
    setTimeout(() => syncNews(), 2000);
  }
  const timer = setInterval(syncNews, SYNC_INTERVAL_MS);
  return {
    stop: () => { clearInterval(timer); console.log('📰 新闻定时同步已停止'); }
  };
}

if (require.main === module) {
  syncNews().then(() => {
    console.log('单次同步完成。');
    process.exit(0);
  }).catch(err => {
    console.error('同步异常:', err);
    process.exit(1);
  });
}

module.exports = { syncNews, startNewsSync };
