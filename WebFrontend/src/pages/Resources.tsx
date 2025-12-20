import React, { useEffect, useMemo, useState } from 'react';
import FilterBar, { FilterField } from '../components/FilterBar';
import DataTable, { Column } from '../components/DataTable';
import Pagination from '../components/Pagination';
import BulkUploader from '../components/BulkUploader';
import { apiClient } from '../lib/api/client';
import { parseResourceFile, type ResourceIngestRow } from '../lib/mapping';
import type { Resource, ResourceListResponse } from '../types/api';

// PUBLIC_INTERFACE
export default function Resources(): JSX.Element {
  /**
   * Resources page with provider/region/state filters and pagination.
   * Calls GET /resources with query parameters and renders a table.
   * Includes bulk upload for resources (CSV/XLSX) with client/server validation feedback.
   */
  const [filters, setFilters] = useState<{ provider: string; region: string; state: string }>({
    provider: '',
    region: '',
    state: ''
  });
  const [page, setPage] = useState<number>(1);
  const [size, setSize] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [rows, setRows] = useState<Resource[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [version, setVersion] = useState<number>(0); // bump to refresh after upload

  const fields: FilterField[] = useMemo(
    () => [
      {
        name: 'provider',
        label: 'Provider',
        type: 'select',
        options: [
          { label: 'All', value: '' },
          { label: 'AWS', value: 'aws' },
          { label: 'Azure', value: 'azure' },
          { label: 'GCP', value: 'gcp' }
        ]
      },
      { name: 'region', label: 'Region', type: 'text', placeholder: 'e.g. us-east-1' },
      {
        name: 'state',
        label: 'State',
        type: 'select',
        options: [
          { label: 'All', value: '' },
          { label: 'Running', value: 'running' },
          { label: 'Stopped', value: 'stopped' },
          { label: 'Terminated', value: 'terminated' }
        ]
      }
    ],
    []
  );

  const columns: Column<Resource>[] = [
    { header: 'Resource ID', accessor: 'resource_id' },
    { header: 'Type', accessor: 'resource_type' },
    { header: 'Provider', accessor: 'provider' },
    { header: 'Region', accessor: 'region' },
    { header: 'State', accessor: 'state' },
    {
      header: 'Monthly Cost',
      render: (r) => formatCurrency(r.cost_monthly)
    },
    {
      header: 'Created',
      render: (r) => new Date(r.created_at).toLocaleString()
    }
  ];

  const onChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };
  const onReset = () => {
    setFilters({ provider: '', region: '', state: '' });
    setPage(1);
  };

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError('');
      try {
        const res: ResourceListResponse = await apiClient().resources.listPublic({
          provider: filters.provider || undefined,
          region: filters.region || undefined,
          state: filters.state || undefined,
          page,
          size
        });

        if (!cancelled) {
          setRows(Array.isArray(res.items) ? res.items : []);
          setTotal(Number(res.total ?? 0));
        }
      } catch (err: any) {
        // listPublic normally returns safe defaults; keep catch as a last-resort safety net.
        if (!cancelled) setError(err?.message || 'Failed to load resources');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [filters.provider, filters.region, filters.state, page, size, version]);

  return (
    <section>
      <h1 className="title">Resources</h1>
      <p className="description">Browse and filter cloud resources across providers.</p>

      <BulkUploader<ResourceIngestRow>
        kind="resources"
        parseFile={parseResourceFile}
        postBulk={(payload) => apiClient().resources.bulkUpload(payload)}
        onUploaded={() => setVersion((v) => v + 1)}
      />

      <FilterBar fields={fields} values={filters} onChange={onChange} onReset={onReset} ariaLabel="Resource filters" />

      {error && (
        <div role="alert" aria-live="assertive" style={{ color: 'crimson', marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <p className="description">Loading…</p>
      ) : (
        <>
          <DataTable<Resource>
            ariaLabel="Resources table"
            caption="Cloud resources"
            columns={columns}
            data={rows}
            rowKey={(r) => r.id}
            emptyMessage="No resources found"
          />
          <Pagination
            page={page}
            size={size}
            total={total}
            onPageChange={setPage}
            onSizeChange={setSize}
          />
        </>
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
