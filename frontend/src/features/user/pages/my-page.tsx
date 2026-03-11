import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userApi, UpdateProfilePayload } from '@features/user/api/user-api';
import { profileSchema } from '@features/auth/model/schemas';
import { Card } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { FormField } from '@shared/components/ui/form-field';
import { toApiMessage } from '@features/auth/api/auth-api';
import { useEffect, useState } from 'react';
import { z } from 'zod';

const formSchema = profileSchema;
type ProfileFormValues = z.infer<typeof formSchema>;

export function MyPage() {
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
    <section className="space-y-6 lg:space-y-8">
      <Card className="bg-[linear-gradient(140deg,rgba(255,255,255,0.97)_0%,rgba(238,247,255,0.94)_100%)] px-6 py-8 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6b7bda]">My Muse</p>
        <h2 className="mt-3 font-['Gaegu'] text-5xl font-bold leading-tight text-[#2b2340] md:text-6xl">
          내 계정과
          <br />
          합주 기록이 쌓일 공간,
          <br />
          마이페이지.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          지금은 기본 프로필 수정이 중심이고, 이후 공연 참여 이력과 피드백 종합이 같은 톤으로 이어질 예정입니다.
        </p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <Card className="space-y-5 bg-[#2b2340] text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#d8c3ff]">Profile Snapshot</p>
              <h3 className="mt-2 text-2xl font-semibold">내 정보</h3>
            </div>
            <div className="rounded-full bg-white/12 px-3 py-2 text-xs text-slate-200">{data?.data?.role || 'USER'}</div>
          </div>
          {isLoading ? <p className="text-sm text-slate-300">불러오는 중...</p> : null}
          {data?.data ? (
            <dl className="grid gap-4 text-sm text-slate-200">
              <div><dt className="text-slate-400">이름</dt><dd className="mt-1 text-base text-white">{data.data.name}</dd></div>
              <div><dt className="text-slate-400">기수</dt><dd className="mt-1 text-base text-white">{data.data.cohort}</dd></div>
              <div><dt className="text-slate-400">이메일</dt><dd className="mt-1 break-all text-base text-white">{data.data.email}</dd></div>
              <div><dt className="text-slate-400">닉네임</dt><dd className="mt-1 text-base text-white">{data.data.nickname}</dd></div>
              <div><dt className="text-slate-400">등급</dt><dd className="mt-1 text-base text-white">{data.data.rank}</dd></div>
            </dl>
          ) : null}
          <div className="grid gap-3 rounded-[24px] bg-white/8 p-4 text-sm text-slate-300">
            <div>공연 참여 이력: 준비 중</div>
            <div>합주 피드백 종합: 준비 중</div>
            <div>채팅 라운드 히스토리: 준비 중</div>
          </div>
        </Card>

        <Card className="space-y-5 bg-white/92">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7a63c6]">Profile Edit</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">개인정보 수정</h3>
            <p className="mt-1 text-sm text-slate-500">비밀번호 변경 시 현재 비밀번호를 함께 입력해야 합니다.</p>
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
            {serverMessage ? <p className="rounded-[22px] bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">{serverMessage}</p> : null}
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? '저장 중...' : '변경사항 저장'}
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}