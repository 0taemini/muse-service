import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { userApi, type UpdateProfilePayload } from '@features/user/api/user-api';
import { profileSchemaFixed } from '@features/auth/model/schemas-fixed';
import { Card } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { FormField } from '@shared/components/ui/form-field';
import { toApiMessage } from '@features/auth/api/auth-api';
import { InlineNotice } from '@shared/components/ui/inline-notice';
import { PageHeader } from '@shared/components/ui/page-header';
import { StatePanel } from '@shared/components/ui/state-panel';

const formSchema = profileSchemaFixed;
type ProfileFormValues = z.infer<typeof formSchema>;

export function MyPageV2() {
  const queryClient = useQueryClient();
  const [serverMessage, setServerMessage] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: userApi.getMe,
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      cohort: undefined,
      currentPassword: '',
      password: '',
    },
  });

  useEffect(() => {
    if (data?.data) {
      form.reset({
        email: data.data.email,
        cohort: data.data.cohort,
        currentPassword: '',
        password: '',
      });
    }
  }, [data, form]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => userApi.updateMe(payload),
    onSuccess: (response) => {
      setServerMessage(response.message);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      form.reset({
        email: response.data.email,
        cohort: response.data.cohort,
        currentPassword: '',
        password: '',
      });
    },
    onError: (error) => setServerMessage(toApiMessage(error)),
  });

  const handleSubmit = form.handleSubmit((values) => {
    const payload: UpdateProfilePayload = {};
    if (values.email) payload.email = values.email;
    if (values.cohort) payload.cohort = Number(values.cohort);
    if (values.password) {
      payload.currentPassword = values.currentPassword || '';
      payload.password = values.password;
    }
    updateMutation.mutate(payload);
  });

  const me = data?.data ?? null;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="My Page"
        title="내 계정과 기록을 한눈에 확인하세요"
        description="계정 기본 정보와 비밀번호 변경 흐름을 같은 화면에서 관리하고, 이후 피드백 요약 영역이 자연스럽게 붙을 수 있도록 구조를 정리했습니다."
      />

      <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <Card className="bg-[#14323f] text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Profile Snapshot</p>
              <h2 className="mt-2 text-2xl font-semibold">기본 정보</h2>
            </div>
            <div className="rounded-full bg-white/10 px-3 py-2 text-xs text-slate-200">
              {me?.role || 'USER'}
            </div>
          </div>

          {isLoading ? (
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 rounded-[20px] bg-white/10" />
              ))}
            </div>
          ) : null}

          {me ? (
            <dl className="mt-5 grid gap-3">
              <div className="rounded-[22px] bg-white/8 p-4 ring-1 ring-white/8">
                <dt className="text-sm text-slate-300">이름</dt>
                <dd className="mt-1 text-lg font-semibold text-white">{me.name}</dd>
              </div>
              <div className="rounded-[22px] bg-white/8 p-4 ring-1 ring-white/8">
                <dt className="text-sm text-slate-300">기수</dt>
                <dd className="mt-1 text-lg font-semibold text-white">{me.cohort}</dd>
              </div>
              <div className="rounded-[22px] bg-white/8 p-4 ring-1 ring-white/8">
                <dt className="text-sm text-slate-300">이메일</dt>
                <dd className="mt-1 break-all text-lg font-semibold text-white">{me.email}</dd>
              </div>
              <div className="rounded-[22px] bg-white/8 p-4 ring-1 ring-white/8">
                <dt className="text-sm text-slate-300">닉네임</dt>
                <dd className="mt-1 text-lg font-semibold text-white">{me.nickname}</dd>
              </div>
              <div className="rounded-[22px] bg-white/8 p-4 ring-1 ring-white/8">
                <dt className="text-sm text-slate-300">등급</dt>
                <dd className="mt-1 text-lg font-semibold text-white">{me.rank}</dd>
              </div>
            </dl>
          ) : null}

          <div className="mt-5 grid gap-3 rounded-[24px] bg-white/6 p-4 text-sm text-slate-300">
            <div>공연 참여 이력: 준비 중</div>
            <div>라운드 피드백 요약: 준비 중</div>
            <div>채팅 라운드 히스토리: 준비 중</div>
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="section-kicker">Profile Edit</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">개인정보 수정</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              비밀번호를 변경할 때는 현재 비밀번호를 함께 입력해야 합니다. 자주 바꾸는 항목이 위쪽에 오도록 배치했습니다.
            </p>
          </div>

          {!me && !isLoading ? (
            <StatePanel
              title="계정 정보를 불러오지 못했습니다"
              description="잠시 후 다시 시도하거나 새로고침한 뒤 다시 접근해 주세요."
              tone="danger"
            />
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="이메일" error={form.formState.errors.email?.message}>
                <Input type="email" placeholder="muse@example.com" {...form.register('email')} />
              </FormField>
              <FormField label="기수" error={form.formState.errors.cohort?.message?.toString()}>
                <Input type="number" placeholder="예: 12" {...form.register('cohort', { valueAsNumber: true })} />
              </FormField>
              <FormField
                label="현재 비밀번호"
                error={form.formState.errors.currentPassword?.message}
                hint="새 비밀번호를 설정할 때만 입력하면 됩니다."
              >
                <Input type="password" placeholder="현재 비밀번호 입력" {...form.register('currentPassword')} />
              </FormField>
              <FormField label="새 비밀번호" error={form.formState.errors.password?.message}>
                <Input type="password" placeholder="새 비밀번호 입력" {...form.register('password')} />
              </FormField>
            </div>

            {serverMessage ? (
              <InlineNotice tone={updateMutation.isError ? 'error' : 'success'}>{serverMessage}</InlineNotice>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? '변경 사항 저장 중...' : '변경 사항 저장'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </section>
  );
}
