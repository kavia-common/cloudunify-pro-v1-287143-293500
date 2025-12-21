import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BulkUploadRequest, BulkUploadResponse } from '../types/api';
import type { ParseResult } from '../lib/mapping';
import { mergeRowErrors, type RowError } from '../lib/mapping/utils';

type AcceptKind = 'resources' | 'costs';

type Props<T extends Record<string, any>> = {
  kind: AcceptKind;
  parseFile: (file: File) => Promise<ParseResult<T>>;
  postBulk: (payload: BulkUploadRequest<T>) => Promise<BulkUploadResponse>;
  defaultOrgId?: string;
  defaultAccountId?: string;
  onUploaded?: () => void;
};

const ORG_KEY = 'cup_org';
const ACCOUNT_KEY = 'cup_account';

/**
 * PRIVATE: narrow file accept attribute based on kind
 */
function acceptFor(_kind: AcceptKind): string {
  // Accept both CSV and Excel formats
  return [
    '.csv',
    '.xlsx',
    '.xls',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ].join(',');
}

/**
 * Attempt to read a value from localStorage, returning undefined on failure/empty.
 */
function readFromLocalStorage(key: string): string | undefined {
  try {
    const v = localStorage.getItem(key);
    if (v && v.trim()) return v.trim();
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * Save a value to localStorage (empty values remove the key), ignoring errors.
 */
function saveToLocalStorage(key: string, value: string): void {
  try {
    if (value && value.trim()) localStorage.setItem(key, value.trim());
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Get the first non-empty query param value from the provided keys.
 */
function getFirstQueryParam(...keys: string[]): string | undefined {
  try {
    const usp = new URLSearchParams(window.location.search);
    for (const k of keys) {
      const v = usp.get(k);
      if (v && v.trim()) return v.trim();
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * Accessible list of row-level errors.
 */
function ErrorList({ title, errors }: { title: string; errors: RowError[] }): JSX.Element | null {
  if (!errors || errors.length === 0) return null;
  return (
    <section aria-label={`${title} details`} role="region" style={{ marginTop: 8 }}>
      <details>
        <summary>{title} ({errors.length})</summary>
        <ul role="list" style={{ marginTop: 6 }}>
          {errors.map((e, idx) => (
            <li key={`${e.rowNumber}-${idx}`}>
              Row {e.rowNumber}: {e.errors.join('; ')}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

// PUBLIC_INTERFACE
export default function BulkUploader<T extends Record<string, any>>({
  kind,
  parseFile,
  postBulk,
  defaultOrgId = 'default-org',
  defaultAccountId = '',
  onUploaded
}: Props<T>): JSX.Element {
  /** 
   * BulkUploader provides a11y-friendly CSV/XLSX upload with client-side validation,
   * server POST to /{resources|costs}/bulk, and row-level error display. It:
   * - Prefills Organization/Account from query (?org / ?organization_id, ?account / ?account_id) or localStorage
   * - Attaches Authorization header via the configured HTTP client
   * - Merges client + server row errors
   * - Notifies parent to refresh data on successful upload (inserted or updated > 0)
   */
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Resolve initial org/account from query -> localStorage -> defaults
  const initialOrg = useMemo(
    () => getFirstQueryParam('org', 'organization_id') ?? readFromLocalStorage(ORG_KEY) ?? defaultOrgId,
    [defaultOrgId]
  );
  const initialAccount = useMemo(
    () => getFirstQueryParam('account', 'account_id') ?? readFromLocalStorage(ACCOUNT_KEY) ?? defaultAccountId,
    [defaultAccountId]
  );

  const [orgId, setOrgId] = useState<string>(initialOrg);
  const [accountId, setAccountId] = useState<string>(initialAccount);

  const [parsing, setParsing] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  const [clientValid, setClientValid] = useState<T[]>([]);
  const [clientErrors, setClientErrors] = useState<RowError[]>([]);

  const [serverResult, setServerResult] = useState<BulkUploadResponse | null>(null);
  const [serverErrors, setServerErrors] = useState<RowError[]>([]);
  const [error, setError] = useState<string>('');

  const totalRows = clientValid.length + clientErrors.length;

  const mergedErrors = useMemo(() => mergeRowErrors(clientErrors, serverErrors), [clientErrors, serverErrors]);

  // Persist org/account for convenience
  useEffect(() => {
    saveToLocalStorage(ORG_KEY, orgId);
  }, [orgId]);
  useEffect(() => {
    saveToLocalStorage(ACCOUNT_KEY, accountId);
  }, [accountId]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setError('');
    setServerResult(null);
    setServerErrors([]);
    if (!f) {
      setFile(null);
      setClientValid([]);
      setClientErrors([]);
      return;
    }
    setFile(f);
    setParsing(true);
    try {
      const res = await parseFile(f);
      setClientValid(res.validRows);
      // Map ParseError to RowError {rowNumber, errors}
      setClientErrors(res.invalidRows.map((ir: any) => ({ rowNumber: ir.rowNumber, errors: ir.errors })));
    } catch (err: any) {
      setError(err?.message || 'Failed to parse file. Ensure it is a valid CSV or Excel file.');
      setClientValid([]);
      setClientErrors([]);
    } finally {
      setParsing(false);
    }
  };

  const onClear = () => {
    setFile(null);
    setClientValid([]);
    setClientErrors([]);
    setServerErrors([]);
    setServerResult(null);
    setError('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const onUpload = async () => {
    if (uploading || parsing) return;
    setError('');
    setServerResult(null);
    setServerErrors([]);
    try {
      setUploading(true);
      const payload: BulkUploadRequest<T> = {
        organization_id: orgId.trim(),
        account_id: accountId.trim() || undefined,
        rows: clientValid
      };
      const res = await postBulk(payload);
      setServerResult(res);

      // Be resilient to server schema variations (rowNumber vs row_number, errors vs messages).
      const srvErrors: RowError[] = (res?.errors || []).map((e: any) => {
        const rnRaw = e?.rowNumber ?? e?.row_number ?? e?.row ?? 0;
        const rn = typeof rnRaw === 'number' ? rnRaw : Number(rnRaw) || 0;
        const msgsRaw = e?.errors ?? e?.messages ?? [];
        const msgs = Array.isArray(msgsRaw) ? msgsRaw : [msgsRaw];
        const cleanMsgs = msgs.map((m) => String(m)).filter(Boolean);
        return { rowNumber: rn, errors: cleanMsgs };
      });
      setServerErrors(srvErrors);

      // Refresh parent views only on success (inserted or updated > 0)
      const inserted = (res as any)?.inserted ?? 0;
      const updated = (res as any)?.updated ?? 0;
      if ((inserted + updated) > 0 && onUploaded) onUploaded();
    } catch (err: any) {
      const msg = String(err?.message || '');
      // Simplify common auth failure message for users
      setError(msg.includes('401') ? 'Not authorized. Please sign in again.' : (msg || 'Upload failed. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const canUpload = orgId.trim().length > 0 && clientValid.length > 0 && !parsing && !uploading;

  const title = kind === 'resources' ? 'Bulk upload — Resources' : 'Bulk upload — Costs';
  const endpointPath = kind === 'resources' ? '/resources/bulk' : '/costs/bulk';
  const helper =
    kind === 'resources'
      ? 'Upload a .csv or .xlsx file with resource inventory. Only valid rows are sent; invalid rows are highlighted below.'
      : 'Upload a .csv or .xlsx file with cost records. Only valid rows are sent; invalid rows are highlighted below.';

  return (
    <section role="region" aria-label={`${title} section`} style={{ marginBottom: 16 }}>
      <h2 style={{ margin: '8px 0' }}>{title}</h2>
      <p className="description">
        {helper} Your Authorization token is attached automatically. Server endpoint: <code title="Upload endpoint">{endpointPath}</code>.
      </p>

      <form className="form" aria-label={`${title} form`} onSubmit={(e) => e.preventDefault()}>
        <label title="Organization scope for the upload">
          <span>Organization ID</span>
          <input
            type="text"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            required
            aria-required="true"
            aria-describedby="org-help"
            placeholder="e.g. org-1234"
          />
          <small id="org-help" className="description">
            Required. We’ll remember your last value on this device. You can also use the URL parameter ?org=ID.
          </small>
        </label>
        <label title="Optional cloud account for scoping">
          <span>Cloud Account ID (optional)</span>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            aria-describedby="account-help"
            placeholder="e.g. 123456789012"
          />
          <small id="account-help" className="description">
            If provided, rows will be associated with this account. URL parameters ?account=ID or ?account_id=ID are also supported.
          </small>
        </label>

        <label>
          <span>Select file (.csv, .xlsx)</span>
          <input
            ref={inputRef}
            type="file"
            accept={acceptFor(kind)}
            onChange={onFileChange}
            aria-describedby="file-help"
            aria-busy={parsing ? 'true' : 'false'}
            disabled={uploading}
          />
          <small id="file-help" className="description">
            Header names are normalized (e.g., Resource ID → resource_id). Include columns like resource_id, provider, region, state, etc.
          </small>
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onUpload}
            disabled={!canUpload}
            aria-disabled={!canUpload}
            title={`POST ${endpointPath}`}
          >
            {uploading ? 'Uploading…' : clientValid.length > 0 ? `Upload ${clientValid.length} valid row(s)` : 'Upload'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClear}
            disabled={parsing || uploading || !file}
            aria-disabled={parsing || uploading || !file}
          >
            Clear
          </button>
          <span aria-live="polite" style={{ alignSelf: 'center' }}>
            {parsing ? 'Parsing file…' : file ? `${file.name}` : 'No file selected'}
          </span>
        </div>
      </form>

      {error && (
        <div role="alert" aria-live="assertive" style={{ color: 'crimson', marginTop: 8 }}>
          {error}
        </div>
      )}

      {(totalRows > 0 || serverResult) && (
        <div className="cost-summary-card" role="region" aria-label="Upload summary">
          <div className="cost-summary-title">Client-side</div>
          <div>
            Total rows: <strong>{totalRows}</strong> • Valid: <strong>{clientValid.length}</strong> • Invalid:{' '}
            <strong>{clientErrors.length}</strong>
          </div>

          {serverResult && (
            <>
              <div className="cost-summary-title" style={{ marginTop: 8 }}>Server response</div>
              <div aria-live="polite">
                Inserted: <strong>{serverResult.inserted ?? 0}</strong> • Updated: <strong>{serverResult.updated ?? 0}</strong> • Rejected:{' '}
                <strong>{serverResult.invalid ?? 0}</strong>
              </div>
              {serverResult.message && (
                <div className="description" aria-live="polite" style={{ marginTop: 4 }}>
                  {serverResult.message}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {clientErrors.length > 0 && <ErrorList title="Client validation errors" errors={clientErrors} />}
      {serverErrors.length > 0 && <ErrorList title="Server validation errors" errors={serverErrors} />}

      {mergedErrors.length > 0 && (
        <section role="region" aria-label="All row errors" style={{ marginTop: 8 }}>
          <details>
            <summary>All row errors ({mergedErrors.length})</summary>
            <ul role="list" style={{ marginTop: 6 }}>
              {mergedErrors.map((e: RowError, idx: number) => (
                <li key={`all-${e.rowNumber}-${idx}`}>
                  Row {e.rowNumber}: {e.errors.join('; ')}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      <p className="description" style={{ marginTop: 8 }}>
        Tip: Authorization header is automatically added from your signed-in session. We merge client and server row errors to help you fix issues quickly.
      </p>
    </section>
  );
}
