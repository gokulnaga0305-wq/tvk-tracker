'use client';

import { useState } from 'react';
import { CATEGORY_LABELS } from '@/lib/constants';
import { MessageSquarePlus, Send, CheckCircle, AlertTriangle, Upload } from 'lucide-react';
import clsx from 'clsx';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function CitizenReportPage() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    incident_date: '',
    reporter_name: '',
    reporter_contact: '',
  });
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function addImage() {
    const url = imageUrlInput.trim();
    if (!url) return;
    setImageUrls(arr => [...arr, url]);
    setImageUrlInput('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.title.trim() || !form.description.trim()) {
      setError('Title and description are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = { ...form, image_urls: imageUrls };
      if (!payload.incident_date) delete payload.incident_date;

      const res = await fetch(`${API}/api/citizen-reports/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 429) {
        setError('You\'ve submitted 5 reports in the last hour. Please try again later.');
        return;
      }
      if (!res.ok) {
        const body = await res.text();
        setError(`Submission failed: ${res.status} ${body}`);
        return;
      }
      const data = await res.json();
      setSuccess(`Report submitted (ID: ${data.id.slice(0, 8)}…). It will appear publicly after admin review.`);
      setForm({
        title: '', description: '', category: '', location: '',
        incident_date: '', reporter_name: '', reporter_contact: '',
      });
      setImageUrls([]);
    } catch (e: any) {
      setError(`Network error: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 p-3 sm:p-6 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquarePlus size={22} className="text-orange-400" />
          Citizen Report
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Spotted something — power cut, civic failure, crime, broken promise? Submit it
          here. Every report is reviewed by a human moderator before it goes live.
        </p>
      </div>

      <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg px-4 py-3 mb-6 flex gap-3">
        <AlertTriangle size={16} className="text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <strong className="text-blue-200">What makes a good report:</strong> specifics
          (date, location, what happened), a photo if you have one, and your name if
          you're willing to be credited. We don't share your contact info publicly. False
          or anonymous unverifiable reports are rejected.
        </div>
      </div>

      <form
        onSubmit={submit}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5 flex flex-col gap-4"
      >
        <div>
          <label className="text-xs text-gray-500 uppercase mb-1 block">Title <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={form.title}
            onChange={e => update('title', e.target.value)}
            placeholder="e.g. 4-hour power cut in T. Nagar without notice"
            className="w-full bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500"
            maxLength={200}
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase mb-1 block">Description <span className="text-red-400">*</span></label>
          <textarea
            value={form.description}
            onChange={e => update('description', e.target.value)}
            placeholder="What happened? When? Who was affected? Include any context that helps verification."
            rows={5}
            className="w-full bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500 resize-y"
            maxLength={2000}
          />
          <div className="text-[10px] text-gray-700 text-right mt-1">{form.description.length}/2000</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 uppercase mb-1 block">Category</label>
            <select
              value={form.category}
              onChange={e => update('category', e.target.value)}
              className="w-full bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500"
            >
              <option value="">Select…</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase mb-1 block">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={e => update('location', e.target.value)}
              placeholder="e.g. T. Nagar, Chennai"
              className="w-full bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase mb-1 block">Date of incident</label>
            <input
              type="date"
              value={form.incident_date}
              onChange={e => update('incident_date', e.target.value)}
              className="w-full bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase mb-1 block">Your name (optional)</label>
            <input
              type="text"
              value={form.reporter_name}
              onChange={e => update('reporter_name', e.target.value)}
              placeholder="Anonymous"
              className="w-full bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase mb-1 block">Contact (optional, kept private)</label>
          <input
            type="text"
            value={form.reporter_contact}
            onChange={e => update('reporter_contact', e.target.value)}
            placeholder="email or phone — only visible to moderators"
            className="w-full bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase mb-1 block flex items-center gap-1">
            <Upload size={11} /> Evidence image URLs (optional)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="url"
              value={imageUrlInput}
              onChange={e => setImageUrlInput(e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-[#111] border border-[#333] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addImage())}
            />
            <button
              type="button"
              onClick={addImage}
              className="bg-[#222] hover:bg-[#333] text-gray-300 text-sm px-4 rounded-lg"
            >
              Add
            </button>
          </div>
          {imageUrls.length > 0 && (
            <div className="flex flex-col gap-1">
              {imageUrls.map((u, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-400 bg-[#111] border border-[#222] px-2 py-1 rounded">
                  <span className="truncate flex-1">{u}</span>
                  <button
                    type="button"
                    onClick={() => setImageUrls(arr => arr.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-300 text-[10px]"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-gray-700 mt-1">
            Paste links to images already hosted online (Twitter, Instagram, news sites).
            Direct file upload coming soon.
          </p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800/40 rounded px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded px-3 py-2 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle size={13} /> {success}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={clsx(
            'flex items-center justify-center gap-2 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors',
            submitting
              ? 'bg-orange-900 cursor-not-allowed'
              : 'bg-orange-600 hover:bg-orange-500'
          )}
        >
          <Send size={14} /> {submitting ? 'Submitting…' : 'Submit Report'}
        </button>

        <p className="text-[10px] text-gray-700 text-center">
          By submitting, you confirm this is your own observation and you're not impersonating
          anyone. Rate limit: 5 reports/hour per IP.
        </p>
      </form>
    </div>
  );
}
