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
import { passwordResetSchema, verificationSchema, verifyCodeSchema, passwordRuleMessage } from '@features/auth/model/schemas';

const sendSchema = verificationSchema;
const codeSchema = verifyCodeSchema;
const resetSchema = passwordResetSchema;

type SendValues = z.infer<typeof sendSchema>;
type CodeValues = z.infer<typeof codeSchema>;
type ResetValues = z.infer<typeof resetSchema>;

export function RecoveryPage() {
  const [message, setMessage] = useState('');
  const [foundEmail, setFoundEmail] = useState('');
  const emailSendForm = useForm<SendValues>({ resolver: zodResolver(sendSchema), defaultValues: { name: '', cohort: 1, phone: '' } });
  const emailCodeForm = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { name: '', cohort: 1, phone: '', code: '' } });
  const resetSendForm = useForm<SendValues>({ resolver: zodResolver(sendSchema), defaultValues: { name: '', cohort: 1, phone: '' } });
  const resetCodeForm = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { name: '', cohort: 1, phone: '', code: '' } });
  const resetForm = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { verificationToken: '', newPassword: '', confirmPassword: '' } });

  const emailSendMutation = useMutation({
    mutationFn: authApi.sendFindEmailVerification,
    onSuccess: (response, values) => {
      setMessage(response.message);
      emailCodeForm.reset({ ...values, code: '' });
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  const emailFindMutation = useMutation({
    mutationFn: authApi.findEmail,
    onSuccess: (response) => {
      setMessage(response.message);
      setFoundEmail(response.data.email);
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  const resetSendMutation = useMutation({
    mutationFn: authApi.sendPasswordResetVerification,
    onSuccess: (response, values) => {
      setMessage(response.message);
      resetCodeForm.reset({ ...values, code: '' });
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  const resetVerifyMutation = useMutation({
    mutationFn: authApi.verifyPasswordResetCode,
    onSuccess: (response) => {
      setMessage(response.message);
      resetForm.setValue('verificationToken', response.data.verificationToken);
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: (response) => setMessage(response.message),
    onError: (error) => setMessage(toApiMessage(error)),
  });

  return (
    <section className="space-y-6 lg:space-y-8">
      <Card className="bg-[linear-gradient(140deg,rgba(255,255,255,0.97)_0%,rgba(233,243,255,0.95)_100%)] px-6 py-8 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6b7bda]">Account Recovery</p>
        <h2 className="mt-3 font-['Gaegu'] text-5xl font-bold leading-tight text-[#2b2340] md:text-6xl">
          아이디 찾기와
          <br />
          비밀번호 재설정을
          <br />
          깔끔하게 분리했습니다.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          복구 흐름을 두 갈래로 나눠 필요한 작업만 선택할 수 있게 했습니다. 두 과정 모두 전화번호 인증을 기반으로 동일한 경험을 제공합니다.
        </p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-5 bg-white/92">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6b7bda]">Find Email</p>
            <h3 className="text-2xl font-semibold text-slate-900">아이디 찾기</h3>
            <p className="text-sm leading-7 text-slate-500">이름, 기수, 전화번호가 일치하면 가입 이메일을 확인할 수 있습니다.</p>
          </div>
          <form className="space-y-4" onSubmit={emailSendForm.handleSubmit((values) => emailSendMutation.mutate(values))}>
            <FormField label="이름" error={emailSendForm.formState.errors.name?.message}><Input {...emailSendForm.register('name')} /></FormField>
            <FormField label="기수" error={emailSendForm.formState.errors.cohort?.message?.toString()}><Input type="number" {...emailSendForm.register('cohort', { valueAsNumber: true })} /></FormField>
            <FormField label="전화번호" error={emailSendForm.formState.errors.phone?.message}><Input {...emailSendForm.register('phone')} /></FormField>
            <Button type="submit" className="w-full" disabled={emailSendMutation.isPending}>인증번호 발송</Button>
          </form>
          <form className="space-y-4 rounded-[26px] border border-[#dbe1ff] bg-[#eef3ff] p-4" onSubmit={emailCodeForm.handleSubmit((values) => emailFindMutation.mutate(values))}>
            <FormField label="이름" error={emailCodeForm.formState.errors.name?.message}><Input {...emailCodeForm.register('name')} /></FormField>
            <FormField label="기수" error={emailCodeForm.formState.errors.cohort?.message?.toString()}><Input type="number" {...emailCodeForm.register('cohort', { valueAsNumber: true })} /></FormField>
            <FormField label="전화번호" error={emailCodeForm.formState.errors.phone?.message}><Input {...emailCodeForm.register('phone')} /></FormField>
            <FormField label="인증번호" error={emailCodeForm.formState.errors.code?.message}><Input {...emailCodeForm.register('code')} /></FormField>
            <Button type="submit" className="w-full" disabled={emailFindMutation.isPending}>이메일 확인</Button>
          </form>
          {foundEmail ? (
            <div className="rounded-[22px] bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">가입한 이메일: {foundEmail}</div>
          ) : null}
        </Card>

        <Card className="space-y-5 bg-[#2b2340] text-white">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d8c3ff]">Reset Password</p>
            <h3 className="text-2xl font-semibold">비밀번호 재설정</h3>
            <p className="text-sm leading-7 text-slate-300">전화번호 인증 완료 후 새 비밀번호를 설정합니다.</p>
          </div>
          <form className="space-y-4" onSubmit={resetSendForm.handleSubmit((values) => resetSendMutation.mutate(values))}>
            <FormField label="이름" error={resetSendForm.formState.errors.name?.message}><Input className="bg-white/96" {...resetSendForm.register('name')} /></FormField>
            <FormField label="기수" error={resetSendForm.formState.errors.cohort?.message?.toString()}><Input className="bg-white/96" type="number" {...resetSendForm.register('cohort', { valueAsNumber: true })} /></FormField>
            <FormField label="전화번호" error={resetSendForm.formState.errors.phone?.message}><Input className="bg-white/96" {...resetSendForm.register('phone')} /></FormField>
            <Button type="submit" className="w-full" disabled={resetSendMutation.isPending}>인증번호 발송</Button>
          </form>
          <form className="space-y-4 rounded-[26px] border border-white/10 bg-white/6 p-4" onSubmit={resetCodeForm.handleSubmit((values) => resetVerifyMutation.mutate(values))}>
            <FormField label="이름" error={resetCodeForm.formState.errors.name?.message}><Input className="bg-white/96" {...resetCodeForm.register('name')} /></FormField>
            <FormField label="기수" error={resetCodeForm.formState.errors.cohort?.message?.toString()}><Input className="bg-white/96" type="number" {...resetCodeForm.register('cohort', { valueAsNumber: true })} /></FormField>
            <FormField label="전화번호" error={resetCodeForm.formState.errors.phone?.message}><Input className="bg-white/96" {...resetCodeForm.register('phone')} /></FormField>
            <FormField label="인증번호" error={resetCodeForm.formState.errors.code?.message}><Input className="bg-white/96" {...resetCodeForm.register('code')} /></FormField>
            <Button type="submit" className="w-full" disabled={resetVerifyMutation.isPending}>인증번호 검증</Button>
          </form>
          <form className="space-y-4 rounded-[26px] border border-white/10 bg-white/6 p-4" onSubmit={resetForm.handleSubmit((values) => resetPasswordMutation.mutate(values))}>
            <FormField label="인증 토큰" error={resetForm.formState.errors.verificationToken?.message}><Input className="bg-white/96" {...resetForm.register('verificationToken')} /></FormField>
            <FormField label="새 비밀번호" hint={passwordRuleMessage} error={resetForm.formState.errors.newPassword?.message}><Input className="bg-white/96" type="password" {...resetForm.register('newPassword')} /></FormField>
            <FormField label="비밀번호 확인" error={resetForm.formState.errors.confirmPassword?.message}><Input className="bg-white/96" type="password" {...resetForm.register('confirmPassword')} /></FormField>
            <Button type="submit" className="w-full" disabled={resetPasswordMutation.isPending}>비밀번호 변경</Button>
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