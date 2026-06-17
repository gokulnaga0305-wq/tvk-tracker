'use client';
import { HandHeart } from 'lucide-react';
import DravidianModel from '@/components/DravidianModel';
import EducationDeepDive from '@/components/EducationDeepDive';

export default function DravidianModelPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <HandHeart size={20} className="text-orange-400" />
        <h1 className="text-xl font-bold text-white">The Dravidian Model — myth vs data</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Did Dravidian governance &ldquo;ruin&rdquo; Tamil Nadu, or build it? Pick a sector and see TN ranked against other
        states on real outcomes — income, education, health, social justice, women&rsquo;s work and industry. Neutral
        sources only; where another state leads, we say so.
      </p>
      <DravidianModel />
      <EducationDeepDive />
    </div>
  );
}
