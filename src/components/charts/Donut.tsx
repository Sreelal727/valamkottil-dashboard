import type { Slice } from '../../lib/analytics/model';
import { inr } from '../../lib/format';

interface DonutProps {
  data: Slice[];
  size?: number;
}

const RAMP = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8'];
const OTHER_COLOR = '--c-other';

// The trailing "Other" bucket gets a muted (non-grey) tone; real categories cycle the ramp.
function sliceColor(label: string, index: number): string {
  return label === 'Other' ? OTHER_COLOR : RAMP[index % RAMP.length];
}

export function Donut({ data, size = 220 }: DonutProps) {
  const total = data.reduce((s, d) => s + Math.max(d.value, 0), 0);
  if (total <= 0) return <div className="donut-empty">No sales to chart yet.</div>;

  const r = size / 2;
  const stroke = size * 0.16;
  const radius = r - stroke / 2 - 2;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Sales by category">
        <g transform={`rotate(-90 ${r} ${r})`}>
          {data.map((d, i) => {
            const frac = Math.max(d.value, 0) / total;
            const len = frac * circ;
            const seg = (
              <circle
                key={d.label}
                cx={r} cy={r} r={radius}
                fill="none"
                stroke={`var(${sliceColor(d.label, i)})`}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              >
                <title>{`${d.label}: ${inr(d.value)}`}</title>
              </circle>
            );
            offset += len;
            return seg;
          })}
        </g>
        <text x={r} y={r - 6} textAnchor="middle" className="donut-total num">{inr(total, { compact: true })}</text>
        <text x={r} y={r + 14} textAnchor="middle" className="donut-cap">total sales</text>
      </svg>
      <ul className="donut-legend">
        {data.map((d, i) => (
          <li key={d.label}>
            <span className="dot" style={{ background: `var(${sliceColor(d.label, i)})` }} />
            <span className="lg-label">{d.label}</span>
            <span className="lg-val num">{inr(d.value, { compact: true })}</span>
            <span className="lg-pct num">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
