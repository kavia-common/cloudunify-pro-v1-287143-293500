import React from 'react';

export type FilterOption = { label: string; value: string };
export type FilterField =
  | { name: string; label: string; type: 'text'; placeholder?: string }
  | { name: string; label: string; type: 'select'; options: FilterOption[] };

type Props = {
  fields: FilterField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onReset?: () => void;
  ariaLabel?: string;
};

// PUBLIC_INTERFACE
export default function FilterBar({
  fields,
  values,
  onChange,
  onReset,
  ariaLabel = 'Filters'
}: Props): JSX.Element {
  /** Inline filter bar supporting text and select input types. */
  return (
    <form className="filter-bar" aria-label={ariaLabel} onSubmit={(e) => e.preventDefault()}>
      {fields.map((f) => {
        const value = values[f.name] ?? '';
        return (
          <label key={f.name} className="filter-field">
            <span>{f.label}</span>
            {f.type === 'text' ? (
              <input
                type="text"
                value={value}
                placeholder={f.placeholder}
                onChange={(e) => onChange(f.name, e.target.value)}
              />
            ) : (
              <select value={value} onChange={(e) => onChange(f.name, e.target.value)}>
                {f.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </label>
        );
      })}
      {onReset && (
        <button type="button" className="btn btn-secondary" onClick={onReset} aria-label="Clear filters">
          Clear
        </button>
      )}
    </form>
  );
}
