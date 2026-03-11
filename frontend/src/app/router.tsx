import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AppLayout } from '@shared/components/layout/app-layout';
import { HomePage } from '@features/home/pages/home-page';
import { LoginPage } from '@features/auth/pages/login-page';
import { SignupPage } from '@features/auth/pages/signup-page';
import { RecoveryPage } from '@features/auth/pages/recovery-page';
import { MyPage } from '@features/user/pages/my-page';
import { useAuthStore } from '@features/auth/store/auth-store';
import { AuthLabPage } from '@features/auth/pages/auth-lab-page';

function ProtectedRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicOnlyRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return accessToken ? <Navigate to="/me" replace /> : <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'signup', element: <SignupPage /> },
          { path: 'recovery', element: <RecoveryPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'me', element: <MyPage /> },
          { path: 'test', element: <AuthLabPage /> },
        ],
      },
    ],
  },
]);
