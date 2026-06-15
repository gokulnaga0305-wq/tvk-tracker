'use client';
import { Wine } from 'lucide-react';
import TasmacTruth from '@/components/TasmacTruth';

export default function TasmacPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <Wine size={20} className="text-red-400" />
        <h1 className="text-xl font-bold text-white">TASMAC — the naked truth about liquor money</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Does Tamil Nadu really &ldquo;run on TASMAC income&rdquo;? We tear the claim apart with sourced
        numbers — the turnover-vs-income trick, liquor&rsquo;s real share of revenue, the ₹10-a-bottle
        issue, and the honest counter-arguments too, so the numbers hold up to scrutiny.
      </p>
      <TasmacTruth />
    </div>
  );
}
