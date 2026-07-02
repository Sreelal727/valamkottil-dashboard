import { inr } from '../../lib/format';

export interface BarDatum {
  label: string;
  value: number;
  sub?: string;
  badge?: { text: string; tone?: 'good' | 'warn' | 'bad' };
}

interface BarListProps {
  data: BarDatum[];
  format?: (v: number) => string;
  accent?: string; // css var name
}

// Horizontal bar list — reads like a leaderboard, scales to the max value.
export function BarList({ data, format = (v) => inr(v, { compact: true }), accent = '--marigold' }: BarListProps) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  if (!data.length) return <div className="barlist-empty">Nothing to show.</div>;
  return (
    <ul className="barlist">
      {data.map((d, i) => (
        <li key={d.label + i}>
          <div className="bl-head">
            <span className="bl-label" title={d.label}>{d.label}</span>
            <span className="bl-value num">{format(d.value)}</span>
          </div>
          <div className="bl-track">
            <div
              className="bl-fill"
              style={{ width: `${(Math.abs(d.value) / max) * 100}%`, background: `var(${accent})` }}
            />
          </div>
          {(d.sub || d.badge) && (
            <div className="bl-sub">
              {d.sub && <span>{d.sub}</span>}
              {d.badge && <span className={`bl-badge tone-${d.badge.tone ?? 'good'}`}>{d.badge.text}</span>}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
