/**
 * Server-side layout for /incidents/[id] — generates per-incident OG metadata
 * so links shared on WhatsApp/Twitter/Telegram show proper title, description,
 * and (via the sibling opengraph-image.tsx) a generated preview card.
 *
 * The page.tsx is a client component (interactive — share modal, audit log
 * tab, etc.), so metadata has to live one level up in this layout.
 */
import type { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const SITE_URL = 'https://tvk-tracker.vercel.app';

interface IncidentLite {
  title: string;
  summary: string;
  is_credit_steal?: boolean;
  category: string;
  location?: string | null;
}

async function fetchIncident(id: string): Promise<IncidentLite | null> {
  try {
    const res = await fetch(`${API}/api/incidents/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params;
  const incident = await fetchIncident(id);

  if (!incident) {
    return {
      title: 'Incident · TVK Files',
      description: 'Tamil Nadu Government Accountability Tracker',
    };
  }

  const tag = incident.is_credit_steal ? 'Credit Steal · ' : '';
  const titlePrefix = `${tag}TVK Files`;
  const title = `${titlePrefix} — ${incident.title.slice(0, 60)}`;
  const description = incident.summary.slice(0, 200);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/incidents/${id}`,
      siteName: 'TVK Files',
      // images intentionally omitted — Next.js will auto-attach the
      // generated opengraph-image.tsx output here.
      locale: 'en_IN',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/incidents/${id}`,
    },
  };
}

export default function IncidentDetailLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
