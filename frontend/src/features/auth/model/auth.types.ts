export interface TokenPayload {
  accessToken: string;
  tokenType: string;
  accessTokenExpiresInMs: number;
  email: string;
}

export interface VerificationPayload {
  verificationToken: string;
}

export interface FindEmailPayload {
  email: string;
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface SendVerificationValues {
  name: string;
  cohort: number;
  phone: string;
}

export interface VerifyCodeValues extends SendVerificationValues {
  code: string;
}

export interface SignupFormValues {
  verificationToken: string;
  email: string;
  password: string;
  confirmPassword: string;
  nickname: string;
}

export interface PasswordResetValues {
  verificationToken: string;
  newPassword: string;
  confirmPassword: string;
}
