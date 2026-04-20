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
import { PageHeader } from '@shared/components/ui/page-header';

const formSchema = loginSchemaFixed;
type LoginFormValues = z.infer<typeof formSchema>;

const highlights = [
  '공연과 곡 리스트를 실제 운영 순서에 맞춰 정리할 수 있습니다.',
  '확정 곡만 합주 피드백 흐름으로 이어지는 정책을 자연스럽게 반영합니다.',
  '모바일에서도 폼과 주요 액션이 끊기지 않도록 여백과 버튼 밀도를 조정했습니다.',
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
    <section className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
      <Card className="hero-panel app-grid">
        <div className="space-y-6">
          <PageHeader
            eyebrow="Muse Login"
            title="뮤즈 서비스에 로그인하고 오늘의 운영 흐름을 이어가세요"
            description="공연 준비, 곡 상태 조정, 피드백 정리까지 내부 운영에 필요한 핵심 작업을 한 곳에서 이어서 관리할 수 있습니다."
            tone="inverse"
          />
          <div className="grid gap-3">
            {highlights.map((item, index) => (
              <div key={item} className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-sm font-semibold text-[#14323f]">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-7 text-slate-200">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

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
