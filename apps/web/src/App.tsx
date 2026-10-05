import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Skeleton } from './components/ui/skeleton';
import { AuthPage } from './routes/AuthPage';
import { LandingPage } from './routes/LandingPage';
import { NotFoundPage } from './routes/NotFoundPage';
import { PlanPage } from './routes/PlanPage';
import { TripsPage } from './routes/TripsPage';

// The map library is large and only needed once a trip is open, so these routes load on demand.
const TripPage = lazy(() => import('./routes/TripPage').then((m) => ({ default: m.TripPage })));
const SharedTripPage = lazy(() =>
  import('./routes/SharedTripPage').then((m) => ({ default: m.SharedTripPage })),
);

const RouteFallback = () => (
  <div className="container space-y-4 py-12" role="status" aria-label="Loading">
    <Skeleton className="h-10 w-1/3" />
    <Skeleton className="h-72 w-full" />
  </div>
);

export function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<LandingPage />} />
          <Route path="auth" element={<AuthPage />} />
          <Route path="s/:token" element={<SharedTripPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="plan" element={<PlanPage />} />
            <Route path="trips" element={<TripsPage />} />
            <Route path="trips/:tripId" element={<TripPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
