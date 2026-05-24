/**
 * Server-generated OG image for an incident.
 *
 * When anyone shares a link like `tvkfiles.vercel.app/incidents/abc123` on
 * WhatsApp / Twitter / Telegram, the platform fetches this endpoint to
 * render a 1200×630 preview card.
 *
 * For credit-steal incidents we render the receipts card (TVK lie above,
 * DMK record below). For others, the standard incident card.
 *
 * Implementation notes:
 *   - next/og's ImageResponse uses Satori → limited CSS (no `display: grid`,
 *     no flex 'gap', no transforms). Every layout uses flex direction + width.
 *   - All text colors / borders / padding must be inline style objects.
 *   - Fonts: we let Satori fall back to system fonts for Tamil. For English
 *     it uses sans-serif by default.
 */
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'TVK Files — incident card';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type RouteParams = { params: Promise<{ id: string }> };

interface IncidentLite {
  id: string;
  title: string;
  summary: string;
  category: string;
  incident_date: string;
  location?: string | null;
  is_credit_steal?: boolean;
  original_credit?: string | null;
  related_dmk_scheme?: string | null;
  verification_status?: string;
  source_count?: number;
  source_urls?: string[];
  dmk_evidence?: Array<{
    match_score: number;
    announcement: { title: string; source: string; announcement_date: string };
  }>;
}

const SOURCE_LABEL: Record<string, string> = {
  dmk_website:    'dmk.in',
  cmo_tamil_nadu: '@CMOTamilnadu',
  tn_dipr:        '@TNDIPRNEWS',
  manual:         'DMK Records',
};

async function fetchIncident(id: string): Promise<IncidentLite | null> {
  try {
    const res = await fetch(`${API}/api/incidents/${id}`, {
      // 1h cache — OG images don't need to be live; reduces backend load
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function Image({ params }: RouteParams) {
  const { id } = await params;
  const incident = await fetchIncident(id);

  if (!incident) {
    // Generic fallback when the API is unreachable / incident gone
    return new ImageResponse(
      (
        <div style={{
          display: 'flex', flexDirection: 'column',
          width: '100%', height: '100%',
          background: '#0d0d0d',
          color: '#fff',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}>
          <div style={{ fontSize: 70, fontWeight: 900 }}>TVK Files</div>
          <div style={{ fontSize: 30, color: '#888', marginTop: 20 }}>
            Tamil Nadu Government Accountability Tracker
          </div>
        </div>
      ),
      { ...size }
    );
  }

  const isCreditSteal = !!incident.is_credit_steal;
  const evidence = incident.dmk_evidence?.[0];
  const tvkDate = new Date(incident.incident_date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const dmkDate = evidence
    ? new Date(evidence.announcement.announcement_date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'DMK era (2021–2026)';
  const dmkSource = evidence?.announcement.source
    ? SOURCE_LABEL[evidence.announcement.source] || evidence.announcement.source
    : null;

  // ============ CREDIT-STEAL counter card (1200×630, 2-panel) ============
  if (isCreditSteal) {
    return new ImageResponse(
      (
        <div style={{
          display: 'flex', flexDirection: 'column',
          width: '100%', height: '100%',
          background: '#0d0d0d',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}>
          {/* Top warning strip */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: 50,
            background: '#facc15',
            color: '#000',
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}>
            ⚠ CREDIT STEAL — VERIFIED AGAINST DMK ARCHIVE
          </div>

          {/* Two-panel body */}
          <div style={{
            display: 'flex', flexDirection: 'row',
            width: '100%', flex: 1,
          }}>
            {/* LEFT: TVK Claim */}
            <div style={{
              display: 'flex', flexDirection: 'column',
              width: '50%', height: '100%',
              padding: '32px 36px',
              background: 'linear-gradient(135deg, #2a0a0a 0%, #1a0506 100%)',
              borderRight: '4px solid #facc15',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                color: '#f87171',
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 14,
              }}>
                ● TVK CLAIM · {tvkDate}
              </div>
              <div style={{
                color: '#fff',
                fontSize: 34,
                fontWeight: 900,
                lineHeight: 1.15,
                marginBottom: 14,
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {incident.title}
              </div>
              <div style={{
                color: '#fecaca',
                fontSize: 18,
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {incident.summary}
              </div>
            </div>

            {/* RIGHT: DMK Receipt */}
            <div style={{
              display: 'flex', flexDirection: 'column',
              width: '50%', height: '100%',
              padding: '32px 36px',
              background: 'linear-gradient(135deg, #0a0e1e 0%, #1a1530 100%)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                color: '#fde047',
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 14,
              }}>
                ☀ DMK GOVERNMENT RECORD
              </div>
              <div style={{
                color: '#fef9c3',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 10,
              }}>
                Originally Launched: {dmkDate}
              </div>
              <div style={{
                color: '#fef9c3',
                fontSize: 26,
                fontWeight: 900,
                lineHeight: 1.15,
                marginBottom: 12,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {incident.related_dmk_scheme || evidence?.announcement.title.slice(0, 80) || 'DMK-era scheme'}
              </div>
              {incident.original_credit && (
                <div style={{
                  color: '#dbeafe',
                  fontSize: 15,
                  lineHeight: 1.4,
                  fontStyle: 'italic',
                  marginBottom: 12,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  "{incident.original_credit}"
                </div>
              )}
              {evidence && (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  borderLeft: '4px solid #eab308',
                  background: 'rgba(0,0,0,0.4)',
                  padding: '10px 14px',
                  borderRadius: '0 6px 6px 0',
                }}>
                  <div style={{
                    color: '#fde047',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}>
                    Receipt:
                  </div>
                  <div style={{
                    color: '#fff',
                    fontSize: 15,
                    lineHeight: 1.3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {evidence.announcement.title.slice(0, 110)}
                  </div>
                  {dmkSource && (
                    <div style={{ color: '#facc15', fontSize: 12, marginTop: 6 }}>
                      Source: {dmkSource} · {Math.round((evidence.match_score || 0) * 100)}% match
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom strip */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', height: 60,
            background: '#000',
            borderTop: '2px solid #facc15',
            padding: '0 36px',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: '#fff', fontSize: 19, fontWeight: 900 }}>
                Don't be fooled.
              </div>
              <div style={{ color: '#fde047', fontSize: 13 }}>
                This was DMK government's work.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>#TVKFiles</div>
              <div style={{ color: '#9ca3af', fontSize: 11 }}>tvkfiles.vercel.app</div>
            </div>
          </div>
        </div>
      ),
      { ...size }
    );
  }

  // ============ STANDARD incident card (1200×630, single panel) ============
  const sourceCount = incident.source_count || incident.source_urls?.length || 1;
  const verifStr = incident.verification_status === 'multi_source_verified'
    ? `VERIFIED · ${sourceCount} SOURCES`
    : incident.verification_status === 'admin_verified'
    ? 'ADMIN VERIFIED'
    : 'PENDING VERIFICATION';
  const verifColor = incident.verification_status === 'multi_source_verified' ? '#10b981'
    : incident.verification_status === 'admin_verified' ? '#34d399'
    : '#facc15';

  return new ImageResponse(
    (
      <div style={{
        display: 'flex', flexDirection: 'column',
        width: '100%', height: '100%',
        background: '#0d0d0d',
        color: '#fff',
        fontFamily: 'sans-serif',
      }}>
        {/* Top brand strip */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '24px 48px',
          borderBottom: '2px solid #1f2937',
        }}>
          <div style={{ color: '#fff', fontSize: 36, fontWeight: 900 }}>TVK Files</div>
          <div style={{
            color: verifColor,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>
            ✓ {verifStr}
          </div>
        </div>

        {/* Body */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          flex: 1, padding: '32px 48px',
        }}>
          <div style={{
            color: '#fb923c',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            {incident.category.replace(/_/g, ' ')} · {tvkDate}{incident.location ? ' · ' + incident.location : ''}
          </div>
          <div style={{
            color: '#fff',
            fontSize: 42,
            fontWeight: 900,
            lineHeight: 1.15,
            marginBottom: 20,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {incident.title}
          </div>
          <div style={{
            color: '#d1d5db',
            fontSize: 22,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {incident.summary}
          </div>
        </div>

        {/* Bottom strip */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '20px 48px',
          background: '#000',
          borderTop: '2px solid #ea580c',
        }}>
          <div style={{ color: '#fff', fontSize: 14 }}>#TVKFiles</div>
          <div style={{ color: '#9ca3af', fontSize: 14 }}>tvkfiles.vercel.app</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
