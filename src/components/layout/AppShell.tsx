import { NavLink, Outlet } from 'react-router-dom';
import { useDataStore } from '../../lib/store/useDataStore';
import { useDashboard } from '../../lib/analytics/useDashboard';
import { dateLabel } from '../../lib/format';

const NAV = [
  { to: '/', label: 'Business Summary', icon: '◈', end: true },
  { to: '/charts', label: 'Charts', icon: '◗' },
  { to: '/takeaways', label: 'Key Takeaways', icon: '✦' },
  { to: '/payables', label: 'Supplier Payables', icon: '▤' },
  { to: '/products', label: 'Product & Stock', icon: '▦' },
];

export function AppShell() {
  const fileCount = useDataStore((s) => s.files.length);
  const d = useDashboard();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">വ</div>
          <div>
            <p className="brand-name">Valamkottil</p>
            <p className="brand-sub">Sell-Through Intelligence</p>
          </div>
        </div>

        <nav className="nav" aria-label="Main navigation">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon" aria-hidden>{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <NavLink to="/upload" className={({ isActive }) => `nav-item upload-link ${isActive ? 'active' : ''}`}>
            <span className="nav-icon" aria-hidden>⤒</span>
            <span>Upload Marg Exports</span>
          </NavLink>
          <div className="foot-meta">
            <span className="num">{fileCount}</span> file{fileCount === 1 ? '' : 's'} staged
            {d.flagCount > 0 && <span className="foot-flag">{d.flagCount} to fix</span>}
          </div>
        </div>
      </aside>

      <div className="content">
        <div className="topstrip">
          <span className="topstrip-dot" />
          <span>Manual upload overlay for Marg ERP 9+ · single outlet</span>
          <span className="topstrip-date">As on {dateLabel(d.asOfDate)}</span>
        </div>
        <main className="page-scroll">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
