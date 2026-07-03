import type { AgeBucket } from '../../lib/analytics/model';
import { dateLabel } from '../../lib/format';

export interface GanttBar {
  startIso: string;
  endIso: string;
  bucket: AgeBucket;
  tooltip: string;
}

export interface GanttRow {
  key: string;
  label: string;
  sub?: string;
  indent?: boolean;
  right?: string;
  bars: GanttBar[];
}

interface GanttChartProps {
  rows: GanttRow[];
  axisStartIso: string;
  axisEndIso: string;
}

const ms = (iso: string) => Date.parse(iso);

// Time-axis Gantt: left column labels, horizontal bars spanning start->end dates.
// All inventory-aging bars end at "today", so longer bars sit older stock further left.
export function GanttChart({ rows, axisStartIso, axisEndIso }: GanttChartProps) {
  const start = ms(axisStartIso);
  const end = ms(axisEndIso);
  const span = Math.max(end - start, 1);
  const pct = (iso: string) => ((ms(iso) - start) / span) * 100;

  // Year gridlines between the axis endpoints.
  const startYear = new Date(axisStartIso).getFullYear();
  const endYear = new Date(axisEndIso).getFullYear();
  const ticks: { year: number; left: number }[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const jan = `${y}-01-01`;
    const left = pct(jan);
    if (left >= 0 && left <= 100) ticks.push({ year: y, left });
  }

  return (
    <div className="gantt">
      <div className="gantt-axis">
        <div className="gantt-axis-label" />
        <div className="gantt-axis-track">
          {ticks.map((t) => (
            <span key={t.year} className="gantt-tick" style={{ left: `${t.left}%` }}>
              {t.year}
            </span>
          ))}
          <span className="gantt-tick gantt-today" style={{ left: '100%' }}>today</span>
        </div>
      </div>

      <div className="gantt-body">
        <div className="gantt-grid-layer" aria-hidden>
          {ticks.map((t) => (
            <span key={`g-${t.year}`} className="gantt-grid" style={{ left: `${t.left}%` }} />
          ))}
        </div>
        {rows.map((row) => (
          <div key={row.key} className={`gantt-row ${row.indent ? 'indent' : ''}`}>
            <div className="gantt-label" title={`${row.label}${row.sub ? ' · ' + row.sub : ''}`}>
              <span className="gl-name">{row.label}</span>
              {row.sub && <span className="gl-sub">{row.sub}</span>}
            </div>
            <div className="gantt-track">
              {row.bars.map((bar, i) => {
                const left = pct(bar.startIso);
                const width = Math.max(pct(bar.endIso) - left, 0.6);
                return (
                  <div
                    key={i}
                    className={`gantt-bar bucket-${bar.bucket}`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={bar.tooltip}
                  >
                    <span className="gantt-bar-cap">{row.right}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="gantt-foot">
        <span className="gantt-range">{dateLabel(axisStartIso)}</span>
        <span className="gantt-range">{dateLabel(axisEndIso)}</span>
      </div>
    </div>
  );
}
