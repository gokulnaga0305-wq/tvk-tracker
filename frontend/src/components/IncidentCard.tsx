import { Incident } from '@/lib/api';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/constants';
import { ExternalLink, MapPin, Copy, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export default function IncidentCard({ incident }: { incident: Incident }) {
  const categoryColor = CATEGORY_COLORS[incident.category] || 'text-gray-400 border-gray-400';
  const severityDots = Array.from({ length: 5 }, (_, i) => i < incident.severity);

  return (
    <div className={clsx(
      'bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#3a3a3a] transition-all',
      incident.is_credit_steal && 'border-l-4 border-l-blue-500'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('text-[11px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider', categoryColor)}>
            {CATEGORY_LABELS[incident.category] || incident.category}
          </span>
          {incident.is_credit_steal && (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border border-blue-500 text-blue-400 uppercase">
              <Copy size={10} /> Credit Steal
            </span>
          )}
        </div>
        <div className="flex gap-0.5 shrink-0">
          {severityDots.map((filled, i) => (
            <div key={i} className={clsx('w-2 h-2 rounded-full', filled ? 'bg-red-500' : 'bg-[#333]')} />
          ))}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-white font-semibold text-sm mb-1.5 leading-snug">{incident.title}</h3>

      {/* Summary */}
      <p className="text-gray-400 text-xs leading-relaxed mb-3">{incident.summary}</p>

      {/* Credit steal context */}
      {incident.is_credit_steal && incident.original_credit && (
        <div className="bg-blue-950/40 border border-blue-800/40 rounded px-3 py-2 mb-3 text-xs text-blue-300">
          <AlertCircle size={11} className="inline mr-1" />
          <span className="font-medium">Original credit: </span>{incident.original_credit}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-gray-600">
        <div className="flex items-center gap-3">
          <span>{new Date(incident.incident_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          {incident.location && (
            <span className="flex items-center gap-1">
              <MapPin size={10} /> {incident.location}
            </span>
          )}
          <span className="text-gray-700">AI conf: {Math.round(incident.ai_confidence * 100)}%</span>
        </div>
        {incident.source_urls[0] && (
          <a href={incident.source_urls[0]} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-gray-500 hover:text-orange-400 transition-colors">
            Source <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  );
}
