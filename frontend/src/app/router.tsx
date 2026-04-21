import { Suspense, lazy, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { OperationsLayoutV2 } from '@shared/components/layout/operations-layout-v2';
import { ProtectedRoute, PublicOnlyRoute } from '@app/route-guards';
import { RouteFallback } from '@app/route-fallback';

const HomeDashboardPageV2 = lazy(() =>
  import('@features/home/pages/home-dashboard-page-v2').then((module) => ({
    default: module.HomeDashboardPageV2,
  })),
);

const LoginPageV2 = lazy(() =>
  import('@features/auth/pages/login-page-v2').then((module) => ({
    default: module.LoginPageV2,
  })),
);

const SignupPageV2 = lazy(() =>
  import('@features/auth/pages/signup-page-v2').then((module) => ({
    default: module.SignupPageV2,
  })),
);

const RecoveryPageV2 = lazy(() =>
  import('@features/auth/pages/recovery-page-v2').then((module) => ({
    default: module.RecoveryPageV2,
  })),
);

const MyPageV2 = lazy(() =>
  import('@features/user/pages/my-page-v2').then((module) => ({
    default: module.MyPageV2,
  })),
);

const PerformanceGridPage = lazy(() =>
  import('@features/performance/pages/performance-grid-page').then((module) => ({
    default: module.PerformanceGridPage,
  })),
);

function withSuspense(page: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{page}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <OperationsLayoutV2 />,
    children: [
      { index: true, element: withSuspense(<HomeDashboardPageV2 />) },
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: 'login', element: withSuspense(<LoginPageV2 />) },
          { path: 'signup', element: withSuspense(<SignupPageV2 />) },
          { path: 'recovery', element: withSuspense(<RecoveryPageV2 />) },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'performances', element: withSuspense(<PerformanceGridPage />) },
          { path: 'performances-lab', element: <Navigate to="/performances" replace /> },
          { path: 'me', element: withSuspense(<MyPageV2 />) },
        ],
      },
    ],
  },
]);
