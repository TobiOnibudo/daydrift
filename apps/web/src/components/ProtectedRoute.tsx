import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useSession } from '../hooks/useAuth';

import { Skeleton } from './ui/skeleton';

/** Gate for signed-in routes. Remembers where the visitor was headed so sign-in can return there. */
export function ProtectedRoute() {
  const { data: user, isPending } = useSession();
  const location = useLocation();

  if (isPending) {
    return (
      <div className="container space-y-4 py-12" role="status" aria-label="Loading your account">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
