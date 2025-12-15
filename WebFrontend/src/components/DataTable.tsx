import React from 'react';

export type Column<T> = {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

type Props<T> = {
  ariaLabel: string;
  caption?: string;
  columns: Column<T>[];
  data: T[];
  rowKey?: (row: T, index: number) => string;
  emptyMessage?: string;
};

/**
 * Accessible data table supporting custom renderers and captions.
 * - Provides role and aria attributes for screen reader support
 * - Minimal styling via .table classes in index.css
 */
// PUBLIC_INTERFACE
export default function DataTable<T extends Record<string, any>>({
  ariaLabel,
  caption,
  columns,
  data,
  rowKey,
  emptyMessage = 'No data available'
}: Props<T>): JSX.Element {
  return (
    <div className="table-wrapper" role="region" aria-label={ariaLabel} tabIndex={0}>
      <table className="table">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((c, idx) => (
              <th key={idx} scope="col" className={c.className || ''}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => {
              const key = rowKey ? rowKey(row, i) : String(i);
              return (
                <tr key={key}>
                  {columns.map((c, idx) => {
                    const content =
                      c.render
                        ? c.render(row)
                        : c.accessor
                        ? (row[c.accessor] as React.ReactNode)
                        : null;
                    return (
                      <td key={idx} className={c.className || ''}>
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
