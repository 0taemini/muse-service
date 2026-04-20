import { useMemo, useState } from 'react';
import { apiRequest } from '../services/api';
import {
  PASSWORD_RULE,
  formatPhone,
  isPositiveInteger,
  isValidEmail,
  isValidPassword,
  isValidPhone,
} from '../utils/validation';

const SESSION_KEY = 'muse-auth-session';
const API_BASE_KEY = 'muse-api-base-url';

const readStoredSession = () => {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw
      ? JSON.parse(raw)
      : { accessToken: '', refreshToken: '', tokenType: 'Bearer', userEmail: '' };
  } catch (error) {
    return { accessToken: '', refreshToken: '', tokenType: 'Bearer', userEmail: '' };
  }
};

const readStoredBaseUrl = () => window.localStorage.getItem(API_BASE_KEY) || '';

const initialVerificationForm = { name: '', cohort: '', phone: '' };
const initialCodeForm = { name: '', cohort: '', phone: '', code: '' };

function AuthWorkspace() {
  const [apiBaseUrl, setApiBaseUrl] = useState(readStoredBaseUrl);
  const [activeTab, setActiveTab] = useState('login');
  const [session, setSession] = useState(readStoredSession);
  const [alert, setAlert] = useState({
    tone: 'neutral',
    title: '준비 완료',
    description: '회원가입, 로그인, 계정 복구, 마이페이지까지 한 화면에서 확인할 수 있습니다.',
  });
  const [responseLog, setResponseLog] = useState(null);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupVerification, setSignupVerification] = useState(initialVerificationForm);
  const [signupCodeForm, setSignupCodeForm] = useState(initialCodeForm);
  const [signupForm, setSignupForm] = useState({
    verificationToken: '',
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
  });

  const [emailRecoveryVerification, setEmailRecoveryVerification] = useState(initialVerificationForm);
  const [emailRecoveryCodeForm, setEmailRecoveryCodeForm] = useState(initialCodeForm);
  const [foundEmail, setFoundEmail] = useState('');

  const [passwordRecoveryVerification, setPasswordRecoveryVerification] = useState(initialVerificationForm);
  const [passwordRecoveryCodeForm, setPasswordRecoveryCodeForm] = useState(initialCodeForm);
  const [passwordResetForm, setPasswordResetForm] = useState({
    verificationToken: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    email: '',
    cohort: '',
    currentPassword: '',
    password: '',
  });

  const isLoggedIn = Boolean(session.accessToken);

  const persistSession = (nextSession) => {
    setSession(nextSession);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
  };

  const persistBaseUrl = (value) => {
    setApiBaseUrl(value);
    window.localStorage.setItem(API_BASE_KEY, value);
  };

  const clearSession = () => {
    const nextSession = { accessToken: '', refreshToken: '', tokenType: 'Bearer', userEmail: '' };
    persistSession(nextSession);
    setProfile(null);
  };

  const applyFeedback = (tone, title, description, payload) => {
    setAlert({ tone, title, description });
    setResponseLog(payload || null);
  };

  const handleApiError = (title, error) => {
    const backendMessage =
      error?.payload?.message ||
      error?.payload?.payload?.message ||
      error?.message ||
      '알 수 없는 오류가 발생했습니다.';

    applyFeedback('error', title, backendMessage, {
      status: error?.status || null,
      payload: error?.payload || null,
    });
  };

  const request = async (path, options = {}) =>
    apiRequest({
      baseUrl: apiBaseUrl,
      path,
      accessToken: session.accessToken,
      ...options,
    });

  const saveTokens = (data, emailFallback = '') => {
    persistSession({
      accessToken: data?.accessToken || '',
      refreshToken: data?.refreshToken || '',
      tokenType: data?.tokenType || 'Bearer',
      userEmail: emailFallback,
    });
  };

  const verificationErrors = (form) => {
    const errors = [];
    if (!form.name.trim()) errors.push('이름을 입력해주세요.');
    if (!isPositiveInteger(form.cohort)) errors.push('기수는 1 이상의 숫자여야 합니다.');
    if (!isValidPhone(form.phone)) errors.push('전화번호 형식이 올바르지 않습니다.');
    return errors;
  };

  const loginErrors = useMemo(() => {
    const errors = [];
    if (!isValidEmail(loginForm.email)) errors.push('이메일 형식을 확인해주세요.');
    if (!loginForm.password) errors.push('비밀번호를 입력해주세요.');
    return errors;
  }, [loginForm]);

  const signupErrors = useMemo(() => {
    const errors = [];
    if (!signupForm.verificationToken.trim()) errors.push('인증 토큰이 필요합니다.');
    if (!isValidEmail(signupForm.email)) errors.push('이메일 형식을 확인해주세요.');
    if (!isValidPassword(signupForm.password)) errors.push(PASSWORD_RULE);
    if (signupForm.password !== signupForm.confirmPassword) errors.push('비밀번호 확인이 일치하지 않습니다.');
    if (!signupForm.nickname.trim()) errors.push('닉네임을 입력해주세요.');
    return errors;
  }, [signupForm]);

  const passwordResetErrors = useMemo(() => {
    const errors = [];
    if (!passwordResetForm.verificationToken.trim()) errors.push('인증 토큰이 필요합니다.');
    if (!isValidPassword(passwordResetForm.newPassword)) errors.push(PASSWORD_RULE);
    if (passwordResetForm.newPassword !== passwordResetForm.confirmPassword) {
      errors.push('비밀번호 확인이 일치하지 않습니다.');
    }
    return errors;
  }, [passwordResetForm]);

  const profileErrors = useMemo(() => {
    const errors = [];
    if (profileForm.email && !isValidEmail(profileForm.email)) {
      errors.push('이메일 형식을 확인해주세요.');
    }
    if (profileForm.cohort && !isPositiveInteger(profileForm.cohort)) {
      errors.push('기수는 1 이상의 숫자여야 합니다.');
    }
    if (profileForm.password) {
      if (!profileForm.currentPassword.trim()) {
        errors.push('비밀번호 변경 시 현재 비밀번호가 필요합니다.');
      }
      if (!isValidPassword(profileForm.password)) {
        errors.push(PASSWORD_RULE);
      }
    }
    return errors;
  }, [profileForm]);