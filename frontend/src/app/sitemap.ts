/**
 * Dynamic sitemap — search engines crawl every incident and credit-steal
 * so journalists/citizens googling for evidence find the structured page.
 *
 * Static routes appear first; per-incident URLs are appended from a
 * backend query. Sitemap caches via the upstream fetch's 1h revalidation.
 */
import type { MetadataRoute } from 'next';

const SITE_URL = 'https://tvk-tracker.vercel.app';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface IncidentLite {
  id: string;
  created_at?: string;
  incident_date?: string;
}

async function fetchIncidentIds(): Promise<IncidentLite[]> {
  try {
    // Pull recent verified-and-pending incidents — 200 is plenty for now
    const res = await fetch(`${API}/api/incidents/?limit=200`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL,                  lastModified: now, changeFrequency: 'hourly',  priority: 1.0 },
    { url: `${SITE_URL}/incidents`,   lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${SITE_URL}/credit-steals`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/receipts`,    lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${SITE_URL}/dmk-timeline`, lastModified: now, changeFrequency: 'daily',  priority: 0.7 },
    { url: `${SITE_URL}/promises`,    lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
    { url: `${SITE_URL}/members`,     lastModified: now, changeFrequency: 'weekly',  priority: 0.5 },
    { url: `${SITE_URL}/methodology`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/about`,       lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/report`,      lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const incidents = await fetchIncidentIds();
  const incidentRoutes: MetadataRoute.Sitemap = incidents.map(i => ({
    url: `${SITE_URL}/incidents/${i.id}`,
    lastModified: i.created_at ? new Date(i.created_at) : now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...incidentRoutes];
}
