import { Actor } from 'apify';
import { CheerioCrawler, RequestQueue } from 'crawlee';

/**
 * Trust-tiered source list. tier values map to credibility weights:
 *   primary           1.0  — govt portals, court orders, RTI (none here yet)
 *   established_press 0.8  — Hindu, IE, NDTV, Vikatan, Dinamani, Wire
 *   regional_press    0.6  — Dinamalar, Maalai Murasu, Theekkadhir
 *   online_native     0.7  — Scroll, NewsMinute, Quint, Print
 *   spark_plus        0.7  — User-trusted Tamil media handle
 *
 * Verification gate (multi-source) lives in the FastAPI backend, not here.
 * This scraper just feeds candidates; the backend dedups by event-signature.
 */

const RSS_FEEDS = [
  // Established English press (TN + national)
  { name: 'the_hindu_tn',          tier: 'established_press', url: 'https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss' },
  { name: 'the_hindu_national',    tier: 'established_press', url: 'https://www.thehindu.com/news/national/feeder/default.rss' },
  { name: 'indian_express_chennai',tier: 'established_press', url: 'https://indianexpress.com/section/cities/chennai/feed/' },
  { name: 'indian_express_india',  tier: 'established_press', url: 'https://indianexpress.com/section/india/feed/' },
  { name: 'toi_chennai',           tier: 'established_press', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128816011.cms' },
  { name: 'ndtv_india',            tier: 'established_press', url: 'https://feeds.feedburner.com/ndtvnews-india-news' },
  { name: 'deccan_chronicle',      tier: 'established_press', url: 'https://www.deccanchronicle.com/google_news.xml' },

  // Online-native / independent
  { name: 'scroll_in',             tier: 'online_native',     url: 'https://feeds.feedburner.com/ScrollinArticles' },
  { name: 'the_wire',              tier: 'online_native',     url: 'https://thewire.in/rss' },
  { name: 'thenewsminute',         tier: 'online_native',     url: 'https://www.thenewsminute.com/feed' },
  { name: 'the_quint',             tier: 'online_native',     url: 'https://www.thequint.com/stories.rss' },
  { name: 'the_print',             tier: 'online_native',     url: 'https://theprint.in/feed/' },

  // Tamil press
  { name: 'vikatan',               tier: 'established_press', url: 'https://www.vikatan.com/rss-feed' },
  { name: 'dinamani',              tier: 'established_press', url: 'https://www.dinamani.com/rss/latest-news.xml' },
  { name: 'hindu_tamil',           tier: 'established_press', url: 'https://www.hindutamil.in/news/tamilnadu/rss' },
  { name: 'dinamalar',             tier: 'regional_press',    url: 'https://www.dinamalar.com/rss.asp?cat=2' },
  { name: 'maalai_malar',          tier: 'regional_press',    url: 'https://www.maalaimalar.com/rssfeed/tamilnadu' },
  { name: 'puthiya_thalaimurai',   tier: 'regional_press',    url: 'https://www.puthiyathalaimurai.com/rss/news' },
  { name: 'theekkathir',           tier: 'regional_press',    url: 'https://theekkathir.in/feed' },

  // User-requested
  { name: 'spark_plus',            tier: 'online_native',     url: 'https://www.sparkpluz.com/feed' },

  // Crime-focused / district editions / specific beats
  { name: 'hindu_cities',          tier: 'established_press', url: 'https://www.thehindu.com/news/cities/feeder/default.rss' },
  { name: 'hindu_chennai',         tier: 'established_press', url: 'https://www.thehindu.com/news/cities/chennai/feeder/default.rss' },
  { name: 'hindu_madurai',         tier: 'established_press', url: 'https://www.thehindu.com/news/cities/Madurai/feeder/default.rss' },
  { name: 'hindu_coimbatore',      tier: 'established_press', url: 'https://www.thehindu.com/news/cities/Coimbatore/feeder/default.rss' },
  { name: 'hindu_tiruchirappalli', tier: 'established_press', url: 'https://www.thehindu.com/news/cities/Tiruchirapalli/feeder/default.rss' },
  { name: 'toi_madurai',           tier: 'established_press', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128670595.cms' },
  { name: 'toi_coimbatore',        tier: 'established_press', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128710697.cms' },
  { name: 'toi_trichy',            tier: 'established_press', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128820097.cms' },
  { name: 'ndtv_offbeat',          tier: 'established_press', url: 'https://feeds.feedburner.com/ndtvnews-offbeat' },
  { name: 'newsmobile',            tier: 'online_native',     url: 'https://newsmobile.in/articles/feed/' },
];

/**
 * Loosened relevance scope. Anything happening in Tamil Nadu after
 * May 11, 2026 is candidate — TVK is now the responsible government.
 * Claude makes the final judgment in the backend; this regex just
 * filters out clearly unrelated stories to save API calls.
 */
const TN_KEYWORDS = [
  'tamil nadu', 'tamilnadu', 'chennai', 'coimbatore', 'madurai', 'salem',
  'trichy', 'tiruchirappalli', 'erode', 'tirunelveli', 'thoothukudi', 'tuticorin',
  'vellore', 'kanchipuram', 'thanjavur', 'kanyakumari', 'karur', 'krishnagiri',
  'dindigul', 'sivagangai', 'ariyalur', 'cuddalore', 'nagapattinam',
  'tvk', 'vijay', 'thalapathy', 'tamilaga vettri kazhagam',
  'cm vijay', 'tn cm', 'tn govt', 'tamil nadu govt',
  'dmk', 'mk stalin', 'kanimozhi', 'udhayanidhi',
  'aiadmk', 'palaniswami', 'eps', 'ops',
  'tneb', 'electricity', 'power cut', 'load shedding',
  'tasmac', 'kalaignar', 'magalir urimai',
];

const POLITICAL_INCIDENT_KEYWORDS = [
  // Crime / safety
  'murder', 'rape', 'sexual assault', 'molestation', 'arrest', 'fir', 'crime',
  'killed', 'death', 'custodial', 'lathi', 'lockup', 'encounter',
  'honour killing', 'caste violence', 'dalit', 'sc/st',
  // Governance failures
  'power cut', 'blackout', 'shutdown', 'water shortage', 'sewage',
  'flood', 'rain', 'inundation', 'pothole', 'garbage',
  // Corruption / governance
  'corruption', 'scam', 'tender', 'bribe', 'graft', 'kickback',
  'cm', 'minister', 'mla', 'mp', 'cabinet', 'inauguration', 'foundation',
  'scheme', 'launch', 'inaugurate', 'announce', 'flagship',
  // Press freedom
  'journalist', 'press', 'media raid', 'sedition', 'ipc 153',
  // Communal
  'communal', 'riot', 'clash', 'mosque', 'temple', 'church',
  // Economy
  'foxconn', 'pegatron', 'tata', 'vedanta', 'investment',
  'unemployment', 'job', 'closure', 'layoff', 'msme',
  // Fact-check / propaganda
  'fake', 'misleading', 'edited video', 'morphed', 'fact check', 'debunked',
  'ai generated', 'deepfake',
];

const WEBHOOK_URL = process.env.WEBHOOK_URL || '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

function isRelevant(title = '', text = '') {
  const combined = (title + ' ' + text).toLowerCase();
  const hasGeo = TN_KEYWORDS.some(kw => combined.includes(kw));
  const hasIncident = POLITICAL_INCIDENT_KEYWORDS.some(kw => combined.includes(kw));
  // Need BOTH a TN-geo signal AND a substantive incident signal.
  // This catches "Madurai murder" (geo + incident) but skips "Madurai weather forecast".
  return hasGeo && hasIncident;
}

function extractImageUrls($el) {
  const urls = new Set();
  // <enclosure url="..." type="image/...">
  $el.find('enclosure[type^="image"]').each((_, e) => {
    const u = $el.find(e).attr('url');
    if (u) urls.add(u);
  });
  // media:content / media:thumbnail
  $el.find('media\\:content, media\\:thumbnail').each((_, e) => {
    const u = $el.find(e).attr('url');
    if (u) urls.add(u);
  });
  // <img> inside description (RSS quirk — Tamil press often embeds <img> in description)
  const desc = $el.find('description').text() + $el.find('content\\:encoded').text();
  const imgMatches = desc.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
  for (const m of imgMatches) urls.add(m[1]);
  return Array.from(urls);
}

await Actor.init();

const input = await Actor.getInput() || {};
const maxArticlesPerSource = input.maxArticlesPerSource || 25;
const results = [];

const requestQueue = await RequestQueue.open();

for (const feed of RSS_FEEDS) {
  await requestQueue.addRequest({
    url: feed.url,
    userData: { type: 'rss', sourceName: feed.name, tier: feed.tier },
  });
}

const crawler = new CheerioCrawler({
  requestQueue,
  maxRequestsPerCrawl: RSS_FEEDS.length + (RSS_FEEDS.length * maxArticlesPerSource),
  additionalMimeTypes: ['application/rss+xml', 'application/xml', 'text/xml', 'application/atom+xml'],
  async requestHandler({ request, $ }) {
    const { type, sourceName, tier } = request.userData;

    if (type === 'rss') {
      const items = [];
      $('item').each((_, el) => {
        const $el = $(el);
        const title = $el.find('title').first().text().trim();
        const link = $el.find('link').first().text().trim() || $el.find('guid').first().text().trim();
        const description = $el.find('description').first().text().trim();
        const pubDate = $el.find('pubDate').first().text().trim();
        const imageUrls = extractImageUrls($el);
        if (link && title) items.push({ title, link, description, pubDate, imageUrls });
      });
      // Atom fallback
      if (items.length === 0) {
        $('entry').each((_, el) => {
          const $el = $(el);
          const title = $el.find('title').first().text().trim();
          const link = $el.find('link').attr('href') || '';
          const description = $el.find('summary').first().text().trim() || $el.find('content').first().text().trim();
          const pubDate = $el.find('updated').first().text().trim();
          const imageUrls = extractImageUrls($el);
          if (link && title) items.push({ title, link, description, pubDate, imageUrls });
        });
      }

      console.log(`[${sourceName}] RSS has ${items.length} items`);

      let queued = 0;
      for (const it of items.slice(0, maxArticlesPerSource)) {
        if (!isRelevant(it.title, it.description)) continue;
        await requestQueue.addRequest({
          url: it.link,
          uniqueKey: it.link,
          userData: {
            type: 'article',
            sourceName,
            tier,
            rssTitle: it.title,
            rssDescription: it.description,
            rssPubDate: it.pubDate,
            rssImageUrls: it.imageUrls,
          },
        });
        queued++;
      }
      console.log(`[${sourceName}] ${queued} relevant articles queued`);

    } else if (type === 'article') {
      $('nav, footer, .advertisement, .ad, script, style, .related, aside').remove();
      const text = $('article, .article-body, .story-body, [class*="article-body"], main, .post-content')
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 10000);
      const fallbackText = (request.userData.rssDescription || '').slice(0, 2000);

      // Try to find article-body images too (not just RSS)
      const articleImages = [];
      $('article img, .article-body img, .story-body img, main img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && !src.startsWith('data:') && articleImages.length < 5) articleImages.push(src);
      });

      const allImages = [...new Set([...(request.userData.rssImageUrls || []), ...articleImages])];

      const item = {
        url: request.url,
        title: request.userData.rssTitle,
        text: text || fallbackText,
        published_at: request.userData.rssPubDate || null,
        source: request.userData.sourceName,
        tier: request.userData.tier,
        image_urls: allImages.slice(0, 5),
      };
      results.push(item);
      await Actor.pushData(item);
      console.log(`[${request.userData.sourceName}] ${allImages.length} imgs | ${item.title.slice(0, 60)}`);
    }
  },
  failedRequestHandler({ request }) {
    console.error(`Failed: ${request.url}`);
  },
});

await crawler.run();

if (WEBHOOK_URL && results.length > 0) {
  // Send in chunks of 50 to avoid hitting payload size limits
  const CHUNK = 50;
  let totalSent = 0;
  for (let i = 0; i < results.length; i += CHUNK) {
    const chunk = results.slice(i, i + CHUNK);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-apify-secret': WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          actorId: process.env.APIFY_ACTOR_ID || 'tn-news-scraper',
          datasetId: process.env.APIFY_DEFAULT_DATASET_ID || 'local',
          items: chunk,
        }),
      });
      console.log(`Webhook chunk ${i / CHUNK + 1}: ${response.status} -- ${chunk.length} items`);
      if (response.ok) totalSent += chunk.length;
    } catch (err) {
      console.error('Webhook chunk failed:', err.message);
    }
  }
  console.log(`Total sent to webhook: ${totalSent} / ${results.length}`);
} else {
  console.log(`No webhook sent (WEBHOOK_URL=${!!WEBHOOK_URL}, items=${results.length})`);
}

console.log(`Done. Total relevant articles: ${results.length}`);
await Actor.exit();
