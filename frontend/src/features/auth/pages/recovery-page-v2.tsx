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
import {
  passwordResetSchemaFixed,
  passwordRuleMessage,
  verificationSchemaFixed,
  verifyCodeSchemaFixed,
} from '@features/auth/model/schemas-fixed';

const sendSchema = verificationSchemaFixed;
const codeSchema = verifyCodeSchemaFixed;
const resetSchema = passwordResetSchemaFixed;

type SendValues = z.infer<typeof sendSchema>;
type CodeValues = z.infer<typeof codeSchema>;
type ResetValues = z.infer<typeof resetSchema>;

export function RecoveryPageV2() {
  const [message, setMessage] = useState('');
  const [foundEmail, setFoundEmail] = useState('');
  const emailSendForm = useForm<SendValues>({ resolver: zodResolver(sendSchema), defaultValues: { name: '', cohort: 1, phone: '' } });
  const emailCodeForm = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { name: '', cohort: 1, phone: '', code: '' } });
  const resetSendForm = useForm<SendValues>({ resolver: zodResolver(sendSchema), defaultValues: { name: '', cohort: 1, phone: '' } });
  const resetCodeForm = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { name: '', cohort: 1, phone: '', code: '' } });
  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { verificationToken: '', newPassword: '', confirmPassword: '' },
  });

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
    <section className="space-y-6">
      <Card className="px-6 py-8 md:px-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Account Recovery</p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">계정 찾기 및 비밀번호 재설정</h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
            이메일 찾기와 비밀번호 재설정을 분리해 실제 사용 흐름에 맞게 구성했습니다. 모든 절차는 전화번호 인증을
            기반으로 진행됩니다.
          </p>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Find Email</p>
            <h3 className="text-2xl font-semibold text-slate-900">이메일 찾기</h3>
            <p className="text-sm leading-7 text-slate-500">이름, 기수, 전화번호를 확인한 뒤 인증번호를 검증합니다.</p>
          </div>
          <form className="space-y-4" onSubmit={emailSendForm.handleSubmit((values) => emailSendMutation.mutate(values))}>
            <FormField label="이름" error={emailSendForm.formState.errors.name?.message}>
              <Input {...emailSendForm.register('name')} />
            </FormField>
            <FormField label="기수" error={emailSendForm.formState.errors.cohort?.message?.toString()}>
              <Input type="number" {...emailSendForm.register('cohort', { valueAsNumber: true })} />
            </FormField>
            <FormField label="전화번호" error={emailSendForm.formState.errors.phone?.message}>
              <Input {...emailSendForm.register('phone')} />
            </FormField>
            <Button type="submit" className="w-full" disabled={emailSendMutation.isPending}>
              {emailSendMutation.isPending ? '발송 중...' : '인증번호 발송'}
            </Button>
          </form>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <form className="space-y-4" onSubmit={emailCodeForm.handleSubmit((values) => emailFindMutation.mutate(values))}>
              <FormField label="이름" error={emailCodeForm.formState.errors.name?.message}>
                <Input {...emailCodeForm.register('name')} />
              </FormField>
              <FormField label="기수" error={emailCodeForm.formState.errors.cohort?.message?.toString()}>
                <Input type="number" {...emailCodeForm.register('cohort', { valueAsNumber: true })} />
              </FormField>
              <FormField label="전화번호" error={emailCodeForm.formState.errors.phone?.message}>
                <Input {...emailCodeForm.register('phone')} />
              </FormField>
              <FormField label="인증번호" error={emailCodeForm.formState.errors.code?.message}>
                <Input {...emailCodeForm.register('code')} />
              </FormField>
              <Button type="submit" className="w-full" disabled={emailFindMutation.isPending}>
                {emailFindMutation.isPending ? '확인 중...' : '이메일 확인'}
              </Button>
            </form>
          </div>
          {foundEmail ? (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              가입된 이메일: {foundEmail}
            </div>
          ) : null}
        </Card>

        <Card className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Reset Password</p>
            <h3 className="text-2xl font-semibold text-slate-900">비밀번호 재설정</h3>
            <p className="text-sm leading-7 text-slate-500">인증번호 검증을 마치면 새 비밀번호를 설정할 수 있습니다.</p>
          </div>
          <form className="space-y-4" onSubmit={resetSendForm.handleSubmit((values) => resetSendMutation.mutate(values))}>
            <FormField label="이름" error={resetSendForm.formState.errors.name?.message}>
              <Input {...resetSendForm.register('name')} />
            </FormField>
            <FormField label="기수" error={resetSendForm.formState.errors.cohort?.message?.toString()}>
              <Input type="number" {...resetSendForm.register('cohort', { valueAsNumber: true })} />
            </FormField>
            <FormField label="전화번호" error={resetSendForm.formState.errors.phone?.message}>
              <Input {...resetSendForm.register('phone')} />
            </FormField>
            <Button type="submit" className="w-full" disabled={resetSendMutation.isPending}>
              {resetSendMutation.isPending ? '발송 중...' : '인증번호 발송'}
            </Button>
          </form>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <form className="space-y-4" onSubmit={resetCodeForm.handleSubmit((values) => resetVerifyMutation.mutate(values))}>
              <FormField label="이름" error={resetCodeForm.formState.errors.name?.message}>
                <Input {...resetCodeForm.register('name')} />
              </FormField>
              <FormField label="기수" error={resetCodeForm.formState.errors.cohort?.message?.toString()}>
                <Input type="number" {...resetCodeForm.register('cohort', { valueAsNumber: true })} />
              </FormField>
              <FormField label="전화번호" error={resetCodeForm.formState.errors.phone?.message}>
                <Input {...resetCodeForm.register('phone')} />
              </FormField>
              <FormField label="인증번호" error={resetCodeForm.formState.errors.code?.message}>
                <Input {...resetCodeForm.register('code')} />
              </FormField>
              <Button type="submit" className="w-full" disabled={resetVerifyMutation.isPending}>
                {resetVerifyMutation.isPending ? '검증 중...' : '인증번호 검증'}
              </Button>
            </form>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <form className="space-y-4" onSubmit={resetForm.handleSubmit((values) => resetPasswordMutation.mutate(values))}>
              <FormField label="인증 토큰" error={resetForm.formState.errors.verificationToken?.message}>
                <Input {...resetForm.register('verificationToken')} />
              </FormField>
              <FormField label="새 비밀번호" hint={passwordRuleMessage} error={resetForm.formState.errors.newPassword?.message}>
                <Input type="password" {...resetForm.register('newPassword')} />
              </FormField>
              <FormField label="비밀번호 확인" error={resetForm.formState.errors.confirmPassword?.message}>
                <Input type="password" {...resetForm.register('confirmPassword')} />
              </FormField>
              <Button type="submit" className="w-full" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending ? '변경 중...' : '비밀번호 변경'}
              </Button>
            </form>
          </div>
        </Card>
      </div>

      {message ? (
        <Card className="border-slate-900 bg-slate-900 text-white">
          <p className="text-sm font-medium">{message}</p>
        </Card>
      ) : null}
    </section>
  );
}
