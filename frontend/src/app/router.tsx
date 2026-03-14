import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { OperationsLayoutV2 } from '@shared/components/layout/operations-layout-v2';
import { HomeDashboardPageV2 } from '@features/home/pages/home-dashboard-page-v2';
import { LoginPageV2 } from '@features/auth/pages/login-page-v2';
import { SignupPageV2 } from '@features/auth/pages/signup-page-v2';
import { RecoveryPageV2 } from '@features/auth/pages/recovery-page-v2';
import { MyPageV2 } from '@features/user/pages/my-page-v2';
import { useAuthStore } from '@features/auth/store/auth-store';
import { AuthLabPageV2 } from '@features/auth/pages/auth-lab-page-v2';
import { PerformanceOperationsPage } from '@features/performance/pages/performance-operations-page';

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
    element: <OperationsLayoutV2 />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: 'login', element: <LoginPageV2 /> },
          { path: 'signup', element: <SignupPageV2 /> },
          { path: 'recovery', element: <RecoveryPageV2 /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { index: true, element: <HomeDashboardPageV2 /> },
          { path: 'performances', element: <PerformanceOperationsPage /> },
          { path: 'performances-lab', element: <Navigate to="/performances" replace /> },
          { path: 'me', element: <MyPageV2 /> },
          { path: 'test', element: <AuthLabPageV2 /> },
        ],
      },
    ],
  },
]);
