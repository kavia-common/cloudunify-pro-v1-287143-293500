import React from 'react';

type BarData = { label: string; value: number };

type BarChartProps = {
  title?: string;
  data: Record<string, number> | BarData[];
  maxBars?: number;
  ariaLabel?: string;
};

// PUBLIC_INTERFACE
export function BarChart({
  title,
  data,
  maxBars = 8,
  ariaLabel = 'Bar chart'
}: BarChartProps): JSX.Element {
  /**
   * Minimal horizontal bar chart for numeric breakdowns.
   * Accepts either a key-value object or an array of {label, value}.
   */
  const entries: BarData[] = Array.isArray(data)
    ? data
    : Object.entries(data || {}).map(([label, value]) => ({ label, value }));

  const sorted = [...entries].sort((a, b) => b.value - a.value).slice(0, maxBars);
  const maxValue = sorted.reduce((m, d) => Math.max(m, d.value), 0) || 1;

  return (
    <section className="chart" aria-label={ariaLabel}>
      {title && <h3 className="chart-title">{title}</h3>}
      <ul className="chart-bars" role="list">
        {sorted.map((d, i) => {
          const pct = Math.max(0, (d.value / maxValue) * 100);
          return (
            <li key={`${d.label}-${i}`} className="chart-row">
              <div className="chart-row-label">
                <span title={d.label}>{d.label}</span>
              </div>
              <div className="chart-row-bar" aria-label={`${d.label}: ${d.value}`}>
                <div className="chart-bar" style={{ width: `${pct}%` }}>
                  <span className="chart-bar-value">{formatNumber(d.value)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function formatNumber(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
  } catch {
    return String(n);
  }
}
