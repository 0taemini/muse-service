import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi, toApiMessage } from '@features/auth/api/auth-api';
import { useAuthStore } from '@features/auth/store/auth-store';
import type { LoginFormValues } from '@features/auth/model/auth.types';

export function useLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (payload: LoginFormValues) => authApi.login(payload),
    onSuccess: (response, variables) => {
      setAuth(response.data, variables.email);
      navigate('/me');
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation({
    mutationFn: async () => {
      if (!refreshToken) return null;
      return authApi.logout(refreshToken);
    },
    onSettled: () => {
      clearAuth();
      navigate('/login');
    },
  });
}

export { toApiMessage };