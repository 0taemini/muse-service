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

  return (
    <section className="space-y-6">
      <Card className="px-6 py-8 md:px-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">My Page</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">마이페이지</h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
            계정 정보와 기본 설정을 관리하는 화면입니다. 이후 라운드별 피드백 요약과 개인 기록도 이곳에 연결됩니다.
          </p>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="space-y-5 border-slate-900 bg-slate-900 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Profile Snapshot</p>
              <h2 className="mt-2 text-2xl font-semibold">기본 정보</h2>
            </div>
            <div className="rounded-full bg-white/10 px-3 py-2 text-xs text-slate-200">{data?.data?.role || 'USER'}</div>
          </div>
          {isLoading ? <p className="text-sm text-slate-300">사용자 정보를 불러오는 중입니다.</p> : null}
          {data?.data ? (
            <dl className="grid gap-4 text-sm text-slate-200">
              <div>
                <dt className="text-slate-400">이름</dt>
                <dd className="mt-1 text-base text-white">{data.data.name}</dd>
              </div>
              <div>
                <dt className="text-slate-400">기수</dt>
                <dd className="mt-1 text-base text-white">{data.data.cohort}</dd>
              </div>
              <div>
                <dt className="text-slate-400">이메일</dt>
                <dd className="mt-1 break-all text-base text-white">{data.data.email}</dd>
              </div>
              <div>
                <dt className="text-slate-400">닉네임</dt>
                <dd className="mt-1 text-base text-white">{data.data.nickname}</dd>
              </div>
              <div>
                <dt className="text-slate-400">등급</dt>
                <dd className="mt-1 text-base text-white">{data.data.rank}</dd>
              </div>
            </dl>
          ) : null}
          <div className="grid gap-3 rounded-xl bg-white/5 p-4 text-sm text-slate-300">
            <div>공연 참여 이력: 준비 중</div>
            <div>합주 피드백 요약: 준비 중</div>
            <div>채팅 라운드 히스토리: 준비 중</div>
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Profile Edit</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">개인정보 수정</h2>
            <p className="mt-1 text-sm text-slate-500">비밀번호를 변경할 때는 현재 비밀번호를 함께 입력해 주세요.</p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="이메일" error={form.formState.errors.email?.message}>
                <Input type="email" {...form.register('email')} />
              </FormField>
              <FormField label="기수" error={form.formState.errors.cohort?.message?.toString()}>
                <Input type="number" {...form.register('cohort', { valueAsNumber: true })} />
              </FormField>
              <FormField label="현재 비밀번호" error={form.formState.errors.currentPassword?.message}>
                <Input type="password" {...form.register('currentPassword')} />
              </FormField>
              <FormField label="새 비밀번호" error={form.formState.errors.password?.message}>
                <Input type="password" {...form.register('password')} />
              </FormField>
            </div>
            {serverMessage ? (
              <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">{serverMessage}</p>
            ) : null}
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? '저장 중...' : '변경사항 저장'}
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}
