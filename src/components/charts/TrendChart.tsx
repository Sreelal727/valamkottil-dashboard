import type { Slice } from '../../lib/analytics/model';
import { inr } from '../../lib/format';

interface TrendChartProps {
  data: Slice[];
  height?: number;
}

// Area+line trend for monthly sales. Pure SVG, responsive via viewBox.
export function TrendChart({ data, height = 220 }: TrendChartProps) {
  if (data.length < 2) return <div className="trend-empty">Upload a ledger summary to see the monthly trend.</div>;

  const W = 720;
  const H = height;
  const padX = 34;
  const padY = 24;
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = (W - padX * 2) / (data.length - 1);
  const x = (i: number) => padX + i * stepX;
  const y = (v: number) => H - padY - (v / max) * (H - padY * 2);

  const linePts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const areaPts = `${x(0)},${H - padY} ${linePts} ${x(data.length - 1)},${H - padY}`;
  const gridVals = [0, 0.5, 1].map((f) => f * max);

  return (
    <svg className="trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Monthly sales trend" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--marigold)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--marigold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridVals.map((gv, i) => (
        <g key={i}>
          <line x1={padX} x2={W - padX} y1={y(gv)} y2={y(gv)} className="trend-grid" />
          <text x={4} y={y(gv) + 4} className="trend-axis num">{inr(gv, { compact: true })}</text>
        </g>
      ))}
      <polygon points={areaPts} fill="url(#trendFill)" />
      <polyline points={linePts} className="trend-line" fill="none" />
      {data.map((d, i) => (
        <g key={d.label}>
          <circle cx={x(i)} cy={y(d.value)} r={3.5} className="trend-dot">
            <title>{`${d.label}: ${inr(d.value)}`}</title>
          </circle>
          {(i === 0 || i === data.length - 1 || data.length <= 8) && (
            <text x={x(i)} y={H - 6} textAnchor="middle" className="trend-xlabel">{d.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}
