import { Navigate, Outlet } from 'react-router-dom';
import { RouteFallback } from '@app/route-fallback';
import { useAuthStore } from '@features/auth/store/auth-store';

export function ProtectedRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthResolved = useAuthStore((state) => state.isAuthResolved);
  if (!isAuthResolved) {
    return <RouteFallback />;
  }
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
}

export function PublicOnlyRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthResolved = useAuthStore((state) => state.isAuthResolved);
  if (!isAuthResolved) {
    return <RouteFallback />;
  }
  return accessToken ? <Navigate to="/" replace /> : <Outlet />;
}
