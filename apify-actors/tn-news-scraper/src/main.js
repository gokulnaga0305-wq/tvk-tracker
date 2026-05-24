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
  // Note: HTML_LISTINGS below covers govt press releases (tn.gov.in, chennaipolice.gov.in)
  { name: 'hindu_chennai',         tier: 'established_press', url: 'https://www.thehindu.com/news/cities/chennai/feeder/default.rss' },
  { name: 'hindu_madurai',         tier: 'established_press', url: 'https://www.thehindu.com/news/cities/Madurai/feeder/default.rss' },
  { name: 'hindu_coimbatore',      tier: 'established_press', url: 'https://www.thehindu.com/news/cities/Coimbatore/feeder/default.rss' },
  { name: 'hindu_tiruchirappalli', tier: 'established_press', url: 'https://www.thehindu.com/news/cities/Tiruchirapalli/feeder/default.rss' },
  { name: 'toi_madurai',           tier: 'established_press', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128670595.cms' },
  { name: 'toi_coimbatore',        tier: 'established_press', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128710697.cms' },
  { name: 'toi_trichy',            tier: 'established_press', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128820097.cms' },
  { name: 'ndtv_offbeat',          tier: 'established_press', url: 'https://feeds.feedburner.com/ndtvnews-offbeat' },
  { name: 'newsmobile',            tier: 'online_native',     url: 'https://newsmobile.in/articles/feed/' },

  // ---- Google News active-mention watch ----
  // Each entry below is a Google News RSS search for a TVK-related term.
  // Google indexes the entire press web (Hindu, ToI, NDTV, regional Tamil
  // press, niche outlets, fact-checkers, etc.), so we catch press mentions
  // that our direct-feed list above might miss. The article URLs are
  // Google's redirector — the article handler follows redirects to get
  // the real outlet URL, and our backend's outlet-detection (corroboration
  // module) tags each by its real publisher (Hindu, ToI, etc.) for the
  // 2+ distinct outlets verification gate.
  //
  // Marked 'online_native' just as a default RSS-feed-level tag; the real
  // tier comes from the URL host once the article is fetched.
  { name: 'gnews_tvk_govt',     tier: 'online_native', url: 'https://news.google.com/rss/search?q=%22TVK+government%22+OR+%22TVK+regime%22+Tamil+Nadu&hl=en-IN&gl=IN&ceid=IN:en' },
  { name: 'gnews_cm_vijay',     tier: 'online_native', url: 'https://news.google.com/rss/search?q=%22CM+Vijay%22+OR+%22Chief+Minister+Vijay%22+Tamil+Nadu&hl=en-IN&gl=IN&ceid=IN:en' },
  { name: 'gnews_tvk_party',    tier: 'online_native', url: 'https://news.google.com/rss/search?q=%22Tamilaga+Vettri+Kazhagam%22&hl=en-IN&gl=IN&ceid=IN:en' },
  { name: 'gnews_tvk_credit',   tier: 'online_native', url: 'https://news.google.com/rss/search?q=TVK+%28%22credit+steal%22+OR+%22rebranded%22+OR+%22DMK+scheme%22%29&hl=en-IN&gl=IN&ceid=IN:en' },
  { name: 'gnews_tvk_scandal',  tier: 'online_native', url: 'https://news.google.com/rss/search?q=TVK+%28scam+OR+corruption+OR+arrest+OR+probe+OR+raid%29+Tamil+Nadu&hl=en-IN&gl=IN&ceid=IN:en' },
  { name: 'gnews_tvk_minister', tier: 'online_native', url: 'https://news.google.com/rss/search?q=TVK+minister+Tamil+Nadu&hl=en-IN&gl=IN&ceid=IN:en' },
];

/**
 * Direct HTML listings — government portals that don't expose RSS.
 * Each entry tells the crawler:
 *  - listingUrl: page that lists press releases / orders / news
 *  - linkSelector: CSS selector to find each item's <a>
 *  - dateSelector: optional CSS selector relative to each link's container
 *  - articleSelector: CSS selector for the article body on the detail page
 *
 * Tier is 'primary' (highest credibility) because these are govt sources.
 * The crawler is tolerant of SSL/cert errors (TN govt sites are known flaky).
 */
const HTML_LISTINGS = [
  {
    name: 'tn_gov_press_release',
    tier: 'primary',
    listingUrl: 'https://www.tn.gov.in/press_release.php',
    // The PR table on tn.gov.in: <a href="press_release/pr_XX.pdf">Title</a>
    // For PDFs we record metadata only; backend AI works on title.
    linkSelector: 'a[href*="press_release"], a[href*=".pdf"]',
    dateSelector: 'td:nth-child(2), .date, time',
    articleSelector: 'body',
  },
  {
    // TN State Police citizen portal — news/announcements
    name: 'tn_police_portal',
    tier: 'primary',
    listingUrl: 'https://www.police.tn.gov.in/news',
    linkSelector: 'a.news-link, .news-list a, article a, a[href*="/news/"]',
    dateSelector: '.news-date, .date',
    articleSelector: 'article, .news-content, .post-content',
  },
  // Note: chennaipolice.gov.in DNS does not resolve — re-add if/when it comes back.
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

// Strict incident keywords — title must contain at least one of these.
// Removed generic political terms (cm, minister, mla, cabinet, scheme, etc.)
// because they were letting through pure cabinet/politics news.
const POLITICAL_INCIDENT_KEYWORDS = [
  // Crime / safety (specific events)
  'murder', 'murdered', 'rape', 'raped', 'sexual assault', 'molestation', 'gangrape',
  'arrest', 'arrested', 'fir', 'custodial death', 'lockup death', 'encounter',
  'killed', 'lynching', 'honour killing', 'caste violence', 'dalit attack',
  'kidnap', 'abduct', 'trafficking', 'pocso',
  // Civic failures (concrete impact)
  'power cut', 'blackout', 'power outage', 'water shortage', 'water crisis',
  'sewage overflow', 'flooding', 'inundation', 'pothole accident', 'building collapse',
  'oxygen shortage', 'medicine shortage', 'hospital death', 'medical negligence',
  // Electricity / TANGEDCO specifically
  'tangedco', 'tneb', 'eb tariff', 'electricity tariff', 'transformer failure',
  'voltage fluctuation', 'unannounced outage', 'load shedding', 'feeder fault',
  'eb meter', 'smart meter', 'free electricity', 'electricity subsidy',
  // CAG / audit findings
  'cag report', 'cag audit', 'cag finding', 'cag tamil nadu', 'audit report',
  'audit finding', 'audit irregularity', 'audit observation',
  // NCRB / official data
  'ncrb data', 'ncrb report', 'crime in india', 'cbi probe', 'ed probe',
  // GO (Government Order)
  'g.o.', 'government order', 'g.o. ms',
  // Corruption / vigilance (specific cases)
  'bribe', 'graft', 'kickback', 'embezzlement', 'fraud', 'vigilance arrest',
  'tender scam', 'tender irregularity', 'cbi raid', 'ed raid', 'vigilance raid',
  'fake degree', 'corruption case', 'disproportionate assets',
  // Governance failure (specific decisions/incidents)
  'scheme cancelled', 'scheme paused', 'scheme withdrawn', 'subsidy cut',
  'fare hike', 'tariff hike', 'license revoked', 'permit denied',
  'farmer protest', 'worker protest', 'labour strike',
  'rebrands', 'rebranded', 'renamed', 'relaunched',  // credit-steal signals
  // Press freedom (concrete)
  'journalist arrested', 'journalist raided', 'media raid', 'sedition charge',
  'press freedom', 'media blackout', 'channel banned',
  // Communal / violence
  'communal clash', 'riot', 'mob attack', 'lynched', 'mosque attack', 'church attack',
  // Industrial flight (concrete)
  'factory closure', 'plant shutdown', 'layoff', 'mass termination',
  'company exits', 'investment withdrawn',
  // Propaganda / fake news (concrete)
  'fake news', 'fact check', 'debunked', 'edited video', 'morphed image',
  'ai generated image', 'deepfake', 'altered photo',
];

// Stronger exclusion: titles dominated by these are pure politics
// (we'd waste OpenRouter calls on them), so we exclude when ALL signal
// words in the title are politics-only.
const NOISE_KEYWORDS = [
  'cabinet expansion', 'cabinet portfolio', 'sworn in', 'swearing in',
  'alliance', 'joins party', 'exits party', 'quits party',
  'oath', 'foundation day', 'birth anniversary', 'death anniversary',
  'press meet', 'press conference',
];

const WEBHOOK_URL = process.env.WEBHOOK_URL || '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

function isRelevant(title = '', text = '') {
  const titleLower = title.toLowerCase();
  const combined = (title + ' ' + text).toLowerCase();
  const hasGeo = TN_KEYWORDS.some(kw => combined.includes(kw));

  // Title MUST contain at least one specific incident keyword.
  // We check title (not full text) because article bodies often mention
  // crime/corruption in unrelated tangents.
  const hasIncidentInTitle = POLITICAL_INCIDENT_KEYWORDS.some(kw => titleLower.includes(kw));
  if (!hasGeo || !hasIncidentInTitle) return false;

  // Exclude when the title is dominated by political-noise words AND has
  // no concrete incident signal beyond "rebrand/scheme/protest".
  const noiseHits = NOISE_KEYWORDS.filter(kw => titleLower.includes(kw)).length;
  if (noiseHits >= 1) {
    // Allow only if there's a strong incident keyword like murder/bribe/scam/arrest
    const STRONG = ['murder', 'rape', 'bribe', 'scam', 'arrest', 'fir', 'killed',
                    'raid', 'power cut', 'protest', 'strike', 'closure', 'rebrand',
                    'kickback', 'fraud', 'embezzle', 'corruption case'];
    if (!STRONG.some(kw => titleLower.includes(kw))) return false;
  }
  return true;
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

// Queue HTML listing pages (govt portals — no RSS, must scrape HTML)
for (const html of HTML_LISTINGS) {
  await requestQueue.addRequest({
    url: html.listingUrl,
    userData: {
      type: 'html_listing',
      sourceName: html.name,
      tier: html.tier,
      linkSelector: html.linkSelector,
      dateSelector: html.dateSelector,
      articleSelector: html.articleSelector,
    },
  });
}

const crawler = new CheerioCrawler({
  requestQueue,
  // Budget for RSS + HTML listings + their child articles
  maxRequestsPerCrawl:
    RSS_FEEDS.length
    + HTML_LISTINGS.length
    + (RSS_FEEDS.length + HTML_LISTINGS.length) * maxArticlesPerSource,
  additionalMimeTypes: ['application/rss+xml', 'application/xml', 'text/xml', 'application/atom+xml'],
  // TN govt sites have flaky TLS / self-signed certs — don't abort the crawl on SSL errors.
  ignoreSslErrors: true,
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

      // Google News searches are already topic-restricted by the query;
      // skip the title-keyword pre-filter for those feeds so we don't
      // accidentally drop press hits that don't contain our crime-vocab.
      const skipFilter = sourceName.startsWith('gnews_');

      let queued = 0;
      for (const it of items.slice(0, maxArticlesPerSource)) {
        if (!skipFilter && !isRelevant(it.title, it.description)) continue;
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
      console.log(`[${sourceName}] ${queued} ${skipFilter ? 'gnews' : 'relevant'} articles queued`);

    } else if (type === 'html_listing') {
      // Govt portal listing page — extract press release links and queue them.
      // We DON'T pre-filter govt PRs by incident keyword because the listing
      // titles are often terse (e.g. "Order: 2026-05-22"); the AI processor
      // will decide relevance after fetching the detail page.
      const { linkSelector, dateSelector, articleSelector } = request.userData;
      const baseUrl = new URL(request.url);
      const links = [];

      $(linkSelector).each((_, el) => {
        const $a = $(el);
        const href = ($a.attr('href') || '').trim();
        const title = ($a.text() || '').replace(/\s+/g, ' ').trim();
        if (!href || !title || title.length < 8) return;

        // Resolve relative URLs against the listing page
        let absUrl;
        try { absUrl = new URL(href, baseUrl).toString(); }
        catch { return; }

        // Skip obvious non-articles (image assets, fragment-only links)
        if (/\.(jpg|jpeg|png|gif|svg|css|js|ico)(\?|$)/i.test(absUrl)) return;
        if (absUrl.startsWith('mailto:') || absUrl.startsWith('javascript:')) return;

        // Try to pull a date sibling/parent if a date selector was provided
        let pubDate = '';
        if (dateSelector) {
          pubDate = $a.closest('tr, li, .item, .news-item').find(dateSelector).first().text().trim()
                 || $a.parent().find(dateSelector).first().text().trim();
        }

        links.push({ url: absUrl, title, pubDate });
      });

      // Dedup by URL
      const seen = new Set();
      const uniq = links.filter(l => { if (seen.has(l.url)) return false; seen.add(l.url); return true; });
      console.log(`[${sourceName}] HTML listing has ${uniq.length} candidate links`);

      let queued = 0;
      for (const it of uniq.slice(0, maxArticlesPerSource)) {
        await requestQueue.addRequest({
          url: it.url,
          uniqueKey: it.url,
          userData: {
            type: 'article',
            sourceName,
            tier,
            rssTitle: it.title,
            rssDescription: '',
            rssPubDate: it.pubDate,
            rssImageUrls: [],
            customArticleSelector: articleSelector,
            // Govt sources skip the incident-keyword pre-filter; the
            // backend AI decides. Note the listing already has signal.
            skipRelevanceFilter: true,
          },
        });
        queued++;
      }
      console.log(`[${sourceName}] ${queued} press releases queued`);

    } else if (type === 'article') {
      $('nav, footer, .advertisement, .ad, script, style, .related, aside').remove();

      // Prefer custom selector (from HTML_LISTINGS) if set
      const customSel = request.userData.customArticleSelector;
      const defaultSel = 'article, .article-body, .story-body, [class*="article-body"], main, .post-content';
      const text = $(customSel || defaultSel)
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

      // For Google News results, request.url is the redirector
      // (https://news.google.com/...); request.loadedUrl is the real outlet
      // URL after redirects. Use the real one so outlet detection in the
      // backend tags by actual publisher (Hindu, ToI, etc.), not "google".
      const realUrl = request.loadedUrl || request.url;

      const item = {
        url: realUrl,
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
