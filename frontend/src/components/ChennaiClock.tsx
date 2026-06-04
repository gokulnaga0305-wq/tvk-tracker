'use client';
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

/**
 * ChennaiClock — live Asia/Kolkata (IST) clock for the dashboard header.
 *
 * Renders nothing on the server / first paint (returns a stable placeholder)
 * to avoid a hydration mismatch — the time only starts ticking after mount.
 * Uses Intl with timeZone:'Asia/Kolkata' so it shows IST regardless of the
 * viewer's actual location.
 */
export default function ChennaiClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    now
      ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...opts }).format(now)
      : '--:--:--';

  const time = fmt({ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const date = fmt({ weekday: 'short', day: '2-digit', month: 'short' });

  return (
    <span
      className="flex items-center gap-1.5 text-xs whitespace-nowrap shrink-0 text-gray-300"
      title="Chennai / India Standard Time (IST)"
      suppressHydrationWarning
    >
      <Clock size={13} className="text-green-400" />
      <span className="font-mono font-semibold tabular-nums text-white">{time}</span>
      <span className="hidden sm:inline text-gray-500">{date} · IST</span>
    </span>
  );
}
