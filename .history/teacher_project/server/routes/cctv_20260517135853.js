const express = require('express');
const axios = require('axios');
const router = express.Router();

// 央视栏目配置 & 关键词
const CATEGORIES = [
  { id: 'news', name: '新闻', domains: ['news.cctv.com'], keywords: ['要闻','时政','最新'] },
  { id: 'china', name: '国内', domains: ['news.cctv.com'], keywords: ['中国','国内','各省','地方'] },
  { id: 'world', name: '国际', domains: ['news.cctv.com'], keywords: ['国际','美国','俄','联合国','世卫','全球'] },
  { id: 'photo', name: '图片', domains: ['photo.cctv.com'], keywords: ['图','图集','图片'] },
  { id: 'people', name: '人物', domains: ['news.cctv.com'], keywords: ['人物','专访','对话'] },
  { id: 'mil', name: '军事', domains: ['military.cctv.com'], keywords: ['军事','国防','军','火箭'] },
];

// CCTV新闻列表（来自sync_news.js的45条今日新闻）
function buildArticlePool() {
  const articles = [
    { title: '习近平同美国总统特朗普在中南海小范围会晤', summary: '5月15日上午，国家主席习近平在中南海同美国总统特朗普举行小范围会晤。', url: 'https://news.cctv.com/2026/05/15/ARTIAneEsa1bFKov9P4c0nIM260515.shtml', domain: 'news.cctv.com' },
    { title: '时政快讯丨习近平同美国总统特朗普在中南海小范围会晤', summary: '5月15日，国家主席习近平在中南海同美国总统特朗普举行小范围会晤。', url: 'https://news.cctv.com/2026/05/15/ARTIwKwN9zncxplCwpDuyEa6260515.shtml', domain: 'news.cctv.com' },
    { title: '时政微观察丨习主席深刻阐释"中美建设性战略稳定关系"的核心要义', summary: '应习近平主席邀请，美国总统特朗普于5月13日至15日对中国进行国事访问。', url: 'https://news.cctv.com/2026/05/15/ARTIYXbUMm3qnJztHjgZJMwF260515.shtml', domain: 'news.cctv.com' },
    { title: '央行开展3000亿元买断式逆回购操作', summary: '中国人民银行开展3000亿元买断式逆回购操作。', url: 'https://jingji.cctv.com/2026/05/15/ARTIiHjutDppqxpUIL8PIazK260515.shtml', domain: 'jingji.cctv.com' },
    { title: '明天起国内航线燃油附加费上调', summary: '国内航线燃油附加费即将上调。', url: 'https://tv.cctv.com/2026/05/15/VIDEDOZ9xHPVLiZKl2wkCVMe260515.shtml', domain: 'tv.cctv.com' },
    { title: '探索历史文脉 长江三峡首个考古遗址展示中心在渝开放', summary: '长江三峡首个考古遗址展示中心在重庆开放。', url: 'https://news.cctv.com/2026/05/15/ARTITfxphUzcunYh5uwyxvD4260515.shtml', domain: 'news.cctv.com' },
    { title: '美官员称以黎第三轮会谈"富有成效且积极"', summary: '以色列和黎巴嫩第三轮会谈富有成效且积极。', url: 'https://news.cctv.com/2026/05/15/ARTIF2eKSmcy0ug04kv2ls6w260515.shtml', domain: 'news.cctv.com' },
    { title: '我国成功发射泰景三号05A星等5颗卫星', summary: '我国在东风商业航天创新试验区成功发射5颗卫星。', url: 'https://news.cctv.com/2026/05/15/ARTIn2sFAagVMYn8YxCAxP7b260515.shtml', domain: 'news.cctv.com' },
    { title: '广东中山启动防汛Ⅲ级应急响应', summary: '广东省中山市中南部出现强降水。', url: 'https://news.cctv.com/2026/05/15/ARTIBfHySAn0tOfHKxq44WuA260515.shtml', domain: 'news.cctv.com' },
    { title: '下足"绣花"功夫解决百姓"大民生"', summary: '在海南海口，能用手机打的微公交正式运营。', url: 'https://news.cctv.com/2026/05/15/ARTIyhYbJTcOjMGWAtyJvav2260515.shtml', domain: 'news.cctv.com' },
    { title: '中国游、中国购"热力"值爆表', summary: '过境免签政策持续扩容、免税购物政策不断优化。', url: 'https://news.cctv.com/2026/05/15/ARTIpUD6ELUuRoSnukhFM5RY260515.shtml', domain: 'news.cctv.com' },
    { title: '这波赴港上市潮数量多、成色"靓"', summary: '2026年以来，内地企业赴港上市热度持续攀升。', url: 'https://news.cctv.com/2026/05/15/ARTIUN2z7suDqcIBTKT5Qz18260515.shtml', domain: 'news.cctv.com' },
    { title: '国家药品监督管理局等7部门联合发布《医药代表管理办法》', summary: '国家药监局会同多部门修订医药代表管理办法。', url: 'https://news.cctv.com/2026/05/15/ARTIIerHOlrltGevhc3owTrh260515.shtml', domain: 'news.cctv.com' },
    { title: '勇挑大梁实干争先 建设"强富美高"新江苏', summary: '江苏经济总量连跨4个万亿元台阶。', url: 'https://news.cctv.com/2026/05/15/ARTIIEhvCeev5cVRiF7OMqD8260515.shtml', domain: 'news.cctv.com' },
    { title: '新疆阿克苏地区库车市发生3.2级地震', summary: '中国地震台网正式测定在新疆阿克苏地区库车市发生3.2级地震。', url: 'https://news.cctv.com/2026/05/15/ARTIMQghZpxaasuxPHfDEwFs260515.shtml', domain: 'news.cctv.com' },
    { title: '数智+家教让家庭教育成为孩子与家长可触摸、可体验、可学习的奇妙场景', summary: '国际家庭日，多地推进学校家庭社会协同育人新模式。', url: 'https://news.cctv.com/2026/05/15/ARTIJ1t1ZF3oeDItJsniMuAb260515.shtml', domain: 'news.cctv.com' },
    { title: '粮食进得来存得住 守住农民种粮底线', summary: '2026年夏粮旺季收购即将从5月下旬全面展开。', url: 'https://news.cctv.com/2026/05/15/ARTIEJdsag4PPdWzq16TeDtP260515.shtml', domain: 'news.cctv.com' },
    { title: '平陆运河刷新进度条 人气渐旺产业正兴', summary: '以平陆运河为代表的一大批交通强国重点项目正多点突破。', url: 'https://news.cctv.com/2026/05/15/ARTIwIuisDeZ2JdtDROJLrzk260515.shtml', domain: 'news.cctv.com' },
    { title: '完善涉外消费服务 跨境消费活力持续释放', summary: '国内多地优化涉外消费服务保障。', url: 'https://news.cctv.com/2026/05/15/ARTI28RbrdcdVNiRzheYfUB6260515.shtml', domain: 'news.cctv.com' },
    { title: '火车串联美景 各地旅游列车加密开行', summary: '前4个月全国铁路累计开行旅游列车1020列。', url: 'https://news.cctv.com/2026/05/15/ARTIsZFpovGMYuoDvDnoxDnm260515.shtml', domain: 'news.cctv.com' },
    { title: '1至4月全国铁路发送旅客15.55亿人次', summary: '铁路部门动态优化列车开行方案。', url: 'https://news.cctv.com/2026/05/15/ARTI0247wVm8QVDrLwTGwTcI260515.shtml', domain: 'news.cctv.com' },
    { title: '市场监管总局：今年将对173种重点产品开展国家监督抽查', summary: '今年将对8大类173种重点产品开展监督抽查。', url: 'https://news.cctv.com/2026/05/15/ARTI4PBcZy6aILCSNnxO6MPI260515.shtml', domain: 'news.cctv.com' },
    { title: '上海三中院：严厉惩治金融市场老鼠仓犯罪', summary: '上海三中院对利用未公开信息交易罪案件作出一审判决。', url: 'https://news.cctv.com/2026/05/15/ARTIOWVOyVctKisbUbJd76Vx260515.shtml', domain: 'news.cctv.com' },
    { title: '今年首轮大范围持续性降雨来袭 两部门部署防汛工作', summary: '5月15日至19日我国迎来今年首轮大范围持续性降雨。', url: 'https://news.cctv.com/2026/05/15/ARTI1nNrKW7uEOWSmLYNciPL260515.shtml', domain: 'news.cctv.com' },
    { title: '2026年国家统一法律职业资格考试大纲将出版', summary: '司法部制定2026年法考大纲将于近日出版发行。', url: 'https://news.cctv.com/2026/05/15/ARTISIvK3XjzkMyeHyr83Xmt260515.shtml', domain: 'news.cctv.com' },
    { title: '公安部公布10起依法打击跨境销售可制毒物品典型案例', summary: '2025年以来共破获相关刑事案件29起。', url: 'https://news.cctv.com/2026/05/15/ARTIHFXRuNUVqQz08RxFKXlQ260515.shtml', domain: 'news.cctv.com' },
    { title: '做强做优做大实体经济', summary: '《求是》杂志发表习近平总书记重要文章。', url: 'https://news.cctv.com/2026/05/15/ARTI0kykA4U4zLBSNGl6zDOp260515.shtml', domain: 'news.cctv.com' },
    { title: '创新药试验数据有了护身符 最长保护期6年', summary: '国家药监局强化药品全生命周期严格监管。', url: 'https://news.cctv.com/2026/05/15/ARTIZJ94A7trZhbp8CbD5SUR260515.shtml', domain: 'news.cctv.com' },
    { title: '从人工巡护到天地空智慧互联 用科技守护野生动物家园', summary: '卡拉麦里成为世界最大普氏野马栖息地。', url: 'https://news.cctv.com/2026/05/15/ARTIhh4p0b4B2pABuLu6SXh9260515.shtml', domain: 'news.cctv.com' },
    { title: '一街一景厚植城市绿色底蕴 生态绿化造福民生', summary: '全国各地草木勃发生态绿化成果惠及民生。', url: 'https://news.cctv.com/2026/05/15/ARTIGaFcbQuizMP6VAyAzUmj260515.shtml', domain: 'news.cctv.com' },
    { title: '河南证监局原副局长楚天慧被开除党籍和公职', summary: '河南证监局原副局长严重违纪违法被开除。', url: 'https://news.cctv.com/2026/05/15/ARTIt6mPwi5hY1Ssf78XyWBq260515.shtml', domain: 'news.cctv.com' },
    { title: '美国总统特朗普结束访华离京', summary: '美国总统特朗普结束对中国的国事访问离开北京。', url: 'https://news.cctv.com/2026/05/15/ARTIopyID2pSq8283Rkl5VoX260515.shtml', domain: 'news.cctv.com' },
    { title: '《求是》杂志发表习近平总书记重要文章', summary: '《求是》杂志发表习近平总书记重要文章。', url: 'https://news.cctv.com/2026/05/15/ARTIgoARY7GJUPt6WDFDR2YP260515.shtml', domain: 'news.cctv.com' },
    { title: '雄安新区举办人才交流会 提供7700多个岗位信息', summary: '雄安新区举办全国城市联合招聘青年人才交流会。', url: 'https://news.cctv.com/2026/05/15/ARTIISGpufONP7usK3v8y2JN260515.shtml', domain: 'news.cctv.com' },
    { title: '文化中国行 千锤百炼银韵双生 古老非遗走向未来', summary: '传承人母炳林让古老银器技艺在匠心传承中焕发新生。', url: 'https://news.cctv.com/2026/05/15/ARTIYQiUuv3tC8zji8C83Q1V260515.shtml', domain: 'news.cctv.com' },
  ];
  
  // 按标题关键词分配分类
  return articles.map((a, i) => {
    let catId = 'news';
    for (const cat of CATEGORIES) {
      if (cat.domains.includes(a.domain) && a.title.length > 2) {
        // 根据关键词匹配
        for (const kw of cat.keywords) {
          if (a.title.includes(kw) || a.summary.includes(kw)) {
            catId = cat.id;
            break;
          }
        }
      }
    }
    // 国际相关
    if (a.title.includes('美国') || a.title.includes('俄') || a.title.includes('国际') || a.title.includes('联合国') || a.title.includes('会谈')) catId = 'world';
    // 中国相关
    if (a.title.includes('中国') || a.title.includes('我国') || a.title.includes('国内')) catId = 'china';
    
    return { id: 'cctv_' + i, title: a.title, summary: a.summary, image: '', time: '2026-05-15', source: '央视新闻', url: a.url, category: catId };
  });
}

// 栏目列表
router.get('/cctv/categories', (req, res) => {
  res.json({ success: true, data: CATEGORIES.map(c => ({ id: c.id, name: c.name })) });
});

// 文章列表
router.get('/cctv/list', async (req, res) => {
  try {
    const catId = req.query.cat || 'news';
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    let pool = buildArticlePool();
    
    // 如果首页有爬取到的额外文章，尝试获取
    try {
      const homeRes = await axios.get('https://news.cctv.com/', { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const more = homeRes.data.match(/<a[^>]*href="(https:\/\/news\.cctv\.com\/2026\/\d{2}\/\d{2}\/[A-Za-z0-9]+\.shtml)"[^>]*>([^<]{8,50})<\/a>/g);
      if (more) {
        const seen = new Set(pool.map(a => a.url));
        [...new Set(more)].slice(0, 20).forEach(item => {
          const url = (item.match(/href="([^"]+)"/) || [])[1];
          const title = item.replace(/<[^>]+>/g, '').trim();
          if (url && title.length > 5 && !seen.has(url)) {
            seen.add(url);
            pool.push({ id: 'cctv_s_' + pool.length, title, summary: '', image: '', time: '2026-05-17', source: '央视新闻', url, category: 'news' });
          }
        });
      }
    } catch(e) { /* ignore scrape errors */ }

    const filtered = pool.filter(a => a.category === catId || catId === 'news');
    const start = (page - 1) * pageSize;
    res.json({ success: true, data: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize });
  } catch (err) {
    console.error('央视获取失败:', err.message);
    res.json({ success: false, message: err.message, data: [] });
  }
});

// 文章详情
router.get('/cctv/detail', async (req, res) => {
  try {
    const url = decodeURIComponent(req.query.url || '');
    if (!url) return res.json({ success: false, message: '缺少URL' });

    const r = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' } });
    const cheerio = require('cheerio');
    const $ = cheerio.load(r.data);

    const title = $('title').text().replace(/[_-].+$/, '').trim();
    
    // 提取正文
    const paragraphs = [];
    // 尝试从JS变量 contentdate 提取
    const contentMatch = r.data.match(/var\s+contentdate\s*=\s*'([\s\S]*?)';/);
    if (contentMatch) {
      const text = contentMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      text.split(/[\n。]/).filter(p => p.trim().length > 15).forEach(p => paragraphs.push(p.trim() + '。'));
    }
    // 尝试从DOM提取
    if (paragraphs.length < 3) {
      $('p').each((i, el) => { const t = $(el).text().trim(); if (t.length > 20 && !t.includes('Copyright') && !t.includes('责任编辑')) paragraphs.push(t); });
    }

    // 提取图片 - 区分内容图片和Logo
    const contentImages = [];
    const logoImages = [];
    const logoKeywords = ['logo', 'icon', 'header', 'footer', 'btn', 'banner', 'share', 'nav', 'weixin', 'weibo', 'qrcode', 'erweima', 'sns_'];
    
    $('img[src]').each((i, el) => {
      let s = $(el).attr('src');
      if (!s || !s.match(/\.(jpg|jpeg|png)/i) || s.includes('.ico')) return;
      if (!s.startsWith('http')) s = 'http:' + (s.startsWith('//') ? s : '//' + s);
      
      // 判断是否为Logo/装饰图片
      const isLogo = logoKeywords.some(kw => s.toLowerCase().includes(kw) || (s.match(/[_-][a-z]+\.[a-z]+$/i) && s.match(/\d+x\d+/)));
      const width = $(el).attr('width');
      const height = $(el).attr('height');
      const isSmall = (width && parseInt(width) < 100) || (height && parseInt(height) < 100);
      const isImgLogo = $(el).closest('.logo, .header, .footer, .nav, .share').length > 0;
      
      if (isLogo || isSmall || isImgLogo) {
        if (!logoImages.includes(s)) logoImages.push(s);
      } else {
        if (!contentImages.includes(s)) contentImages.push(s);
      }
    });

    // 提取视频 - 从多种格式
    const videos = [];
    // 从 <video> 标签
    $('video source[src]').each((i, el) => { const s = $(el).attr('src'); if (s && !videos.includes(s)) videos.push(s); });
    $('video[src]').each((i, el) => { const s = $(el).attr('src'); if (s && !videos.includes(s)) videos.push(s); });
    // 从 htmlvideocode 变量（CCTV特有）
    const hvcMatch = r.data.match(/htmlvideocode\s*=\s*['"]\s*([\s\S]*?)\s*['"]\s*;/);
    if (hvcMatch) {
      const videoHtml = hvcMatch[1];
      // 从iframe src提取
      const iframeSrc = videoHtml.match(/src=["']([^"']+)["']/);
      if (iframeSrc) {
        videos.push(iframeSrc[1]);
      }
      // 从video/embed标签提取
      const vSrc = videoHtml.match(/src=["']([^"']+\.(?:mp4|m3u8|flv)[^"']*)["']/i);
      if (vSrc && !videos.includes(vSrc[1])) videos.push(vSrc[1]);
    }
    // 从 flvUrl/flv_url 变量
    const flvMatch = r.data.match(/flvUrl\s*[=:]\s*['"]?([^'"\s;]+\.(?:mp4|m3u8|flv)[^'"\s;]*)['"]?/i);
    if (flvMatch && !videos.includes(flvMatch[1])) videos.push(flvMatch[1]);
    // 从 mp4Url/mp4_url 变量
    const mp4Match = r.data.match(/mp4Url\s*[=:]\s*['"]?([^'"\s;]+\.(?:mp4|m3u8|flv)[^'"\s;]*)['"]?/i);
    if (mp4Match && !videos.includes(mp4Match[1])) videos.push(mp4Match[1]);
    
    const hasVideo = videos.length > 0;

    // 构建内容HTML
    const parts = [];
    
    // 如果有视频，视频放前面
    if (hasVideo) {
      const firstVideo = videos[0];
      // 判断是否为iframe地址（如CCTV/Youku等播放器）
      if (firstVideo.includes('//') && !firstVideo.match(/\.(mp4|m3u8|flv)$/i)) {
        parts.push('<div class="article-video"><iframe src="' + firstVideo + '" frameborder="0" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true"></iframe></div>');
      } else {
        parts.push('<div class="article-video"><video controls preload="metadata" playsinline><source src="' + firstVideo + '"></video></div>');
      }
    }
    
    // 内容图片（最多展示5张）
    const displayImages = contentImages.slice(0, 5);
    
    // 将图片交错插入文本中
    let imgIdx = 0;
    for (let i = 0; i < Math.min(paragraphs.length, 25); i++) {
      const p = paragraphs[i];
      // 如果还没有展示图片，先展示第一张
      if (imgIdx === 0 && imgIdx < displayImages.length) {
        parts.push('<div class="article-img"><img src="' + displayImages[imgIdx] + '" alt="" loading="lazy" /></div>');
        imgIdx++;
      }
      parts.push('<p class="article-p">' + p + '</p>');
      // 每3段插入一张图
      if (i > 0 && i % 3 === 0 && imgIdx < displayImages.length) {
        parts.push('<div class="article-img"><img src="' + displayImages[imgIdx] + '" alt="" loading="lazy" /></div>');
        imgIdx++;
      }
    }
    // 多余的图片追加到末尾
    while (imgIdx < displayImages.length) {
      parts.push('<div class="article-img"><img src="' + displayImages[imgIdx] + '" alt="" loading="lazy" /></div>');
      imgIdx++;
    }
    
    // Logo图片缩小展示（如果有且不同于内容图）
    if (logoImages.length > 0 && logoImages.length < 10) {
      parts.push('<div class="logo-gallery"><span class="logo-label">来源图片</span><div class="logo-list">');
      for (const logo of logoImages.slice(0, 5)) {
        parts.push('<img src="' + logo + '" alt="" class="logo-thumb" loading="lazy" />');
      }
      parts.push('</div></div>');
    }

    res.json({
      success: true,
      data: {
        title,
        content: parts.join('\n'),
        image: contentImages[0] || logoImages[0] || '',
        source: '央视新闻',
        url,
        hasVideo
      }
    });
  } catch (err) {
    console.error('央视详情获取失败:', err.message);
    res.json({ success: false, message: err.message, data: null });
  }
});

module.exports = router;
