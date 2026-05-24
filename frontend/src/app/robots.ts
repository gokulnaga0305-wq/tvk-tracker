import type { MetadataRoute } from 'next';

const SITE_URL = 'https://tvk-tracker.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Admin and ingestion endpoints should not be indexed even though
        // they're already auth-walled. Defense in depth.
        disallow: ['/admin', '/api/admin'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
