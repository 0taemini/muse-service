import { create } from 'zustand';
import { TokenPayload } from '@features/auth/model/auth.types';

interface AuthState {
  accessToken: string;
  tokenType: string;
  userEmail: string;
  isAuthResolved: boolean;
  setAuth: (payload: TokenPayload) => void;
  clearAuth: () => void;
  setAuthResolved: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: '',
  tokenType: 'Bearer',
  userEmail: '',
  isAuthResolved: false,
  setAuth: (payload) =>
    set({
      accessToken: payload.accessToken,
      tokenType: payload.tokenType,
      userEmail: payload.email,
      isAuthResolved: true,
    }),
  clearAuth: () =>
    set({
      accessToken: '',
      tokenType: 'Bearer',
      userEmail: '',
      isAuthResolved: true,
    }),
  setAuthResolved: (value) =>
    set({
      isAuthResolved: value,
    }),
}));
