'use client';
import { ScrollText } from 'lucide-react';
import WhitePaperDebunk from '@/components/WhitePaperDebunk';

export default function WhitePaperPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <ScrollText size={20} className="text-amber-400" />
        <h1 className="text-xl font-bold text-white">TVK White Paper on TN finances — fact-checked</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        The TVK government&rsquo;s 16 Jun 2026 white paper says the DMK left Tamil Nadu in fiscal crisis.
        Here&rsquo;s the honest read — the real concerns conceded, the misleading framing debunked, with sources.
      </p>
      <WhitePaperDebunk />
    </div>
  );
}
