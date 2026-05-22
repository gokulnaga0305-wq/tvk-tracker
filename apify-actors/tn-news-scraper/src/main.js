import { Actor } from 'apify';
import { CheerioCrawler, RequestQueue } from 'crawlee';

// RSS feeds are 100x more reliable than HTML scraping
const RSS_FEEDS = [
  { name: 'the_hindu_tn', url: 'https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss' },
  { name: 'the_hindu_national', url: 'https://www.thehindu.com/news/national/feeder/default.rss' },
  { name: 'ndtv_india', url: 'https://feeds.feedburner.com/ndtvnews-india-news' },
  { name: 'scroll_in', url: 'https://feeds.feedburner.com/ScrollinArticles' },
  { name: 'the_wire', url: 'https://thewire.in/rss' },
  { name: 'newsminute', url: 'https://www.thenewsminute.com/feed' },
];

// Keywords that indicate TVK / TN-government / political-incident relevance
const KEYWORDS = [
  'tvk', 'vijay', 'thalapathy', 'tamil nadu', 'tamilnadu',
  'tamilaga vettri kazhagam', 'chief minister vijay', 'cm vijay',
  'dmk', 'aiadmk', 'tamil nadu cabinet', 'tn government', 'tn govt',
  'tn cm', 'chennai', 'kalaignar', 'magalir', 'tamil minister',
  'tn assembly', 'tn police', 'tn minister', 'tn cabinet',
];

const WEBHOOK_URL = process.env.WEBHOOK_URL || '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

function isRelevant(title = '', text = '') {
  const combined = (title + ' ' + text).toLowerCase();
  return KEYWORDS.some(kw => combined.includes(kw));
}

await Actor.init();

const input = await Actor.getInput() || {};
const maxArticlesPerSource = input.maxArticlesPerSource || 25;
const results = [];

const requestQueue = await RequestQueue.open();

// Seed RSS feed URLs
for (const feed of RSS_FEEDS) {
  await requestQueue.addRequest({
    url: feed.url,
    userData: { type: 'rss', sourceName: feed.name },
  });
}

const crawler = new CheerioCrawler({
  requestQueue,
  maxRequestsPerCrawl: RSS_FEEDS.length + (RSS_FEEDS.length * maxArticlesPerSource),
  additionalMimeTypes: ['application/rss+xml', 'application/xml', 'text/xml', 'application/atom+xml'],
  async requestHandler({ request, $, body }) {
    const { type, sourceName } = request.userData;

    if (type === 'rss') {
      // Parse RSS items
      const items = [];
      // Standard RSS 2.0
      $('item').each((_, el) => {
        const $el = $(el);
        const title = $el.find('title').first().text().trim();
        const link = $el.find('link').first().text().trim() || $el.find('guid').first().text().trim();
        const description = $el.find('description').first().text().trim();
        const pubDate = $el.find('pubDate').first().text().trim();
        if (link && title) items.push({ title, link, description, pubDate });
      });
      // Atom fallback
      if (items.length === 0) {
        $('entry').each((_, el) => {
          const $el = $(el);
          const title = $el.find('title').first().text().trim();
          const link = $el.find('link').attr('href') || '';
          const description = $el.find('summary').first().text().trim() || $el.find('content').first().text().trim();
          const pubDate = $el.find('updated').first().text().trim();
          if (link && title) items.push({ title, link, description, pubDate });
        });
      }

      console.log(`[${sourceName}] RSS has ${items.length} items`);

      let queued = 0;
      for (const it of items.slice(0, maxArticlesPerSource)) {
        if (!isRelevant(it.title, it.description)) continue;
        await requestQueue.addRequest({
          url: it.link,
          userData: {
            type: 'article',
            sourceName,
            rssTitle: it.title,
            rssDescription: it.description,
            rssPubDate: it.pubDate,
          },
        });
        queued++;
      }
      console.log(`[${sourceName}] ${queued} relevant articles queued`);

    } else if (type === 'article') {
      // Strip nav/ads from article page, extract clean text
      $('nav, footer, .advertisement, .ad, script, style, .related, aside').remove();
      const text = $('article, .article-body, .story-body, [class*="article-body"], main, .post-content')
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 10000);
      const fallbackText = (request.userData.rssDescription || '').slice(0, 2000);

      const item = {
        url: request.url,
        title: request.userData.rssTitle,
        text: text || fallbackText,
        published_at: request.userData.rssPubDate || null,
        source: request.userData.sourceName,
      };
      results.push(item);
      await Actor.pushData(item);
      console.log(`[${request.userData.sourceName}] Saved: ${item.title.slice(0, 70)}`);
    }
  },
  failedRequestHandler({ request }) {
    console.error(`Failed: ${request.url}`);
  },
});

await crawler.run();

// Send webhook to FastAPI backend
if (WEBHOOK_URL && results.length > 0) {
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
        items: results,
      }),
    });
    console.log(`Webhook sent: ${response.status} -- ${results.length} items`);
  } catch (err) {
    console.error('Webhook failed:', err.message);
  }
} else {
  console.log(`No webhook sent (WEBHOOK_URL=${!!WEBHOOK_URL}, items=${results.length})`);
}

console.log(`Done. Total relevant articles: ${results.length}`);
await Actor.exit();
