import React, { useMemo, useRef, useState } from 'react';
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

/**
 * PRIVATE: narrow file accept attribute based on kind
 */
function acceptFor(kind: AcceptKind): string {
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
   * server POST to /{resources|costs}/bulk, and row-level error display.
   */
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [orgId, setOrgId] = useState<string>(defaultOrgId);
  const [accountId, setAccountId] = useState<string>(defaultAccountId);

  const [parsing, setParsing] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  const [clientValid, setClientValid] = useState<T[]>([]);
  const [clientErrors, setClientErrors] = useState<RowError[]>([]);

  const [serverResult, setServerResult] = useState<BulkUploadResponse | null>(null);
  const [serverErrors, setServerErrors] = useState<RowError[]>([]);
  const [error, setError] = useState<string>('');

  const totalRows = clientValid.length + clientErrors.length;

  const mergedErrors = useMemo(() => mergeRowErrors(clientErrors, serverErrors), [clientErrors, serverErrors]);

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
      setClientErrors(res.invalidRows.map(ir => ({ rowNumber: ir.rowNumber, errors: ir.errors })));
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
      const srvErrors: RowError[] = (res.errors || []).map(e => ({ rowNumber: e.rowNumber, errors: e.errors }));
      setServerErrors(srvErrors);
      if (onUploaded) onUploaded();
    } catch (err: any) {
      setError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const canUpload = orgId.trim().length > 0 && clientValid.length > 0 && !parsing && !uploading;

  const title = kind === 'resources' ? 'Resource upload' : 'Cost upload';
  const helper = kind === 'resources'
    ? 'Upload a CSV/XLSX with resource inventory. Client-side validation will run before sending valid rows to the server.'
    : 'Upload a CSV/XLSX with cost records. Client-side validation will run before sending valid rows to the server.';

  return (
    <section role="region" aria-label={`${title} section`} style={{ marginBottom: 16 }}>
      <h2 style={{ margin: '8px 0' }}>{title}</h2>
      <p className="description">{helper}</p>

      <form className="form" aria-label={`${title} form`} onSubmit={(e) => e.preventDefault()}>
        <label>
          <span>Organization ID</span>
          <input
            type="text"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            required
            aria-required="true"
          />
        </label>
        <label>
          <span>Cloud Account ID (optional)</span>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            aria-describedby="account-help"
          />
          <small id="account-help" className="description">If provided, rows will be associated with this account.</small>
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
            Maximize quality by including headers like resource_id, provider, region, state, etc.
          </small>
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onUpload}
            disabled={!canUpload}
            aria-disabled={!canUpload}
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
              <div>
                Inserted: <strong>{serverResult.inserted}</strong> • Updated: <strong>{serverResult.updated}</strong> • Rejected:{' '}
                <strong>{serverResult.invalid}</strong>
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
              {mergedErrors.map((e, idx) => (
                <li key={`all-${e.rowNumber}-${idx}`}>
                  Row {e.rowNumber}: {e.errors.join('; ')}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </section>
  );
}
