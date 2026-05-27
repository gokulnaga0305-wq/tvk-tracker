const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface DashboardStats {
  govt_day: number;
  // Total (verified + unverified) counts per category
  corruption_count: number;
  murders_count: number;
  sexual_assault_count: number;
  crimes_women_kids_count: number;
  credit_steal_count: number;
  power_cut_count?: number;
  eb_failure_count?: number;
  alcohol_menace_count?: number;
  honour_killing_count?: number;
  police_excess_count?: number;
  broken_promise_count?: number;
  attack_on_press_count?: number;
  fake_news_count?: number;
  custodial_death_count?: number;
  // Verified-only counts (multi-source-verified or admin-verified)
  corruption_verified?: number;
  murders_verified?: number;
  sexual_assault_verified?: number;
  crimes_women_kids_verified?: number;
  credit_steal_verified?: number;
  power_cut_verified?: number;
  eb_failure_verified?: number;
  alcohol_menace_verified?: number;
  honour_killing_verified?: number;
  police_excess_verified?: number;
  broken_promise_verified?: number;
  attack_on_press_verified?: number;
  fake_news_verified?: number;
  custodial_death_verified?: number;
  // Overall totals
  promises_kept: number;
  promises_total: number;
  total_incidents: number;
  verified_incidents?: number;
  unverified_incidents?: number;
  // Granular trust split (used by the trust banner)
  cross_verified_count?: number;     // multi_source or admin
  press_verified_count?: number;     // single press outlet
  community_pending_count?: number;  // Reddit / social only
}

export interface IncidentSource {
  url: string;
  outlet: string;
  credibility_tier: string;
  title?: string;
}

export interface DmkPrecedent {
  match_score: number;
  match_reason: string;
  announcement: {
    id: string;
    title: string;
    content: string | null;
    source: string;
    source_url: string | null;
    announcement_date: string;
    media_urls?: string[];
  };
}

export interface Incident {
  id: string;
  title: string;
  summary: string;
  category: string;
  incident_date: string;
  location: string | null;
  source_urls: string[];
  sources?: IncidentSource[];
  is_credit_steal: boolean;
  original_credit: string | null;
  related_dmk_scheme?: string | null;
  tags?: string[];
  flair?: string | null;
  external_source_type?: string | null;
  upvotes?: number;
  comment_count?: number;
  severity: number;
  ai_confidence: number;
  status: string;
  verification_status?: string;
  source_count?: number;
  image_urls?: string[];
  related_factchecks?: any[];
  dmk_evidence?: DmkPrecedent[];
  retraction_reason?: string | null;
  created_at: string;
  audit_log?: Array<{
    action: string;
    from_value?: string | null;
    to_value?: string | null;
    actor?: string;
    reason?: string | null;
    created_at: string;
  }>;
}

export interface BaselineRow {
  category: string;
  label: string;
  dmk_monthly_avg: number;
  dmk_source: string;
  dmk_period: string;
  tvk_count: number;
  tvk_period_days: number;
  expected_at_dmk_rate: number;
  delta_pct: number | null;
}

export interface CitizenReport {
  id: string;
  title: string;
  description: string;
  category: string | null;
  location: string | null;
  incident_date: string | null;
  image_urls: string[];
  status: string;
  reporter_name: string | null;
  created_at: string;
}

export interface Promise_ {
  id: string;
  text: string;
  category: string;
  made_date: string;
  deadline: string | null;
  status: 'pending' | 'kept' | 'broken' | 'partial';
  evidence_url: string | null;
  notes: string | null;
}

export interface Member {
  id: string;
  name: string;
  role: string;
  constituency: string | null;
  party: string;
  photo_url: string | null;
  wiki_url?: string | null;
  incident_count?: number;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const api = {
  getStats: () => apiFetch<DashboardStats>('/api/stats/dashboard'),
  getIncidents: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<Incident[]>(`/api/incidents/${qs}`);
  },
  getPromises: (status?: string) =>
    apiFetch<Promise_[]>(`/api/promises/${status ? `?status=${status}` : ''}`),
  getMembers: () => apiFetch<Member[]>('/api/members/'),
};
