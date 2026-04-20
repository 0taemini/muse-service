import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
type Tone = 'neutral' | 'success' | 'error';

type StepCopy = {
  id: StepId;
  eyebrow: string;
  title: string;
  description: string;
  hint: string;
};

const stepCopy: StepCopy[] = [
  {
    id: 1,
    eyebrow: 'STEP 1',
    title: '멤버 정보 확인',
    description: '이름, 기수, 전화번호를 확인한 뒤 인증번호를 요청합니다.',
    hint: '등록된 멤버 정보와 일치해야 다음 단계로 넘어갈 수 있습니다.',
  },
  {
    id: 2,
    eyebrow: 'STEP 2',
    title: '인증번호 검증',
    description: '받은 인증번호를 입력하면 회원가입 토큰이 발급됩니다.',
    hint: '토큰이 발급되면 마지막 단계에서 계정을 바로 생성할 수 있습니다.',
  },
  {
    id: 3,
    eyebrow: 'STEP 3',
    title: '계정 생성',
    description: '이메일, 닉네임, 비밀번호를 입력해 계정을 마무리합니다.',
    hint: '인증 토큰은 자동으로 채워지지만 필요하면 직접 수정할 수 있습니다.',
  },
];

function toneStyles(tone: Tone) {
  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }

  if (tone === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-900';
  }

  return 'border-slate-200 bg-white text-slate-700';
}

function StepRailItem({
  step,
  active,
  unlocked,
  complete,
  onClick,
}: {
  step: StepCopy;
  active: boolean;
  unlocked: boolean;
  complete: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!unlocked}
      className={[
        'flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left transition',
        active
          ? 'border-slate-900 bg-slate-900 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]'
          : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50',
        !unlocked ? 'cursor-not-allowed opacity-55' : '',
      ].join(' ')}
    >
      <div
        className={[
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold',
          active ? 'bg-white text-slate-900' : complete ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700',
        ].join(' ')}
      >
        {complete ? 'OK' : `0${step.id}`}
      </div>
      <div className="min-w-0">
        <p
          className={
            active
              ? 'text-xs font-semibold uppercase tracking-[0.24em] text-slate-300'
              : 'text-xs font-semibold uppercase tracking-[0.24em] text-slate-400'
          }
        >
          {step.eyebrow}
        </p>
        <h3 className="mt-2 text-base font-semibold">{step.title}</h3>
        <p className={active ? 'mt-1 text-sm leading-6 text-slate-300' : 'mt-1 text-sm leading-6 text-slate-500'}>
          {step.description}
        </p>
      </div>
    </button>
  );
}

export function SignupPageV2() {
  const [activeStep, setActiveStep] = useState<StepId>(1);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<Tone>('neutral');
  const [sentProfile, setSentProfile] = useState<SendValues | null>(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [signupComplete, setSignupComplete] = useState(false);

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

  const registerEmail = registerForm.watch('email');
  const registerNickname = registerForm.watch('nickname');

  const sendMutation = useMutation({
    mutationFn: authApi.sendSignupVerification,
    onSuccess: (response, variables) => {
      setMessage(response.message);
      setMessageTone('success');
      setSentProfile(variables);
      setVerificationToken('');
      setSignupComplete(false);
      codeForm.reset({ ...variables, code: '' });
      registerForm.setValue('verificationToken', '', { shouldValidate: false });
      setActiveStep(2);
    },
    onError: (error) => {
      setMessage(toApiMessage(error));
      setMessageTone('error');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: authApi.verifySignupCode,
    onSuccess: (response) => {
      const token = response.data.verificationToken;
      setMessage(response.message);
      setMessageTone('success');
      setVerificationToken(token);
      registerForm.setValue('verificationToken', token, { shouldValidate: true });
      setActiveStep(3);
    },
    onError: (error) => {
      setMessage(toApiMessage(error));
      setMessageTone('error');
    },
  });

  const signupMutation = useMutation({
    mutationFn: authApi.signup,
    onSuccess: (response) => {
      setMessage(response.message);
      setMessageTone('success');
      setSignupComplete(true);
    },
    onError: (error) => {
      setMessage(toApiMessage(error));
      setMessageTone('error');
    },
  });

  const unlockedSteps = useMemo(
    () => ({
      1: true,
      2: Boolean(sentProfile),
      3: Boolean(verificationToken),
    }),
    [sentProfile, verificationToken],
  );

  const completion = useMemo(
    () => ({
      1: Boolean(sentProfile),
      2: Boolean(verificationToken),
      3: signupComplete,
    }),
    [sentProfile, verificationToken, signupComplete],
  );

  const currentStep = stepCopy.find((step) => step.id === activeStep) ?? stepCopy[0];

  return (
    <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card className="overflow-hidden border-slate-900 bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.18),_transparent_42%),linear-gradient(160deg,_#0f172a_0%,_#1e293b_58%,_#334155_100%)] p-0 text-white">
          <div className="space-y-5 px-6 py-7 md:px-7">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
              Signup Flow
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">한 번에 한 단계씩 가입합니다.</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300 md:text-base">
                동시에 세 개 폼을 보는 대신, 현재 단계 하나에만 집중하도록 흐름을 재구성했습니다. 인증이 끝나면 다음 단계가
                자동으로 열립니다.
              </p>
            </div>
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <div className="flex items-center justify-between gap-4">
                <span>현재 단계</span>
                <span className="font-semibold text-white">{currentStep.title}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>진행 상태</span>
                <span className="font-semibold text-white">
                  {Object.values(completion).filter(Boolean).length} / 3 완료
                </span>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          {stepCopy.map((step) => (
            <StepRailItem
              key={step.id}
              step={step}
              active={activeStep === step.id}
              unlocked={unlockedSteps[step.id]}
              complete={completion[step.id]}
              onClick={() => setActiveStep(step.id)}
            />
          ))}
        </div>

        {message ? (
          <Card className={toneStyles(messageTone)}>
            <p className="text-sm font-medium leading-6">{message}</p>
          </Card>
        ) : null}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="grid min-h-full lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-6 px-6 py-7 md:px-8 md:py-8">
            <div className="space-y-3 border-b border-slate-200 pb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{currentStep.eyebrow}</p>
              <h3 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">{currentStep.title}</h3>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base">{currentStep.description}</p>
            </div>

            {activeStep === 1 ? (
              <form className="space-y-5" onSubmit={sendForm.handleSubmit((values) => sendMutation.mutate(values))}>
                <div className="grid gap-5 md:grid-cols-2">
                  <FormField label="이름" error={sendForm.formState.errors.name?.message}>
                    <Input autoComplete="name" placeholder="이름을 입력하세요" {...sendForm.register('name')} />
                  </FormField>
                  <FormField label="기수" error={sendForm.formState.errors.cohort?.message?.toString()}>
                    <Input type="number" min={1} {...sendForm.register('cohort', { valueAsNumber: true })} />
                  </FormField>
                </div>
                <FormField label="전화번호" error={sendForm.formState.errors.phone?.message}>
                  <Input autoComplete="tel" placeholder="010-0000-0000" {...sendForm.register('phone')} />
                </FormField>
                <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
                  <Button type="submit" className="sm:min-w-[180px]" disabled={sendMutation.isPending}>
                    {sendMutation.isPending ? '인증번호 발송 중...' : '인증번호 보내기'}
                  </Button>
                  <p className="text-sm leading-6 text-slate-500">
                    멤버 정보가 일치하면 다음 단계로 자동 이동합니다.
                  </p>
                </div>
              </form>
            ) : null}

            {activeStep === 2 ? (
              <form className="space-y-5" onSubmit={codeForm.handleSubmit((values) => verifyMutation.mutate(values))}>
                <div className="grid gap-5 md:grid-cols-2">
                  <FormField label="이름" error={codeForm.formState.errors.name?.message}>
                    <Input autoComplete="name" placeholder="이름을 입력하세요" {...codeForm.register('name')} />
                  </FormField>
                  <FormField label="기수" error={codeForm.formState.errors.cohort?.message?.toString()}>
                    <Input type="number" min={1} {...codeForm.register('cohort', { valueAsNumber: true })} />
                  </FormField>
                </div>
                <FormField label="전화번호" error={codeForm.formState.errors.phone?.message}>
                  <Input autoComplete="tel" placeholder="010-0000-0000" {...codeForm.register('phone')} />
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
                <FormField
                  label="인증 토큰"
                  hint="2단계 인증이 성공하면 자동 입력됩니다."
                  error={registerForm.formState.errors.verificationToken?.message}
                >
                  <Input {...registerForm.register('verificationToken')} />
                </FormField>
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

          <aside className="border-t border-slate-200 bg-slate-50 px-6 py-7 lg:border-l lg:border-t-0">
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Guide</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{currentStep.hint}</p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">입력 요약</p>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Member</p>
                    <p className="mt-1 font-medium text-slate-900">
                      {sentProfile ? `${sentProfile.name} · ${sentProfile.cohort}기` : '아직 확인 전'}
                    </p>
                    <p className="mt-1 break-all">{sentProfile?.phone || '전화번호 인증 전'}</p>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Token</p>
                    <p className="mt-1 break-all font-medium text-slate-900">
                      {verificationToken || '인증번호 확인 후 자동 입력'}
                    </p>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Account</p>
                    <p className="mt-1 font-medium text-slate-900">{registerNickname || '닉네임 미입력'}</p>
                    <p className="mt-1 break-all">{registerEmail || '이메일 미입력'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">다음 동작</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {activeStep === 1 && '멤버 정보를 확인하고 인증번호를 받아 옵니다.'}
                  {activeStep === 2 && '받은 인증번호를 검증해서 계정 생성 토큰을 발급합니다.'}
                  {activeStep === 3 && '계정 정보를 입력한 뒤 회원가입을 완료합니다.'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </Card>
    </section>
  );
}
