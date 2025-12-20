import React, { useEffect, useMemo, useState } from 'react';
import FilterBar, { FilterField } from '../components/FilterBar';
import DataTable, { Column } from '../components/DataTable';
import { apiClient } from '../lib/api/client';
import type { Recommendation } from '../types/api';

// PUBLIC_INTERFACE
export default function Recommendations(): JSX.Element {
  /**
   * Recommendations page with priority filter. Calls GET /recommendations.
   */
  const [priority, setPriority] = useState<string>('');
  const [rows, setRows] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fields: FilterField[] = useMemo(
    () => [
      {
        name: 'priority',
        label: 'Priority',
        type: 'select',
        options: [
          { label: 'All', value: '' },
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
          { label: 'Critical', value: 'critical' }
        ]
      }
    ],
    []
  );

  const columns: Column<Recommendation>[] = [
    { header: 'Type', accessor: 'recommendation_type' },
    { header: 'Resource', accessor: 'resource_id' },
    {
      header: 'Priority',
      render: (r) => <span className={`pill pill-${r.priority}`}>{r.priority}</span>
    },
    {
      header: 'Potential Monthly Savings',
      render: (r) => formatCurrency(r.potential_savings_monthly)
    },
    { header: 'Description', accessor: 'description' },
    { header: 'Created', render: (r) => new Date(r.created_at).toLocaleString() }
  ];

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError('');
      try {
        const data = await apiClient().recommendations.listPublic(
          { priority: priority || undefined },
          { debugKey: 'recommendations.list' }
        );
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (err: any) {
        // listPublic returns defaults on most failures; keep catch as a last-resort safety net.
        if (!cancelled) setError(err?.message || 'Failed to load recommendations');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [priority]);

  return (
    <section>
      <h1 className="title">Recommendations</h1>
      <p className="description">Optimization opportunities and action items.</p>

      <FilterBar
        fields={fields}
        values={{ priority }}
        onChange={(_, v) => setPriority(v)}
        onReset={() => setPriority('')}
        ariaLabel="Recommendation filters"
      />

      {error && (
        <div role="alert" aria-live="assertive" style={{ color: 'crimson', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p className="description">Loading…</p>
      ) : (
        <DataTable<Recommendation>
          ariaLabel="Recommendations table"
          caption="Optimization recommendations"
          columns={columns}
          data={rows}
          rowKey={(r) => r.id}
          emptyMessage="No recommendations found"
        />
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
