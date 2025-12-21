import React, { useMemo, useState } from 'react';
import { getAppConfig } from '../lib/appConfig';
import { clearFetchDebugStatuses, isFetchDebugEnabled, useFetchDebugStatuses } from '../lib/api/fetchDebug';

// PUBLIC_INTERFACE
export default function FetchDebugBanner(): JSX.Element | null {
  /**
   * Dev-only diagnostics banner to help quickly identify why widgets/pages show "no data".
   * It surfaces:
   * - Effective API base (after normalization)
   * - Last fetch status per widget (via safeGetJson debugKey)
   *
   * This is intentionally minimal and should be removed once auth/data fetching is stable.
   */
  const enabled = isFetchDebugEnabled();
  const statuses = useFetchDebugStatuses();
  const [expanded, setExpanded] = useState<boolean>(false);

  const apiBase = useMemo(() => {
    const cfg = getAppConfig();
    return cfg.apiBase || '(missing)';
  }, []);

  const summary = useMemo(() => {
    const ok = statuses.filter((s: any) => s.state === 'ok').length;
    const pending = statuses.filter((s: any) => s.state === 'pending').length;
    const error = statuses.filter((s: any) => s.state === 'error').length;
    return { ok, pending, error, total: statuses.length };
  }, [statuses]);

  if (!enabled) return null;

  return (
    <section className="fetch-debug-banner" aria-label="Fetch debug banner">
      <div className="fetch-debug-banner__top">
        <div className="fetch-debug-banner__title">
          <strong>Fetch debug</strong>
          <span className="fetch-debug-banner__meta">
            API base: <code>{apiBase}</code>
          </span>
        </div>

        <div className="fetch-debug-banner__actions">
          <span className="fetch-debug-banner__counts" aria-label="Fetch status counts">
            ok: {summary.ok} • pending: {summary.pending} • error: {summary.error}
          </span>
          <button type="button" className="btn btn-secondary" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Hide' : 'Show'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => clearFetchDebugStatuses()}>
            Clear
          </button>
        </div>
      </div>

      {expanded && (
        <div className="fetch-debug-banner__body" role="region" aria-label="Fetch debug details">
          {statuses.length === 0 ? (
            <div className="fetch-debug-banner__empty">No fetches recorded yet.</div>
          ) : (
            <ul className="fetch-debug-banner__list" role="list">
              {statuses.map((s: any) => (
                <li key={s.key} className={`fetch-debug-banner__item fetch-debug-banner__item--${s.state}`}>
                  <div className="fetch-debug-banner__itemHeader">
                    <code className="fetch-debug-banner__key">{s.key}</code>
                    <span className="fetch-debug-banner__when">{new Date(s.at).toLocaleTimeString()}</span>
                  </div>
                  <div className="fetch-debug-banner__itemMeta">
                    <span>
                      state: <strong>{s.state}</strong>
                      {typeof s.status === 'number' ? ` • http: ${s.status}` : ''}
                      {s.unauthorizedSoft ? ' • unauthorizedSoft' : ''}
                    </span>
                  </div>
                  <div className="fetch-debug-banner__url">
                    <code>{s.url}</code>
                  </div>
                  {s.error && <div className="fetch-debug-banner__error">{s.error}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
