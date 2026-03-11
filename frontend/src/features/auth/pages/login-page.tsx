import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Card } from '@shared/components/ui/card';
import { Input } from '@shared/components/ui/input';
import { Button } from '@shared/components/ui/button';
import { FormField } from '@shared/components/ui/form-field';
import { loginSchema } from '@features/auth/model/schemas';
import { useLogin, toApiMessage } from '@features/auth/hooks/use-auth-actions';

const formSchema = loginSchema;
type LoginFormValues = z.infer<typeof formSchema>;

const highlights = [
  '공연 준비와 합주 피드백을 계정 하나로 연결',
  '모바일에서도 편하게 입력 가능한 폼',
  '실제 동아리 운영 흐름을 반영한 인증 UX',
];

export function LoginPage() {
  const loginMutation = useLogin();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    loginMutation.mutate(values);
  });

  return (
    <section className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
      <Card className="relative overflow-hidden bg-[linear-gradient(140deg,rgba(255,255,255,0.97)_0%,rgba(244,236,255,0.94)_52%,rgba(230,220,255,0.9)_100%)] px-6 py-8 md:px-8 md:py-10">
        <div className="absolute -left-12 top-14 h-44 w-44 rounded-full bg-[#ccb6ff]/50 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-[#f0b9ea]/34 blur-3xl" />
        <div className="relative space-y-6">
          <div className="inline-flex w-fit rounded-full bg-white/84 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#8b6de0] ring-1 ring-white/80">
            Sign In
          </div>
          <div>
            <h2 className="font-['Gaegu'] text-5xl font-bold leading-tight text-[#2b2340] md:text-6xl">
              리허설 전,
              <br />
              뮤즈부터 체크인.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              동아리원이 실제로 쓰는 운영용 로그인 화면입니다. 가볍고 귀여운 톤을 유지하면서도 인증 흐름은 명확하게 구성했습니다.
            </p>
          </div>

          <div className="grid gap-3">
            {highlights.map((item, index) => (
              <div key={item} className="flex items-start gap-3 rounded-[24px] bg-white/82 px-4 py-4 ring-1 ring-white/80">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#2b2340] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="pt-1 text-sm leading-7 text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="space-y-6 bg-white/92">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b6de0]">Welcome Back</p>
          <h3 className="text-3xl font-semibold tracking-tight text-slate-900">로그인</h3>
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
            <p className="rounded-[22px] bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              {toApiMessage(loginMutation.error)}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        <div className="grid gap-3 rounded-[26px] bg-[#f3efff] p-4 text-sm text-slate-600">
          <Link className="rounded-[18px] bg-white px-4 py-3 font-medium text-slate-700 ring-1 ring-[#e8defc] transition hover:bg-white/95" to="/signup">
            회원가입하러 가기
          </Link>
          <Link className="rounded-[18px] bg-white px-4 py-3 font-medium text-slate-700 ring-1 ring-[#e8defc] transition hover:bg-white/95" to="/recovery">
            아이디 찾기 / 비밀번호 재설정
          </Link>
        </div>
      </Card>
    </section>
  );
}