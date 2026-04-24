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
    onSuccess: (response) => {
      setAuth(response.data);
      navigate('/');
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearAuth();
      navigate('/login');
    },
  });
}

export { toApiMessage };
