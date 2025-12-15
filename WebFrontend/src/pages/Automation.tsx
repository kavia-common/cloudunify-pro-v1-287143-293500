import React, { useEffect, useState } from 'react';
import DataTable, { Column } from '../components/DataTable';
import { useAuth } from '../store/auth';
import { apiClient } from '../lib/api/client';
import type { AutomationRule, AutomationRuleCreate } from '../types/api';

// PUBLIC_INTERFACE
export default function Automation(): JSX.Element {
  /**
   * Automation page providing:
   * - List of automation rules (GET /automation-rules) for authenticated users
   * - Create rule form (POST /automation-rules) only visible to admin users
   */
  const { roles } = useAuth();
  const isAdmin = roles.includes('admin');

  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string>('');
  const [form, setForm] = useState<AutomationRuleCreate>({
    name: '',
    rule_type: '',
    is_enabled: true,
    match_criteria: {},
    action_type: '',
    cron_schedule: '0 2 * * *'
  });
  const [criteriaText, setCriteriaText] = useState<string>('{}');

  const columns: Column<AutomationRule>[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Type', accessor: 'rule_type' },
    {
      header: 'Enabled',
      render: (r) => <span className={`pill ${r.is_enabled ? 'pill-on' : 'pill-off'}`}>{r.is_enabled ? 'On' : 'Off'}</span>
    },
    { header: 'Action', accessor: 'action_type' },
    { header: 'Schedule', accessor: 'cron_schedule' },
    { header: 'Created', render: (r) => new Date(r.created_at).toLocaleString() }
  ];

  const loadRules = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient().automation.list();
      setRules(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load automation rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadRules();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || creating) return;

    setCreateError('');
    setCreating(true);
    try {
      // Validate criteria JSON
      let parsed: Record<string, unknown> = {};
      if (criteriaText.trim()) {
        parsed = JSON.parse(criteriaText);
      }
      const payload: AutomationRuleCreate = {
        ...form,
        match_criteria: parsed
      };
      await apiClient().automation.create(payload);
      // Reset form and refresh list
      setForm({
        name: '',
        rule_type: '',
        is_enabled: true,
        match_criteria: {},
        action_type: '',
        cron_schedule: '0 2 * * *'
      });
      setCriteriaText('{}');
      await loadRules();
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create rule. Ensure fields and JSON are valid.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <section>
      <h1 className="title">Automation</h1>
      <p className="description">Create and manage automation rules and operations.</p>

      {isAdmin && (
        <form className="form" aria-label="Create automation rule" onSubmit={handleCreate}>
          <h2 style={{ margin: '8px 0' }}>Create rule</h2>
          {createError && (
            <div role="alert" aria-live="assertive" style={{ color: 'crimson' }}>
              {createError}
            </div>
          )}
          <label>
            <span>Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label>
            <span>Rule type</span>
            <input
              type="text"
              value={form.rule_type}
              onChange={(e) => setForm({ ...form, rule_type: e.target.value })}
              placeholder="e.g. schedule_stop"
              required
            />
          </label>
          <label>
            <span>Action type</span>
            <input
              type="text"
              value={form.action_type}
              onChange={(e) => setForm({ ...form, action_type: e.target.value })}
              placeholder="e.g. stop_instances"
              required
            />
          </label>
          <label>
            <span>Cron schedule</span>
            <input
              type="text"
              value={form.cron_schedule}
              onChange={(e) => setForm({ ...form, cron_schedule: e.target.value })}
              placeholder="0 2 * * *"
              required
            />
          </label>
          <label>
            <span>Enabled</span>
            <input
              type="checkbox"
              checked={form.is_enabled}
              onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })}
            />
          </label>
          <label>
            <span>Match criteria (JSON)</span>
            <textarea
              value={criteriaText}
              onChange={(e) => setCriteriaText(e.target.value)}
              rows={4}
              style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }}
              aria-describedby="criteria-help"
            />
            <small id="criteria-help" className="description">
              Provide a JSON object describing resource match criteria.
            </small>
          </label>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'Creating…' : 'Create rule'}
          </button>
        </form>
      )}

      <section style={{ marginTop: 24 }}>
        <h2 style={{ margin: '8px 0' }}>Rules</h2>
        {error && (
          <div role="alert" aria-live="assertive" style={{ color: 'crimson', marginBottom: 12 }}>
            {error}
          </div>
        )}
        {loading ? (
          <p className="description">Loading…</p>
        ) : (
          <DataTable<AutomationRule>
            ariaLabel="Automation rules table"
            caption="Automation rules"
            columns={columns}
            data={rules}
            rowKey={(r) => r.id}
            emptyMessage="No automation rules defined"
          />
        )}
      </section>
    </section>
  );
}
