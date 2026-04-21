import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { authApi, toApiMessage } from '@features/auth/api/auth-api';
import {
  passwordResetSchemaFixed,
  passwordRuleMessage,
  verifyCodeSchemaFixed,
} from '@features/auth/model/schemas-fixed';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';
import { FormField } from '@shared/components/ui/form-field';
import { Input } from '@shared/components/ui/input';

const codeSchema = verifyCodeSchemaFixed;
const resetSchema = passwordResetSchemaFixed;

type RecoveryTab = 'email' | 'password';
type CodeValues = z.infer<typeof codeSchema>;
type ResetValues = z.infer<typeof resetSchema>;

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

export function RecoveryPageV2() {
  const [searchParams] = useSearchParams();
  const activeTab: RecoveryTab = searchParams.get('tab') === 'password' ? 'password' : 'email';
  const [foundEmail, setFoundEmail] = useState('');
  const [passwordResetToken, setPasswordResetToken] = useState('');

  const emailForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { name: '', cohort: 1, phone: '', code: '' },
  });
  const resetCodeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { name: '', cohort: 1, phone: '', code: '' },
  });
  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { verificationToken: '', newPassword: '', confirmPassword: '' },
  });

  const emailPhoneField = emailForm.register('phone');
  const resetPhoneField = resetCodeForm.register('phone');
  const emailPhoneValue = emailForm.watch('phone');
  const resetPhoneValue = resetCodeForm.watch('phone');

  const emailSendMutation = useMutation({
    mutationFn: authApi.sendFindEmailVerification,
    onSuccess: (response) => {
      window.alert(response.message);
    },
    onError: (error) => window.alert(toApiMessage(error)),
  });

  const emailFindMutation = useMutation({
    mutationFn: authApi.findEmail,
    onSuccess: (response) => {
      window.alert(response.message);
      setFoundEmail(response.data.email);
    },
    onError: (error) => window.alert(toApiMessage(error)),
  });

  const resetSendMutation = useMutation({
    mutationFn: authApi.sendPasswordResetVerification,
    onSuccess: (response) => {
      window.alert(response.message);
    },
    onError: (error) => window.alert(toApiMessage(error)),
  });

  const resetVerifyMutation = useMutation({
    mutationFn: authApi.verifyPasswordResetCode,
    onSuccess: (response) => {
      const token = response.data.verificationToken;
      window.alert(response.message);
      setPasswordResetToken(token);
      resetForm.reset({ verificationToken: token, newPassword: '', confirmPassword: '' });
    },
    onError: (error) => window.alert(toApiMessage(error)),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: (response) => {
      window.alert(response.message);
    },
    onError: (error) => window.alert(toApiMessage(error)),
  });

  const handleEmailSend = async () => {
    const isValid = await emailForm.trigger(['name', 'cohort', 'phone']);
    if (!isValid) {
      return;
    }

    const values = emailForm.getValues();
    emailSendMutation.mutate({
      name: values.name,
      cohort: values.cohort,
      phone: values.phone,
    });
  };

  const handleResetSend = async () => {
    const isValid = await resetCodeForm.trigger(['name', 'cohort', 'phone']);
    if (!isValid) {
      return;
    }

    setPasswordResetToken('');
    resetForm.reset({ verificationToken: '', newPassword: '', confirmPassword: '' });

    const values = resetCodeForm.getValues();
    resetSendMutation.mutate({
      name: values.name,
      cohort: values.cohort,
      phone: values.phone,
    });
  };

  const handleResetPasswordSubmit = resetForm.handleSubmit((values) => {
    if (!passwordResetToken) {
      window.alert('인증번호 확인을 먼저 진행해 주세요.');
      return;
    }

    resetPasswordMutation.mutate({
      ...values,
      verificationToken: passwordResetToken,
    });
  });

  const moveBackToVerification = () => {
    setPasswordResetToken('');
    resetForm.reset({ verificationToken: '', newPassword: '', confirmPassword: '' });
    resetCodeForm.setValue('code', '', { shouldDirty: false, shouldValidate: false });
  };

  return (
    <section className="mx-auto flex w-full max-w-[780px] flex-col gap-5">
      <Card className="overflow-hidden border-slate-200 p-0 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <div className="space-y-6 px-5 py-6 md:px-7 md:py-7">
          {activeTab === 'email' ? (
            <>
              <div className="space-y-2 border-b border-slate-200 pb-5">
                <p className="text-sm font-medium text-slate-500">이메일 찾기</p>
              </div>

              <form className="space-y-5" onSubmit={emailForm.handleSubmit((values) => emailFindMutation.mutate(values))}>
                <div className="grid gap-5 md:grid-cols-2">
                  <FormField label="이름" error={emailForm.formState.errors.name?.message}>
                    <Input autoComplete="name" placeholder="이름을 입력해 주세요" {...emailForm.register('name')} />
                  </FormField>

                  <FormField label="기수" error={emailForm.formState.errors.cohort?.message?.toString()}>
                    <Input type="number" min={1} {...emailForm.register('cohort', { valueAsNumber: true })} />
                  </FormField>
                </div>

                <FormField label="전화번호" error={emailForm.formState.errors.phone?.message}>
                  <Input
                    autoComplete="tel"
                    inputMode="numeric"
                    placeholder="010-0000-0000"
                    name={emailPhoneField.name}
                    ref={emailPhoneField.ref}
                    onBlur={emailPhoneField.onBlur}
                    value={emailPhoneValue}
                    onChange={(event) =>
                      emailForm.setValue('phone', formatPhoneNumber(event.target.value), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                </FormField>

                <FormField label="인증번호" error={emailForm.formState.errors.code?.message}>
                  <Input autoComplete="one-time-code" inputMode="numeric" placeholder="숫자 6자리" {...emailForm.register('code')} />
                </FormField>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                  <Button type="button" variant="secondary" onClick={handleEmailSend} disabled={emailSendMutation.isPending}>
                    {emailSendMutation.isPending ? '인증번호 발송 중...' : '인증번호 보내기'}
                  </Button>
                  <Button type="submit" className="sm:min-w-[180px]" disabled={emailFindMutation.isPending}>
                    {emailFindMutation.isPending ? '이메일 확인 중...' : '이메일 확인'}
                  </Button>
                </div>
              </form>

              {foundEmail ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-700">
                  가입된 이메일: {foundEmail}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="space-y-2 border-b border-slate-200 pb-5">
                <p className="text-sm font-medium text-slate-500">비밀번호 재설정</p>
              </div>

              {!passwordResetToken ? (
                <form className="space-y-5" onSubmit={resetCodeForm.handleSubmit((values) => resetVerifyMutation.mutate(values))}>
                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField label="이름" error={resetCodeForm.formState.errors.name?.message}>
                      <Input autoComplete="name" placeholder="이름을 입력해 주세요" {...resetCodeForm.register('name')} />
                    </FormField>

                    <FormField label="기수" error={resetCodeForm.formState.errors.cohort?.message?.toString()}>
                      <Input type="number" min={1} {...resetCodeForm.register('cohort', { valueAsNumber: true })} />
                    </FormField>
                  </div>

                  <FormField label="전화번호" error={resetCodeForm.formState.errors.phone?.message}>
                    <Input
                      autoComplete="tel"
                      inputMode="numeric"
                      placeholder="010-0000-0000"
                      name={resetPhoneField.name}
                      ref={resetPhoneField.ref}
                      onBlur={resetPhoneField.onBlur}
                      value={resetPhoneValue}
                      onChange={(event) =>
                        resetCodeForm.setValue('phone', formatPhoneNumber(event.target.value), {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="인증번호" error={resetCodeForm.formState.errors.code?.message}>
                    <Input autoComplete="one-time-code" inputMode="numeric" placeholder="숫자 6자리" {...resetCodeForm.register('code')} />
                  </FormField>

                  <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                    <Button type="button" variant="secondary" onClick={handleResetSend} disabled={resetSendMutation.isPending}>
                      {resetSendMutation.isPending ? '인증번호 발송 중...' : '인증번호 보내기'}
                    </Button>
                    <Button type="submit" className="sm:min-w-[180px]" disabled={resetVerifyMutation.isPending}>
                      {resetVerifyMutation.isPending ? '인증 확인 중...' : '다음'}
                    </Button>
                  </div>
                </form>
              ) : (
                <form className="space-y-5" onSubmit={handleResetPasswordSubmit}>
                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField label="새 비밀번호" hint={passwordRuleMessage} error={resetForm.formState.errors.newPassword?.message}>
                      <Input autoComplete="new-password" type="password" {...resetForm.register('newPassword')} />
                    </FormField>

                    <FormField label="비밀번호 확인" error={resetForm.formState.errors.confirmPassword?.message}>
                      <Input autoComplete="new-password" type="password" {...resetForm.register('confirmPassword')} />
                    </FormField>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                    <Button type="button" variant="ghost" onClick={moveBackToVerification}>
                      이전 단계
                    </Button>
                    <Button type="submit" className="sm:min-w-[180px]" disabled={resetPasswordMutation.isPending}>
                      {resetPasswordMutation.isPending ? '비밀번호 변경 중...' : '비밀번호 변경'}
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </Card>
    </section>
  );
}
