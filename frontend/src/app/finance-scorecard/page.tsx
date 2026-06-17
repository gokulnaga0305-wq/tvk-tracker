'use client';
import { Scale } from 'lucide-react';
import FinanceScorecard from '@/components/FinanceScorecard';

export default function FinanceScorecardPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <Scale size={20} className="text-sky-400" />
        <h1 className="text-xl font-bold text-white">Tamil Nadu finances: 2021 vs 2026 — the honest scorecard</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        How was TN&rsquo;s economy and public finance when DMK took office in 2021, and how did it stand when DMK
        left in 2026? Sector by sector, with the real data — what improved, what stayed stable, and the genuine
        concerns conceded. Built to survive a fact-check.
      </p>
      <FinanceScorecard />
    </div>
  );
}
