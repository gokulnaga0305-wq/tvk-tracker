'use client';
/**
 * QuickAddForm — admin pastes a news URL → AI fetches + analyzes it → form
 * pre-fills with the extracted structured data → admin reviews/edits → publishes.
 *
 * Backend flow:
 *   POST /api/ingest/quick-analyze {url}   → preview JSON, no DB write
 *   POST /api/incidents/ {...edited fields} → publish as admin_verified
 */
import { useState } from 'react';
import { Sparkles, Link as LinkIcon, Send, AlertCircle, Check } from 'lucide-react';
import { CATEGORY_LABELS } from '@/lib/constants';
import clsx from 'clsx';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const CATEGORIES = Object.keys(CATEGORY_LABELS).sort();

interface FormState {
  title: string;
  summary: string;
  category: string;
  incident_date: string;
  location: string;
  source_urls: string[];
  is_credit_steal: boolean;
  original_credit: string;
  related_dmk_scheme: string;
  severity: number;
  ai_confidence: number;
  tags: string[];
}

const EMPTY: FormState = {
  title: '', summary: '', category: '',
  incident_date: new Date().toISOString().slice(0, 10),
  location: '', source_urls: [], is_credit_steal: false,
  original_credit: '', related_dmk_scheme: '',
  severity: 1, ai_confidence: 0, tags: [],
};

export default function QuickAddForm({ secret }: { secret: string }) {
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState<{ fetched_title: string; fetched_text_preview: string; source_host: string } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [aiReason, setAiReason] = useState('');

  async function analyze() {
    if (!url.trim()) return;
    setAnalyzing(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API}/api/ingest/quick-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || `Error ${res.status}`);
        return;
      }
      if (!data.extracted?.is_relevant) {
        setError(
          'AI determined this article is NOT a trackable incident' +
          (data.extracted?.reason ? ` — "${data.extracted.reason}"` : '') +
          '. You can still edit and publish manually below.'
        );
      }
      const ex = data.extracted || {};
      setPreview({
        fetched_title: data.fetched_title || '',
        fetched_text_preview: data.fetched_text_preview || '',
        source_host: data.source_host || '',
      });
      setForm({
        title: ex.title || data.fetched_title || '',
        summary: ex.summary || '',
        category: ex.category || 'other',
        incident_date: ex.incident_date || EMPTY.incident_date,
        location: ex.location || '',
        source_urls: [url.trim()],
        is_credit_steal: !!ex.is_credit_steal,
        original_credit: ex.original_credit || '',
        related_dmk_scheme: ex.related_dmk_scheme || '',
        severity: ex.severity || 1,
        ai_confidence: ex.confidence || 0,
        tags: ex.tags_extra || [],
      });
      setAiReason(ex.reason || '');
    } catch (e: any) {
      setError(e.message || 'Analyze failed');
    } finally {
      setAnalyzing(false);
    }
  }

  async function publish() {
    if (!form.title.trim() || !form.summary.trim() || !form.category) {
      setError('Title, summary, and category are required');
      return;
    }
    setPublishing(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/incidents/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || `Error ${res.status}`);
        return;
      }
      setSuccess(`Published! ID: ${data.id}`);
      // Reset for next entry
      setUrl('');
      setForm(EMPTY);
      setPreview(null);
      setAiReason('');
    } catch (e: any) {
      setError(e.message || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }

  function up<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  return (
    <div className="space-y-4">
      {/* URL paste + analyze */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
          Paste article URL
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://timesofindia.indiatimes.com/..."
              onKeyDown={e => e.key === 'Enter' && analyze()}
              className="w-full bg-[#111] border border-[#333] text-white text-sm pl-9 pr-3 py-2.5 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
          <button
            onClick={analyze}
            disabled={analyzing || !url.trim()}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            <Sparkles size={15} />
            {analyzing ? 'Analyzing…' : 'Analyze with AI'}
          </button>
        </div>

        {preview && (
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            <div><span className="text-gray-600">Source:</span> {preview.source_host}</div>
            <div className="line-clamp-2"><span className="text-gray-600">Excerpt:</span> {preview.fetched_text_preview}</div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800/60 rounded-lg px-4 py-3 text-red-300 text-sm flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {success && (
        <div className="bg-green-950/40 border border-green-800/60 rounded-lg px-4 py-3 text-green-300 text-sm flex items-start gap-2">
          <Check size={14} className="mt-0.5 shrink-0" /> {success}
        </div>
      )}

      {/* Editable form (always shown after analyze succeeds) */}
      {preview && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Review & Edit</h3>
            {aiReason && (
              <span className="text-[11px] text-gray-500 italic max-w-md text-right">
                AI: {aiReason}
              </span>
            )}
          </div>

          <Field label="Title">
            <input
              type="text"
              value={form.title}
              onChange={e => up('title', e.target.value)}
              className="w-full bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </Field>

          <Field label="Summary (2-3 neutral sentences)">
            <textarea
              value={form.summary}
              onChange={e => up('summary', e.target.value)}
              rows={3}
              className="w-full bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500 resize-y"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Category">
              <select
                value={form.category}
                onChange={e => up('category', e.target.value)}
                className="w-full bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500"
              >
                <option value="">— pick —</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
                ))}
              </select>
            </Field>

            <Field label="Incident date">
              <input
                type="date"
                value={form.incident_date}
                onChange={e => up('incident_date', e.target.value)}
                className="w-full bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </Field>

            <Field label="Location (TN district/city)">
              <input
                type="text"
                value={form.location}
                onChange={e => up('location', e.target.value)}
                placeholder="e.g. Chennai"
                className="w-full bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </Field>

            <Field label="Severity (1-5)">
              <input
                type="number"
                min={1}
                max={5}
                value={form.severity}
                onChange={e => up('severity', Math.min(5, Math.max(1, Number(e.target.value))))}
                className="w-full bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </Field>
          </div>

          <Field label="Source URLs (one per line)">
            <textarea
              value={form.source_urls.join('\n')}
              onChange={e => up('source_urls', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
              rows={2}
              className="w-full bg-[#111] border border-[#333] text-white text-xs font-mono px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500 resize-y"
            />
          </Field>

          {/* Credit-steal section */}
          <div className="bg-[#0d0d0d] border border-[#222] rounded-lg p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_credit_steal}
                onChange={e => up('is_credit_steal', e.target.checked)}
                className="accent-blue-500"
              />
              <span>Mark as Credit Steal (TVK claiming credit for DMK-era work)</span>
            </label>

            {form.is_credit_steal && (
              <div className="space-y-3 pl-6">
                <Field label="Related DMK scheme (name)" small>
                  <input
                    type="text"
                    value={form.related_dmk_scheme}
                    onChange={e => up('related_dmk_scheme', e.target.value)}
                    placeholder="e.g. Kalaignar Magalir Urimai Thittam"
                    className="w-full bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </Field>
                <Field label="What DMK actually did" small>
                  <textarea
                    value={form.original_credit}
                    onChange={e => up('original_credit', e.target.value)}
                    rows={2}
                    placeholder="e.g. DMK launched this in Sep 2021, paid Rs 1000/month to 1.06 crore women"
                    className="w-full bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 resize-y"
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#222]">
            <div className="text-xs text-gray-500">
              AI confidence: {Math.round((form.ai_confidence || 0) * 100)}%
            </div>
            <button
              onClick={publish}
              disabled={publishing}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              <Send size={14} />
              {publishing ? 'Publishing…' : 'Publish as Admin Verified'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  small,
}: {
  label: string;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div>
      <label className={clsx('block uppercase tracking-widest text-gray-500 mb-1.5', small ? 'text-[10px]' : 'text-[11px]')}>
        {label}
      </label>
      {children}
    </div>
  );
}
