import { useEffect } from 'react';
import { authApi } from '@features/auth/api/auth-api';
import { useAuthStore } from '@features/auth/store/auth-store';

let authBootstrapPromise: Promise<void> | null = null;

function bootstrapAuthSession() {
  if (!authBootstrapPromise) {
    authBootstrapPromise = authApi
      .reissue()
      .then((response) => {
        useAuthStore.getState().setAuth(response.data);
      })
      .catch(() => {
        useAuthStore.getState().clearAuth();
      })
      .finally(() => {
        useAuthStore.getState().setAuthResolved(true);
        authBootstrapPromise = null;
      });
  }

  return authBootstrapPromise;
}

export function AuthSessionBootstrap() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthResolved = useAuthStore((state) => state.isAuthResolved);
  const setAuthResolved = useAuthStore((state) => state.setAuthResolved);

  useEffect(() => {
    if (isAuthResolved) {
      return;
    }

    if (accessToken) {
      setAuthResolved(true);
      return;
    }

    void bootstrapAuthSession();
  }, [accessToken, isAuthResolved, setAuthResolved]);

  return null;
}
