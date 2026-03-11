import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TokenPayload } from '@features/auth/model/auth.types';

interface AuthState {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  userEmail: string;
  setAuth: (payload: TokenPayload, email?: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: '',
      refreshToken: '',
      tokenType: 'Bearer',
      userEmail: '',
      setAuth: (payload, email) =>
        set({
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          tokenType: payload.tokenType,
          userEmail: email ?? '',
        }),
      clearAuth: () =>
        set({
          accessToken: '',
          refreshToken: '',
          tokenType: 'Bearer',
          userEmail: '',
        }),
    }),
    {
      name: 'muse-auth',
    },
  ),
);