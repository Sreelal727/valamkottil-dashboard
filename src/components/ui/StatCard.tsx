import type { ReactNode } from 'react';

type Hue = 'marigold' | 'teal' | 'coral' | 'plum' | 'indigo' | 'grass' | 'rose' | 'sky';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'good' | 'warn' | 'bad';
  hue?: Hue;
  accent?: boolean;
  icon?: ReactNode;
}

export function StatCard({ label, value, hint, tone = 'default', hue, accent = false, icon }: StatCardProps) {
  return (
    <div className={`statcard tone-${tone} ${hue ? `hue-${hue}` : ''} ${accent ? 'statcard-accent' : ''}`}>
      <div className="statcard-top">
        <span className="statcard-label">{label}</span>
        {icon && <span className="statcard-icon" aria-hidden>{icon}</span>}
      </div>
      <div className="statcard-value num">{value}</div>
      {hint && <div className="statcard-hint">{hint}</div>}
    </div>
  );
}
