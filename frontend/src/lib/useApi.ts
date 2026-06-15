'use client';
/**
 * useApi — the dashboard's standard data-fetching hook.
 *
 * Every page was hand-rolling `useEffect → fetch → useState(loading/error/data)`
 * with inconsistent loading UX (some showed "Loading…", some showed a blank
 * screen until the API resolved). This centralises it with the behaviours a
 * production read-hook needs:
 *
 *   - Prepends NEXT_PUBLIC_API_URL when the path starts with '/'.
 *   - Aborts the in-flight request on unmount / url change — no
 *     "setState on unmounted component" warnings, no race where a slow
 *     earlier response overwrites a faster later one.
 *   - Distinguishes the FIRST load (`loading`, no data yet → show a skeleton)
 *     from a background refresh (`refetching`, keep showing current data).
 *   - A failed refetch does NOT wipe already-good data (stale-while-error).
 *   - Surfaces HTTP failures as a typed `ApiError` carrying the status.
 *   - `url = null` (or `enabled: false`) disables fetching — for data that
 *     depends on auth or a prior selection.
 *
 * Pair with <AsyncBoundary> for the loading / error / empty / success UI.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface UseApiOptions {
  /** Skip fetching while false (lazy/conditional load). Default true. */
  enabled?: boolean;
  /** Extra request headers, e.g. `{ 'x-admin-secret': secret }`. */
  headers?: Record<string, string>;
  /** Re-fetch whenever any value in this array changes (like effect deps). */
  deps?: ReadonlyArray<unknown>;
}

export interface UseApiResult<T> {
  data: T | undefined;
  error: ApiError | undefined;
  /** True only during the first load (no data yet) — render a skeleton. */
  loading: boolean;
  /** True during a background refresh while previous data is still shown. */
  refetching: boolean;
  /** Imperatively re-run the request (e.g. a Retry button). */
  refetch: () => void;
}

export function useApi<T = unknown>(
  url: string | null,
  options: UseApiOptions = {},
): UseApiResult<T> {
  const { enabled = true, headers, deps = [] } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [refetching, setRefetching] = useState(false);
  const [tick, setTick] = useState(0);

  // Refs let the effect read the latest data/headers WITHOUT depending on
  // them (which would cause refetch loops).
  const dataRef = useRef<T | undefined>(undefined);
  const headersRef = useRef<Record<string, string> | undefined>(headers);
  headersRef.current = headers;

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!enabled || !url) return;

    const controller = new AbortController();
    const full = url.startsWith('/') ? `${API_BASE}${url}` : url;

    setError(undefined);
    if (dataRef.current === undefined) setLoading(true);
    else setRefetching(true);

    fetch(full, { cache: 'no-store', signal: controller.signal, headers: headersRef.current })
      .then(async res => {
        if (!res.ok) throw new ApiError(`Request failed (HTTP ${res.status})`, res.status);
        return (await res.json()) as T;
      })
      .then(json => {
        if (controller.signal.aborted) return;
        dataRef.current = json;
        setData(json);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof ApiError ? e : new ApiError((e as Error)?.message || 'Network error'));
        // Note: we deliberately KEEP dataRef/data — a failed refresh shouldn't
        // blank a page that already had good data.
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setRefetching(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled, tick, ...deps]);

  return { data, error, loading, refetching, refetch };
}
