import type { Seasonality } from '../../lib/analytics/model';
import { inr, monthLabel } from '../../lib/format';

interface SeasonHeatmapProps {
  data: Seasonality;
}

// Item × month grid, cells shaded by sales value (relative to the busiest cell).
// The "product on the left, date across the top" layout, heatmap-style.
export function SeasonHeatmap({ data }: SeasonHeatmapProps) {
  const { months, rows, max } = data;
  const shade = (v: number) => {
    if (v <= 0) return { background: 'var(--paper-sunken)' };
    const t = Math.min(v / max, 1);
    // marigold ramp: light wash -> deep, opacity scales with intensity
    return { background: `color-mix(in oklch, var(--marigold-deep) ${Math.round(18 + t * 82)}%, transparent)` };
  };

  return (
    <div className="heatmap-wrap">
      <table className="heatmap">
        <thead>
          <tr>
            <th className="hm-corner">Category</th>
            {months.map((ym) => (
              <th key={ym} className="hm-month">{monthLabel(ym)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={`${row.label}-${ri}`}>
              <th className="hm-label" title={row.label}>{row.label}</th>
              {row.cells.map((v, i) => (
                <td key={i} className="hm-cell" style={shade(v)} title={`${row.label} · ${monthLabel(months[i])}: ${inr(v)}`}>
                  {v > 0 ? <span className="hm-val">{inr(v, { compact: true })}</span> : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
