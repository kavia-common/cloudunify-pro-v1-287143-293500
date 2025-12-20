import React, { useEffect, useMemo, useState } from 'react';
import ActivityStream from '../components/ActivityStream';
import { BarChart } from '../components/Chart';
import DataTable, { Column } from '../components/DataTable';
import { apiClient } from '../lib/api/client';
import { useAuth } from '../store/auth';
import type { CostSummary, Recommendation } from '../types/api';

type ResourceCounts = {
  total: number;
  running: number;
  stopped: number;
};

// PUBLIC_INTERFACE
export default function Dashboard(): JSX.Element {
  /**
   * Dashboard (MVP):
   * 1) KPI cards: total resources, running vs stopped, monthly total cost, high/critical recs
   * 2) Cost by Provider chart
   * 3) Cost by Region chart
   * 4) Top Recommendations table (Top 10 by potential_savings_monthly)
   * 5) Real-time Activity Stream via WebSocket (with Pause updates toggle)
   *
   * Data sources:
   * - GET /api/v1/resources
   * - GET /api/v1/costs/summary?period=monthly
   * - GET /api/v1/recommendations
   * - WebSocket GET /api/v1/ws/activity-stream/{organization_id}
   */
  const { organizationId } = useAuth();

  const [counts, setCounts] = useState<ResourceCounts | null>(null);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      try {
        // Resource totals can be fetched without loading all items (use pagination totals).
        const [all, running, stopped, summary, recommendations] = await Promise.all([
          apiClient().resources.list({ page: 1, size: 1 }),
          apiClient().resources.list({ page: 1, size: 1, state: 'running' }),
          apiClient().resources.list({ page: 1, size: 1, state: 'stopped' }),
          apiClient().costs.summary('monthly'),
          apiClient().recommendations.list()
        ]);

        if (cancelled) return;

        setCounts({
          total: Number(all?.total ?? 0),
          running: Number(running?.total ?? 0),
          stopped: Number(stopped?.total ?? 0)
        });

        setCostSummary(summary);
        setRecs(Array.isArray(recommendations) ? recommendations : []);
        setLastUpdated(new Date().toLocaleString());
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load dashboard data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const topRecs = useMemo(() => {
    return [...recs]
      .sort((a, b) => (Number(b.potential_savings_monthly ?? 0) || 0) - (Number(a.potential_savings_monthly ?? 0) || 0))
      .slice(0, 10);
  }, [recs]);

  const highCriticalCount = useMemo(() => {
    const high = recs.filter((r) => r.priority === 'high').length;
    const critical = recs.filter((r) => r.priority === 'critical').length;
    return { high, critical, total: high + critical };
  }, [recs]);

  const recColumns: Column<Recommendation>[] = [
    { header: 'Type', accessor: 'recommendation_type' },
    {
      header: 'Priority',
      render: (r) => <span className={`pill pill-${r.priority}`}>{r.priority}</span>
    },
    {
      header: 'Potential savings (monthly)',
      render: (r) => formatCurrency(Number(r.potential_savings_monthly ?? 0))
    },
    { header: 'Resource', accessor: 'resource_id' },
    { header: 'Description', accessor: 'description' }
  ];

  return (
    <section>
      <h1 className="title">Dashboard</h1>
      <p className="description">At-a-glance KPIs, cost breakdowns, top recommendations, and live activity.</p>

      {error && (
        <div role="alert" aria-live="assertive" style={{ color: 'crimson', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div className="kpi-grid" role="region" aria-label="Key performance indicators">
        <div className="kpi-card" role="group" aria-label="Total resources KPI">
          <div className="kpi-title">Total resources</div>
          <div className="kpi-value">{loading ? '—' : formatInteger(counts?.total ?? 0)}</div>
          <div className="kpi-sub">Across all providers</div>
        </div>

        <div className="kpi-card" role="group" aria-label="Running vs stopped resources KPI">
          <div className="kpi-title">Running vs stopped</div>
          <div className="kpi-value">
            {loading ? '—' : `${formatInteger(counts?.running ?? 0)} / ${formatInteger(counts?.stopped ?? 0)}`}
          </div>
          <div className="kpi-sub">Running / Stopped</div>
        </div>

        <div className="kpi-card" role="group" aria-label="Monthly total cost KPI">
          <div className="kpi-title">Monthly total cost</div>
          <div className="kpi-value">{loading ? '—' : formatCurrency(Number(costSummary?.total_cost ?? 0))}</div>
          <div className="kpi-sub">Period: {costSummary?.period || 'monthly'}</div>
        </div>

        <div className="kpi-card" role="group" aria-label="High and critical recommendations KPI">
          <div className="kpi-title">High/Critical recs</div>
          <div className="kpi-value">{loading ? '—' : formatInteger(highCriticalCount.total)}</div>
          <div className="kpi-sub">
            High: {formatInteger(highCriticalCount.high)} • Critical: {formatInteger(highCriticalCount.critical)}
          </div>
        </div>
      </div>

      <div className="dashboard-meta" aria-live="polite">
        {lastUpdated ? `Last updated: ${lastUpdated}` : loading ? 'Loading dashboard data…' : ''}
      </div>

      <div className="dashboard-grid" role="presentation">
        <section aria-label="Cost breakdown charts">
          <h2 className="section-title">Costs</h2>
          <div className="charts-grid">
            <BarChart
              title="Cost by Provider"
              data={costSummary?.by_provider || {}}
              ariaLabel="Cost by provider chart"
              formatValue={(v) => formatCurrency(v)}
            />
            <BarChart
              title="Cost by Region"
              data={costSummary?.by_region || {}}
              ariaLabel="Cost by region chart"
              maxBars={10}
              formatValue={(v) => formatCurrency(v)}
            />
          </div>
        </section>

        <section aria-label="Top recommendations">
          <h2 className="section-title">Top Recommendations</h2>
          <DataTable<Recommendation>
            ariaLabel="Top recommendations table"
            caption="Top recommendations by potential monthly savings"
            columns={recColumns}
            data={topRecs}
            rowKey={(r) => r.id}
            emptyMessage={loading ? 'Loading…' : 'No recommendations found'}
          />
        </section>

        <section aria-label="Real-time activity stream">
          <ActivityStream title="Real-time activity stream" defaultOrganizationId={organizationId} maxEvents={200} />
        </section>
      </div>
    </section>
  );
}

function formatInteger(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(n);
  }
}

function formatCurrency(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
  } catch {
    return `$${Number(n || 0).toFixed(2)}`;
  }
}
