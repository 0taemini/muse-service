import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { FormField } from '@shared/components/ui/form-field';
import { authApi, toApiMessage } from '@features/auth/api/auth-api';
import { signupSchema, verificationSchema, verifyCodeSchema, passwordRuleMessage } from '@features/auth/model/schemas';

const sendSchema = verificationSchema;
const codeSchema = verifyCodeSchema;
const registerSchema = signupSchema;

type SendValues = z.infer<typeof sendSchema>;
type CodeValues = z.infer<typeof codeSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function SignupPage() {
  const [message, setMessage] = useState('');
  const sendForm = useForm<SendValues>({ resolver: zodResolver(sendSchema), defaultValues: { name: '', cohort: 1, phone: '' } });
  const codeForm = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { name: '', cohort: 1, phone: '', code: '' } });
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { verificationToken: '', email: '', nickname: '', password: '', confirmPassword: '' },
  });

  const sendMutation = useMutation({
    mutationFn: authApi.sendSignupVerification,
    onSuccess: (response, variables) => {
      setMessage(response.message);
      codeForm.reset({ ...variables, code: '' });
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  const verifyMutation = useMutation({
    mutationFn: authApi.verifySignupCode,
    onSuccess: (response) => {
      setMessage(response.message);
      registerForm.setValue('verificationToken', response.data.verificationToken);
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  const signupMutation = useMutation({
    mutationFn: authApi.signup,
    onSuccess: (response) => setMessage(response.message),
    onError: (error) => setMessage(toApiMessage(error)),
  });

  return (
    <section className="space-y-6 lg:space-y-8">
      <Card className="bg-[linear-gradient(140deg,rgba(255,255,255,0.97)_0%,rgba(242,233,255,0.95)_100%)] px-6 py-8 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b6de0]">Join Muse</p>
        <h2 className="mt-3 font-['Gaegu'] text-5xl font-bold leading-tight text-[#2b2340] md:text-6xl">
          동아리 명단 확인부터
          <br />
          계정 연결까지,
          <br />
          연습하듯 단계별로.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          all_user 명단과 맞는 멤버만 가입되도록 전화번호 인증과 계정 생성을 분리했습니다. 동아리 운영 기준을 유지하면서도 사용 흐름은 직관적으로 구성했습니다.
        </p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="space-y-5 bg-white/92">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#2b2340] text-sm font-semibold text-white">01</div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">인증번호 발송</h3>
              <p className="text-sm text-slate-500">이름, 기수, 전화번호 확인</p>
            </div>
          </div>
          <form className="space-y-4" onSubmit={sendForm.handleSubmit((values) => sendMutation.mutate(values))}>
            <FormField label="이름" error={sendForm.formState.errors.name?.message}><Input {...sendForm.register('name')} /></FormField>
            <FormField label="기수" error={sendForm.formState.errors.cohort?.message?.toString()}><Input type="number" {...sendForm.register('cohort', { valueAsNumber: true })} /></FormField>
            <FormField label="전화번호" error={sendForm.formState.errors.phone?.message}><Input placeholder="010-0000-0000" {...sendForm.register('phone')} /></FormField>
            <Button type="submit" className="w-full" disabled={sendMutation.isPending}>인증번호 보내기</Button>
          </form>
        </Card>

        <Card className="space-y-5 border-transparent bg-[#f3efff]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#8b6de0] text-sm font-semibold text-white">02</div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">인증번호 검증</h3>
              <p className="text-sm text-slate-500">회원가입 토큰 발급</p>
            </div>
          </div>
          <form className="space-y-4" onSubmit={codeForm.handleSubmit((values) => verifyMutation.mutate(values))}>
            <FormField label="이름" error={codeForm.formState.errors.name?.message}><Input {...codeForm.register('name')} /></FormField>
            <FormField label="기수" error={codeForm.formState.errors.cohort?.message?.toString()}><Input type="number" {...codeForm.register('cohort', { valueAsNumber: true })} /></FormField>
            <FormField label="전화번호" error={codeForm.formState.errors.phone?.message}><Input {...codeForm.register('phone')} /></FormField>
            <FormField label="인증번호" error={codeForm.formState.errors.code?.message}><Input {...codeForm.register('code')} /></FormField>
            <Button type="submit" className="w-full" disabled={verifyMutation.isPending}>인증번호 확인</Button>
          </form>
        </Card>

        <Card className="space-y-5 bg-[#2b2340] text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-white text-sm font-semibold text-[#2b2340]">03</div>
            <div>
              <h3 className="text-lg font-semibold">계정 생성</h3>
              <p className="text-sm text-slate-300">인증 토큰으로 계정 만들기</p>
            </div>
          </div>
          <form className="space-y-4" onSubmit={registerForm.handleSubmit((values) => signupMutation.mutate(values))}>
            <FormField label="인증 토큰" error={registerForm.formState.errors.verificationToken?.message}><Input className="bg-white/96" {...registerForm.register('verificationToken')} /></FormField>
            <FormField label="이메일" error={registerForm.formState.errors.email?.message}><Input className="bg-white/96" type="email" {...registerForm.register('email')} /></FormField>
            <FormField label="닉네임" error={registerForm.formState.errors.nickname?.message}><Input className="bg-white/96" {...registerForm.register('nickname')} /></FormField>
            <FormField label="비밀번호" hint={passwordRuleMessage} error={registerForm.formState.errors.password?.message}><Input className="bg-white/96" type="password" {...registerForm.register('password')} /></FormField>
            <FormField label="비밀번호 확인" error={registerForm.formState.errors.confirmPassword?.message}><Input className="bg-white/96" type="password" {...registerForm.register('confirmPassword')} /></FormField>
            <Button type="submit" className="w-full" disabled={signupMutation.isPending}>회원가입 완료</Button>
          </form>
        </Card>
      </div>

      {message ? (
        <Card className="bg-white/92">
          <p className="text-sm font-medium text-[#6a53b5]">{message}</p>
        </Card>
      ) : null}
    </section>
  );
}