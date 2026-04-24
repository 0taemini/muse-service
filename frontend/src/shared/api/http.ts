import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { TokenPayload } from '@features/auth/model/auth.types';
import { useAuthStore } from '@features/auth/store/auth-store';
import type { ApiResponse } from '@shared/types/api';

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const AUTH_LOGIN_URL = '/api/v1/auth/login';
const AUTH_LOGOUT_URL = '/api/v1/auth/logout';
const AUTH_REISSUE_URL = '/api/v1/auth/reissue';

let refreshPromise: Promise<string | null> | null = null;

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? '';

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      requestUrl.includes(AUTH_LOGIN_URL) ||
      requestUrl.includes(AUTH_LOGOUT_URL) ||
      requestUrl.includes(AUTH_REISSUE_URL)
    ) {
      if (error.response?.status === 401 && requestUrl.includes(AUTH_REISSUE_URL)) {
        useAuthStore.getState().clearAuth();
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const nextAccessToken = await refreshAccessToken();

    if (!nextAccessToken) {
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
    return http(originalRequest);
  },
);

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = http
      .post<ApiResponse<TokenPayload>>(AUTH_REISSUE_URL)
      .then((response) => {
        const payload = response.data.data;
        useAuthStore.getState().setAuth(payload);
        return payload.accessToken;
      })
      .catch(() => {
        useAuthStore.getState().clearAuth();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
