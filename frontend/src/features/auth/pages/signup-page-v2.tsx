import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Card } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { FormField } from '@shared/components/ui/form-field';
import { authApi, toApiMessage } from '@features/auth/api/auth-api';
import {
  passwordRuleMessage,
  signupSchemaFixed,
  verificationSchemaFixed,
  verifyCodeSchemaFixed,
} from '@features/auth/model/schemas-fixed';

const sendSchema = verificationSchemaFixed;
const codeSchema = verifyCodeSchemaFixed;
const registerSchema = signupSchemaFixed;

type SendValues = z.infer<typeof sendSchema>;
type CodeValues = z.infer<typeof codeSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
type StepId = 1 | 2 | 3;

type StepCopy = {
  id: StepId;
  label: string;
  helper: string;
};

const stepCopy: StepCopy[] = [
  {
    id: 1,
    label: '멤버 정보 확인',
    helper: '이름, 기수, 전화번호를 확인한 뒤 인증번호를 요청합니다.',
  },
  {
    id: 2,
    label: '인증번호 확인',
    helper: '전송된 인증번호를 입력해 회원가입용 인증 토큰을 발급받습니다.',
  },
  {
    id: 3,
    label: '계정 생성',
    helper: '이메일, 닉네임, 비밀번호를 입력하고 회원가입을 완료합니다.',
  },
];

function formatPhoneNumber(rawValue: string) {
  const digits = rawValue.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.startsWith('02')) {
    const normalized = digits.slice(0, 10);

    if (normalized.length <= 2) {
      return normalized;
    }

    if (normalized.length <= 5) {
      return `${normalized.slice(0, 2)}-${normalized.slice(2)}`;
    }

    if (normalized.length <= 9) {
      return `${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5)}`;
    }

    return `${normalized.slice(0, 2)}-${normalized.slice(2, 6)}-${normalized.slice(6)}`;
  }

  const normalized = digits.slice(0, 11);

  if (normalized.length <= 3) {
    return normalized;
  }

  if (normalized.length <= 7) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
  }

  if (normalized.length <= 10) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }

  return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`;
}

export function SignupPageV2() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState<StepId>(1);
  const [sentProfile, setSentProfile] = useState<SendValues | null>(null);
  const [verificationToken, setVerificationToken] = useState('');

  const sendForm = useForm<SendValues>({
    resolver: zodResolver(sendSchema),
    defaultValues: { name: '', cohort: 1, phone: '' },
  });
  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { name: '', cohort: 1, phone: '', code: '' },
  });
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { verificationToken: '', email: '', nickname: '', password: '', confirmPassword: '' },
  });

  const currentStep = stepCopy.find((step) => step.id === activeStep) ?? stepCopy[0];
  const sendPhoneValue = sendForm.watch('phone');
  const codePhoneValue = codeForm.watch('phone');

  const sendPhoneField = sendForm.register('phone');
  const codePhoneField = codeForm.register('phone');

  const registerEmail = registerForm.watch('email');
  const registerNickname = registerForm.watch('nickname');

  const sendMutation = useMutation({
    mutationFn: authApi.sendSignupVerification,
    onSuccess: (response, variables) => {
      window.alert(response.message);
      setSentProfile(variables);
      setVerificationToken('');
      codeForm.reset({ ...variables, code: '' });
      registerForm.setValue('verificationToken', '', { shouldValidate: false });
      setActiveStep(2);
    },
    onError: (error) => {
      window.alert(toApiMessage(error));
    },
  });

  const verifyMutation = useMutation({
    mutationFn: authApi.verifySignupCode,
    onSuccess: (response) => {
      const token = response.data.verificationToken;
      window.alert(response.message);
      setVerificationToken(token);
      registerForm.setValue('verificationToken', token, { shouldValidate: true });
      setActiveStep(3);
    },
    onError: (error) => {
      window.alert(toApiMessage(error));
    },
  });

  const signupMutation = useMutation({
    mutationFn: authApi.signup,
    onSuccess: (response) => {
      window.alert(response.message);
      navigate('/login');
    },
    onError: (error) => {
      window.alert(toApiMessage(error));
    },
  });

  return (
    <section className="mx-auto flex w-full max-w-[860px] flex-col gap-3 md:gap-5">
      <Card className="hidden border-slate-200 bg-white px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] md:block md:px-8">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">회원가입</h2>
          <p className="text-sm leading-7 text-slate-600 md:text-base">
            뮤즈동아리 사람만 회원가입이 가능합니다. {currentStep.helper}
          </p>
        </div>
      </Card>

      <Card className="overflow-hidden border-slate-200 p-0 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <div className="space-y-6 px-6 py-7 md:px-8 md:py-8">
          <div className="space-y-2 md:hidden">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">회원가입</h2>
            <p className="text-sm leading-6 text-slate-600">뮤즈동아리 사람만 회원가입이 가능합니다.</p>
          </div>

          <div className="space-y-2 border-b border-slate-200 pb-5">
            <p className="text-sm font-medium text-slate-500">현재 단계</p>
            <p className="text-2xl font-semibold tracking-tight text-slate-950">{currentStep.label}</p>
            <p className="hidden text-sm leading-7 text-slate-600 md:block">
              회원 정보는 동아리 등록 정보와 일치해야 다음 단계로 진행할 수 있습니다.
            </p>
          </div>

          {activeStep === 1 ? (
            <form className="space-y-5" onSubmit={sendForm.handleSubmit((values) => sendMutation.mutate(values))}>
              <div className="grid gap-5 md:grid-cols-2">
                <FormField label="이름" error={sendForm.formState.errors.name?.message}>
                  <Input autoComplete="name" placeholder="이름을 입력해 주세요" {...sendForm.register('name')} />
                </FormField>
                <FormField label="기수" error={sendForm.formState.errors.cohort?.message?.toString()}>
                  <Input type="number" min={1} {...sendForm.register('cohort', { valueAsNumber: true })} />
                </FormField>
              </div>
              <FormField label="전화번호" error={sendForm.formState.errors.phone?.message}>
                <Input
                  autoComplete="tel"
                  inputMode="numeric"
                  placeholder="010-0000-0000"
                  name={sendPhoneField.name}
                  ref={sendPhoneField.ref}
                  onBlur={sendPhoneField.onBlur}
                  value={sendPhoneValue}
                  onChange={(event) =>
                    sendForm.setValue('phone', formatPhoneNumber(event.target.value), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              </FormField>
              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
                <Button type="submit" className="sm:min-w-[180px]" disabled={sendMutation.isPending}>
                  {sendMutation.isPending ? '인증번호 발송 중...' : '인증번호 보내기'}
                </Button>
                <p className="text-sm leading-6 text-slate-500">
                  전화번호는 숫자만 입력해도 자동으로 하이픈이 들어갑니다.
                </p>
              </div>
            </form>
          ) : null}

          {activeStep === 2 ? (
            <form className="space-y-5" onSubmit={codeForm.handleSubmit((values) => verifyMutation.mutate(values))}>
              <div className="grid gap-5 md:grid-cols-2">
                <FormField label="이름" error={codeForm.formState.errors.name?.message}>
                  <Input autoComplete="name" placeholder="이름을 입력해 주세요" {...codeForm.register('name')} />
                </FormField>
                <FormField label="기수" error={codeForm.formState.errors.cohort?.message?.toString()}>
                  <Input type="number" min={1} {...codeForm.register('cohort', { valueAsNumber: true })} />
                </FormField>
              </div>
              <FormField label="전화번호" error={codeForm.formState.errors.phone?.message}>
                <Input
                  autoComplete="tel"
                  inputMode="numeric"
                  placeholder="010-0000-0000"
                  name={codePhoneField.name}
                  ref={codePhoneField.ref}
                  onBlur={codePhoneField.onBlur}
                  value={codePhoneValue}
                  onChange={(event) =>
                    codeForm.setValue('phone', formatPhoneNumber(event.target.value), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              </FormField>
              <FormField label="인증번호" error={codeForm.formState.errors.code?.message}>
                <Input inputMode="numeric" placeholder="숫자 6자리" {...codeForm.register('code')} />
              </FormField>
              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                <Button type="button" variant="secondary" onClick={() => setActiveStep(1)}>
                  이전 단계
                </Button>
                <Button type="submit" className="sm:min-w-[180px]" disabled={verifyMutation.isPending}>
                  {verifyMutation.isPending ? '인증번호 확인 중...' : '인증번호 확인'}
                </Button>
              </div>
            </form>
          ) : null}

          {activeStep === 3 ? (
            <form className="space-y-5" onSubmit={registerForm.handleSubmit((values) => signupMutation.mutate(values))}>
              <div className="grid gap-5 md:grid-cols-2">
                <FormField label="이메일" error={registerForm.formState.errors.email?.message}>
                  <Input autoComplete="email" type="email" placeholder="muse@example.com" {...registerForm.register('email')} />
                </FormField>
                <FormField label="닉네임" error={registerForm.formState.errors.nickname?.message}>
                  <Input placeholder="표시할 이름" {...registerForm.register('nickname')} />
                </FormField>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <FormField label="비밀번호" hint={passwordRuleMessage} error={registerForm.formState.errors.password?.message}>
                  <Input autoComplete="new-password" type="password" {...registerForm.register('password')} />
                </FormField>
                <FormField label="비밀번호 확인" error={registerForm.formState.errors.confirmPassword?.message}>
                  <Input autoComplete="new-password" type="password" {...registerForm.register('confirmPassword')} />
                </FormField>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                <p>
                  확인된 멤버 정보: {sentProfile ? `${sentProfile.name} / ${sentProfile.cohort}기 / ${sentProfile.phone}` : '아직 인증 전'}
                </p>
                <p className="mt-1 break-all">
                  계정 정보: {registerNickname || '닉네임 미입력'} / {registerEmail || '이메일 미입력'}
                </p>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                <Button type="button" variant="secondary" onClick={() => setActiveStep(2)}>
                  이전 단계
                </Button>
                <Button type="submit" className="sm:min-w-[180px]" disabled={signupMutation.isPending}>
                  {signupMutation.isPending ? '회원가입 처리 중...' : '회원가입 완료'}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
