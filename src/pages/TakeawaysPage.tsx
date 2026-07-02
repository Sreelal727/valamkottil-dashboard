import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { useDashboard } from '../lib/analytics/useDashboard';

export function TakeawaysPage() {
  const d = useDashboard();

  if (!d.hasAnyData || !d.takeaways.length) {
    return (
      <div className="page">
        <PageHeader eyebrow="Key Takeaways" title="Key Takeaways" />
        <EmptyState icon="✦" title="No insights yet"
          message="Upload your Marg exports and the dashboard will write up what happened today — the hero line, the reorder watch, the slow movers — in plain English."
          cta={{ to: '/upload', label: 'Upload exports' }} />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Key Takeaways" title="What the numbers are telling you"
        lede="Auto-written from today’s exports. No spreadsheets to read — just the decisions worth making." />

      <div className="takeaway-groups">
        {d.takeaways.map((g) => (
          <section key={g.title} className="takeaway-group">
            <div className="tg-head">
              <h2>{g.title}</h2>
              <span className="tg-sub">{g.subtitle}</span>
            </div>
            <div className="tg-items">
              {g.items.map((t, i) => (
                <article key={i} className={`takeaway tone-${t.tone}`}>
                  <span className="tk-icon" aria-hidden>{t.icon}</span>
                  <div>
                    <h3 className="tk-headline">{t.headline}</h3>
                    <p className="tk-detail">{t.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
