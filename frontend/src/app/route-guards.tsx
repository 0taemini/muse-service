import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@features/auth/store/auth-store';

export function ProtectedRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
}

export function PublicOnlyRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return accessToken ? <Navigate to="/me" replace /> : <Outlet />;
}
