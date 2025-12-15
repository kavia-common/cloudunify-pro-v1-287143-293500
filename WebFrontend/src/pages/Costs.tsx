import React, { useEffect, useMemo, useState } from 'react';
import { BarChart } from '../components/Chart';
import { apiClient } from '../lib/api/client';
import type { CostSummary } from '../types/api';

// PUBLIC_INTERFACE
export default function Costs(): JSX.Element {
  /**
   * Costs page showing total cost and breakdowns by provider and region.
   * Calls GET /costs/summary with a period query (default: monthly).
   */
  const [period, setPeriod] = useState<string>('monthly');
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const periodOptions = useMemo(
    () => [
      { label: 'Daily', value: 'daily' },
      { label: 'Monthly', value: 'monthly' }
    ],
    []
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError('');
      try {
        const data = await apiClient().costs.summary(period);
        if (!cancelled) setSummary(data);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load cost summary');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const total = summary?.total_cost ?? 0;

  return (
    <section>
      <h1 className="title">Costs</h1>
      <p className="description">Explore cost summary, breakdowns, and trends.</p>

      <form className="filter-bar" aria-label="Cost period selector" onSubmit={(e) => e.preventDefault()}>
        <label className="filter-field">
          <span>Period</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Select period">
            {periodOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </form>

      {error && (
        <div role="alert" aria-live="assertive" style={{ color: 'crimson', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p className="description">Loading…</p>
      ) : summary ? (
        <>
          <div className="cost-summary-card" role="region" aria-label="Total cost">
            <div className="cost-summary-title">Total ({summary.period})</div>
            <div className="cost-summary-value">{formatCurrency(total)}</div>
          </div>
          <div className="charts-grid">
            <BarChart title="By Provider" data={summary.by_provider} ariaLabel="Cost by provider" />
            <BarChart title="By Region" data={summary.by_region} ariaLabel="Cost by region" />
          </div>
        </>
      ) : (
        <p className="description">No cost data available.</p>
      )}
    </section>
  );
}

function formatCurrency(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}
