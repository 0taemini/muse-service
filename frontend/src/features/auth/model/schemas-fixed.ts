import { z } from 'zod';

const phoneRegex = /^\d{2,3}-?\d{3,4}-?\d{4}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)\S{8,64}$/;

export const passwordRuleMessage =
  '비밀번호는 8자 이상 64자 이하이며, 영문과 숫자를 각각 1자 이상 포함하고 공백을 사용할 수 없습니다.';

export const loginSchemaFixed = z.object({
  email: z.string().trim().email('이메일 형식을 확인해 주세요.'),
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
});

export const verificationSchemaFixed = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요.'),
  cohort: z.coerce.number().int().positive('기수는 1 이상의 숫자여야 합니다.'),
  phone: z.string().trim().regex(phoneRegex, '전화번호 형식이 올바르지 않습니다.'),
});

export const verifyCodeSchemaFixed = verificationSchemaFixed.extend({
  code: z.string().trim().regex(/^\d{6}$/, '인증번호는 숫자 6자리여야 합니다.'),
});

export const signupSchemaFixed = z
  .object({
    verificationToken: z.string().trim().min(1, '인증 토큰이 필요합니다.'),
    email: z.string().trim().email('이메일 형식을 확인해 주세요.'),
    nickname: z.string().trim().min(1, '닉네임을 입력해 주세요.').max(30, '닉네임은 30자 이하여야 합니다.'),
    password: z.string().regex(passwordRegex, passwordRuleMessage),
    confirmPassword: z.string().regex(passwordRegex, passwordRuleMessage),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: '비밀번호 확인이 일치하지 않습니다.',
  });

export const passwordResetSchemaFixed = z
  .object({
    verificationToken: z.string().trim().min(1, '인증 토큰이 필요합니다.'),
    newPassword: z.string().regex(passwordRegex, passwordRuleMessage),
    confirmPassword: z.string().regex(passwordRegex, passwordRuleMessage),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: '비밀번호 확인이 일치하지 않습니다.',
  });

export const profileSchemaFixed = z.object({
  email: z.string().trim().email('이메일 형식을 확인해 주세요.').optional().or(z.literal('')),
  cohort: z.coerce.number().int().positive('기수는 1 이상의 숫자여야 합니다.').optional(),
  currentPassword: z.string().optional(),
  password: z.string().regex(passwordRegex, passwordRuleMessage).optional().or(z.literal('')),
});
