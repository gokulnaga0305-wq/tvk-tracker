'use client';
/**
 * AsyncBoundary — one consistent place to render the loading / error / empty /
 * success states of a useApi() call, so no page hand-rolls them again.
 *
 *   const cars = useApi<Car[]>('/api/cars');
 *   <AsyncBoundary result={cars} label="cars" isEmpty={d => d.length === 0}>
 *     {data => <CarGrid cars={data} />}
 *   </AsyncBoundary>
 *
 * Accessibility:
 *   - Loading  → role="status" aria-busy, with visually-hidden "Loading …" text
 *                so screen readers announce it (the skeleton itself is aria-hidden).
 *   - Error    → role="alert" (announced immediately) + a real <button> Retry.
 *   - Refetch  → aria-busy on the live region while data stays visible.
 *   - prefers-reduced-motion users get no pulse animation (motion-safe:).
 */
import { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Inbox } from 'lucide-react';
import type { UseApiResult } from '@/lib/useApi';

/* ---------- skeleton primitives ---------- */

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`motion-safe:animate-pulse rounded bg-[#262626] ${className}`}
    />
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

function DefaultSkeleton() {
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      <SkeletonText lines={3} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
      </div>
    </div>
  );
}

/* ---------- error / empty states ---------- */

function ErrorState({ label, message, onRetry }: { label: string; message?: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-900/40 bg-red-950/15 p-5 flex flex-col items-center text-center gap-2"
    >
      <AlertTriangle size={20} className="text-red-400" aria-hidden="true" />
      <p className="text-sm text-gray-300">Couldn&rsquo;t load {label}.</p>
      {message && <p className="text-[11px] text-gray-500 max-w-sm break-words">{message}</p>}
      <button
        type="button"
        onClick={onRetry}
        aria-label={`Retry loading ${label}`}
        className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-red-200 bg-red-900/40 hover:bg-red-900/60 px-3 py-1.5 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <RefreshCw size={13} aria-hidden="true" /> Retry
      </button>
    </div>
  );
}

function EmptyState({ label, message }: { label: string; message?: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-8 flex flex-col items-center text-center gap-2">
      <Inbox size={22} className="text-gray-600" aria-hidden="true" />
      <p className="text-sm text-gray-400">{message ?? `No ${label} yet.`}</p>
    </div>
  );
}

/* ---------- the boundary ---------- */

export interface AsyncBoundaryProps<T> {
  /** The value returned by useApi(). */
  result: UseApiResult<T>;
  /** Render-prop — receives the resolved, non-undefined data. */
  children: (data: T) => ReactNode;
  /** Short noun used in a11y + fallback copy ("Loading {label}…", "No {label} yet."). */
  label?: string;
  /** Custom loading UI (defaults to a card skeleton). */
  skeleton?: ReactNode;
  /** Return true when data is present but empty (e.g. `d => d.length === 0`). */
  isEmpty?: (data: T) => boolean;
  /** Custom empty UI. */
  empty?: ReactNode;
}

export function AsyncBoundary<T>({
  result, children, label = 'content', skeleton, isEmpty, empty,
}: AsyncBoundaryProps<T>) {
  const { data, error, loading, refetching, refetch } = result;

  // First load — nothing to show yet.
  if (loading && data === undefined) {
    return (
      <div role="status" aria-busy="true">
        <span className="sr-only">Loading {label}…</span>
        {skeleton ?? <DefaultSkeleton />}
      </div>
    );
  }

  // Hard error with no data to fall back on.
  if (error && data === undefined) {
    return <ErrorState label={label} message={error.message} onRetry={refetch} />;
  }

  // Data present but empty.
  if (data !== undefined && isEmpty?.(data)) {
    return <>{empty ?? <EmptyState label={label} />}</>;
  }

  // Success (a background refetch may be in flight — keep data visible, just
  // mark the region busy for assistive tech).
  if (data !== undefined) {
    return <div aria-busy={refetching || undefined}>{children(data)}</div>;
  }

  // Disabled / no URL yet.
  return null;
}
