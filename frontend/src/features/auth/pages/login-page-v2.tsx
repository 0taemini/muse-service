import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Card } from '@shared/components/ui/card';
import { Input } from '@shared/components/ui/input';
import { Button } from '@shared/components/ui/button';
import { FormField } from '@shared/components/ui/form-field';
import { InlineNotice } from '@shared/components/ui/inline-notice';
import { loginSchemaFixed } from '@features/auth/model/schemas-fixed';
import { useLogin, toApiMessage } from '@features/auth/hooks/use-auth-actions';

const formSchema = loginSchemaFixed;
type LoginFormValues = z.infer<typeof formSchema>;

export function LoginPageV2() {
  const loginMutation = useLogin();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    loginMutation.mutate(values);
  });

  return (
    <section className="mx-auto w-full max-w-[780px]">
      <Card className="space-y-6">
        <div className="space-y-2">
          <p className="section-kicker">Sign In</p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">로그인</h2>
          <p className="text-sm leading-7 text-slate-500">등록한 이메일과 비밀번호를 입력해 주세요.</p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <FormField label="이메일" error={form.formState.errors.email?.message}>
            <Input type="email" placeholder="muse@example.com" {...form.register('email')} />
          </FormField>
          <FormField label="비밀번호" error={form.formState.errors.password?.message}>
            <Input type="password" placeholder="비밀번호 입력" {...form.register('password')} />
          </FormField>
          {loginMutation.isError ? (
            <InlineNotice tone="error">{toApiMessage(loginMutation.error)}</InlineNotice>
          ) : null}
          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <Link
            className="rounded-[18px] bg-white px-4 py-3 font-medium ring-1 ring-slate-200 transition hover:bg-slate-100"
            to="/signup"
          >
            회원가입하러 가기
          </Link>
          <Link
            className="rounded-[18px] bg-white px-4 py-3 font-medium ring-1 ring-slate-200 transition hover:bg-slate-100"
            to="/recovery"
          >
            이메일 찾기 / 비밀번호 재설정
          </Link>
        </div>
      </Card>
    </section>
  );
}
