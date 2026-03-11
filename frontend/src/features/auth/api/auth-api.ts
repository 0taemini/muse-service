import { AxiosError } from 'axios';
import { http } from '@shared/api/http';
import type { ApiResponse, ErrorResponse } from '@shared/types/api';
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
  reissue: (refreshToken: string) =>
    unwrap<TokenPayload>(http.post('/api/v1/auth/reissue', { refreshToken })),
  logout: (refreshToken: string) =>
    unwrap(http.post('/api/v1/auth/logout', { refreshToken })),
};

export const toApiMessage = (error: unknown) => {
  const axiosError = error as AxiosError<ErrorResponse | ApiResponse<unknown>>;
  const payload = axiosError.response?.data;
  if (payload && 'message' in payload && typeof payload.message === 'string') {
    return payload.message;
  }
  return '요청 처리 중 오류가 발생했습니다.';
};