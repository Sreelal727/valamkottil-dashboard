import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message: ReactNode;
  cta?: { to: string; label: string };
  compact?: boolean;
}

export function EmptyState({ icon = '📄', title, message, cta, compact }: EmptyStateProps) {
  return (
    <div className={`empty-state ${compact ? 'compact' : ''}`}>
      <div className="empty-icon" aria-hidden>{icon}</div>
      <h3>{title}</h3>
      <p>{message}</p>
      {cta && <Link className="btn btn-primary" to={cta.to}>{cta.label}</Link>}
    </div>
  );
}
