import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Card } from '@shared/components/ui/card';
import { Input } from '@shared/components/ui/input';
import { Button } from '@shared/components/ui/button';
import { FormField } from '@shared/components/ui/form-field';
import { loginSchemaFixed } from '@features/auth/model/schemas-fixed';
import { useLogin, toApiMessage } from '@features/auth/hooks/use-auth-actions';

const formSchema = loginSchemaFixed;
type LoginFormValues = z.infer<typeof formSchema>;

const highlights = [
  '공연별 곡 리스트와 선곡 상태를 한 화면에서 관리합니다.',
  '확정 곡만 합주방으로 연결되는 실제 운영 규칙을 반영합니다.',
  '세션 배정과 피드백 기록 흐름을 모바일에서도 무리 없이 사용할 수 있게 정리합니다.',
];

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
    <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="border-slate-900 bg-slate-900 px-6 py-8 text-white md:px-8 md:py-10">
        <div className="space-y-6">
          <div className="inline-flex w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
            Muse Login
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">뮤즈 서비스 로그인</h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              실제 동아리 운영에서 바로 쓰는 화면 기준으로 정리했습니다. 공연 준비, 곡 선정, 합주 피드백 흐름을
              로그인 후 바로 이어서 사용할 수 있습니다.
            </p>
          </div>
          <div className="grid gap-3">
            {highlights.map((item, index) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-semibold text-slate-900">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-slate-200">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Sign In</p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">로그인</h2>
          <p className="text-sm leading-7 text-slate-500">등록된 이메일과 비밀번호를 입력해 주세요.</p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <FormField label="이메일" error={form.formState.errors.email?.message}>
            <Input type="email" placeholder="muse@example.com" {...form.register('email')} />
          </FormField>
          <FormField label="비밀번호" error={form.formState.errors.password?.message}>
            <Input type="password" placeholder="비밀번호 입력" {...form.register('password')} />
          </FormField>
          {loginMutation.isError ? (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              {toApiMessage(loginMutation.error)}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <Link className="rounded-xl bg-white px-4 py-3 font-medium ring-1 ring-slate-200 transition hover:bg-slate-50" to="/signup">
            회원가입하러 가기
          </Link>
          <Link className="rounded-xl bg-white px-4 py-3 font-medium ring-1 ring-slate-200 transition hover:bg-slate-50" to="/recovery">
            이메일 찾기 / 비밀번호 재설정
          </Link>
        </div>
      </Card>
    </section>
  );
}
