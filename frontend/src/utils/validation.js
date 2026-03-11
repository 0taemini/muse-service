export const PASSWORD_RULE =
  '비밀번호는 8자 이상 64자 이하이며, 영문과 숫자를 각각 1자 이상 포함하고 공백을 사용할 수 없습니다.';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{2,3}-?\d{3,4}-?\d{4}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)\S{8,64}$/;

export const isValidEmail = (value) => emailRegex.test((value || '').trim());
export const isValidPhone = (value) => phoneRegex.test((value || '').trim());
export const isValidPassword = (value) => passwordRegex.test(value || '');
export const normalizePhone = (value) => (value || '').replace(/[^\d]/g, '');

export const formatPhone = (value) => {
  const digits = normalizePhone(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

export const isPositiveInteger = (value) => /^\d+$/.test(String(value || '').trim()) && Number(value) > 0;