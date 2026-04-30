import { Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RouteErrorPage } from '@app/route-error-page';
import { RouteFallback } from '@app/route-fallback';
import { useAuthStore } from '@features/auth/store/auth-store';
import { userApi } from '@features/user/api/user-api';

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

export function AdminRoute() {
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: userApi.getMe,
  });

  if (isLoading) {
    return <RouteFallback />;
  }

  return data?.data.role === 'ADMIN' ? <Outlet /> : <RouteErrorPage kind="forbidden" />;
}
