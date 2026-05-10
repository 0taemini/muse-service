import { AxiosError } from 'axios';
import { http } from '@shared/api/http';
import type { ApiResponse } from '@shared/types/api';
import type {
  FindEmailPayload,
  LoginFormValues,
  SignupFormValues,
  TokenPayload,
  VerificationPayload,
  VerifyCodeValues,
  PasswordResetValues,
  SendVerificationValues,
} from '@features/auth/model/auth.types';

const unwrap = async <T>(promise: Promise<{ data: ApiResponse<T> }>) => {
  const response = await promise;
  return response.data;
};

export const authApi = {
  login: (payload: LoginFormValues) =>
    unwrap<TokenPayload>(http.post('/api/v1/auth/login', payload)),
  signup: (payload: SignupFormValues) =>
    unwrap(http.post('/api/v1/auth/signup', payload)),
  sendSignupVerification: (payload: SendVerificationValues) =>
    unwrap(http.post('/api/v1/auth/sms/send-verification', payload)),
  verifySignupCode: (payload: VerifyCodeValues) =>
    unwrap<VerificationPayload>(http.post('/api/v1/auth/sms/verify-code', payload)),
  sendFindEmailVerification: (payload: SendVerificationValues) =>
    unwrap(http.post('/api/v1/auth/account/email/send-verification', payload)),
  findEmail: (payload: VerifyCodeValues) =>
    unwrap<FindEmailPayload>(http.post('/api/v1/auth/account/email/verify-code', payload)),
  sendPasswordResetVerification: (payload: SendVerificationValues) =>
    unwrap(http.post('/api/v1/auth/password/send-verification', payload)),
  verifyPasswordResetCode: (payload: VerifyCodeValues) =>
    unwrap<VerificationPayload>(http.post('/api/v1/auth/password/verify-code', payload)),
  resetPassword: (payload: PasswordResetValues) =>
    unwrap(http.post('/api/v1/auth/password/reset', payload)),
  reissue: () =>
    unwrap<TokenPayload>(http.post('/api/v1/auth/reissue')),
  logout: () =>
    unwrap(http.post('/api/v1/auth/logout')),
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const toApiMessage = (error: unknown) => {
  const axiosError = error as AxiosError<unknown>;
  const payload = axiosError.response?.data;
  if (isRecord(payload) && typeof payload.message === 'string') {
    return payload.message;
  }
  if (axiosError.response?.status === 502) {
    return '서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.';
  }
  return '요청 처리 중 오류가 발생했습니다.';
};
