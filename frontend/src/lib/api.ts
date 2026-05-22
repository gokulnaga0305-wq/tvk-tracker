const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface DashboardStats {
  govt_day: number;
  corruption_count: number;
  murders_count: number;
  sexual_assault_count: number;
  crimes_women_kids_count: number;
  credit_steal_count: number;
  promises_kept: number;
  promises_total: number;
  total_incidents: number;
}

export interface Incident {
  id: string;
  title: string;
  summary: string;
  category: string;
  incident_date: string;
  location: string | null;
  source_urls: string[];
  is_credit_steal: boolean;
  original_credit: string | null;
  severity: number;
  ai_confidence: number;
  status: string;
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
