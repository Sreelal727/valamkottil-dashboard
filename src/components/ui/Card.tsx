import type { ReactNode } from 'react';

interface CardProps {
  title?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  note?: ReactNode;
  span?: 1 | 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}

export function Card({ title, eyebrow, action, note, span, className = '', children }: CardProps) {
  return (
    <section className={`card ${className}`} style={span ? { gridColumn: `span ${span}` } : undefined}>
      {(title || eyebrow || action) && (
        <header className="card-head">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h3 className="card-title">{title}</h3>}
          </div>
          {action && <div className="card-action">{action}</div>}
        </header>
      )}
      {children}
      {note && <p className="card-note">{note}</p>}
    </section>
  );
}
