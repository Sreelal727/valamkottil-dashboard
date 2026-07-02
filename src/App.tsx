import { useEffect } from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { SummaryPage } from './pages/SummaryPage';
import { ChartsPage } from './pages/ChartsPage';
import { TakeawaysPage } from './pages/TakeawaysPage';
import { PayablesPage } from './pages/PayablesPage';
import { ProductsPage } from './pages/ProductsPage';
import { UploadPage } from './pages/UploadPage';
import { useDataStore } from './lib/store/useDataStore';

const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <SummaryPage /> },
      { path: 'charts', element: <ChartsPage /> },
      { path: 'takeaways', element: <TakeawaysPage /> },
      { path: 'payables', element: <PayablesPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'upload', element: <UploadPage /> },
    ],
  },
]);

export function App() {
  const hydrate = useDataStore((s) => s.hydrate);
  const hydrated = useDataStore((s) => s.hydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="boot">
        <div className="boot-mark">വ</div>
        <p>Loading your data…</p>
      </div>
    );
  }
  return <RouterProvider router={router} />;
}
