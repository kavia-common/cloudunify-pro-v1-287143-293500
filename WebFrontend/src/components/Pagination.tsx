import React from 'react';

type Props = {
  page: number; // 1-based
  size: number;
  total: number;
  onPageChange: (page: number) => void;
  onSizeChange?: (size: number) => void;
  sizeOptions?: number[];
};

// PUBLIC_INTERFACE
export default function Pagination({
  page,
  size,
  total,
  onPageChange,
  onSizeChange,
  sizeOptions = [10, 20, 50]
}: Props): JSX.Element {
  /** Accessible pagination controls with current page and total pages information. */
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, size)));

  const prev = () => onPageChange(Math.max(1, page - 1));
  const next = () => onPageChange(Math.min(totalPages, page + 1));

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav className="pagination" aria-label="Pagination">
      <div className="pagination-left">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={prev}
          disabled={!canPrev}
          aria-disabled={!canPrev}
          aria-label="Previous page"
        >
          ‹ Prev
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={next}
          disabled={!canNext}
          aria-disabled={!canNext}
          aria-label="Next page"
        >
          Next ›
        </button>
        <span className="pagination-status" aria-live="polite">
          Page {page} of {totalPages} • {total} items
        </span>
      </div>
      {onSizeChange && (
        <div className="pagination-right">
          <label className="pagination-size">
            <span>Rows per page</span>
            <select
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {sizeOptions.map((opt) => (
                <option value={opt} key={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </nav>
  );
}
