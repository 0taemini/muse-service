import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import type { UserRank } from '@entities/user/model/user.types';
import { userApi, type UpdateProfilePayload } from '@features/user/api/user-api';
import { profileSchemaFixed } from '@features/auth/model/schemas-fixed';
import { Card } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { FormField } from '@shared/components/ui/form-field';
import { toApiMessage } from '@features/auth/api/auth-api';
import { InlineNotice } from '@shared/components/ui/inline-notice';
import { StatePanel } from '@shared/components/ui/state-panel';
import { cn } from '@shared/lib/cn';

const formSchema = profileSchemaFixed;
type ProfileFormValues = z.infer<typeof formSchema>;

const rankOptions: { value: UserRank; label: string }[] = [
  { value: 'NEWBIE', label: '신입' },
  { value: 'ACTIVE', label: '현역' },
  { value: 'YB', label: 'YB' },
  { value: 'OB', label: 'OB' },
];

const getRankLabel = (rank: UserRank) => rankOptions.find((option) => option.value === rank)?.label ?? rank;

export function MyPageV2() {
  const [searchParams] = useSearchParams();
  const activeTab = useMemo(
    () => (searchParams.get('tab') === 'feedback' ? 'feedback' : 'profile'),
    [searchParams],
  );

  const queryClient = useQueryClient();
  const rankMenuRef = useRef<HTMLDivElement | null>(null);
  const [serverMessage, setServerMessage] = useState('');
  const [isRankMenuOpen, setIsRankMenuOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: userApi.getMe,
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      cohort: undefined,
      rank: 'NEWBIE',
      currentPassword: '',
      password: '',
    },
  });

  useEffect(() => {
    if (data?.data) {
      form.reset({
        email: data.data.email,
        cohort: data.data.cohort,
        rank: data.data.rank ?? 'NEWBIE',
        currentPassword: '',
        password: '',
      });
    }
  }, [data, form]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rankMenuRef.current?.contains(event.target as Node)) {
        setIsRankMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => userApi.updateMe(payload),
    onSuccess: (response) => {
      setServerMessage(response.message);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      form.reset({
        email: response.data.email,
        cohort: response.data.cohort,
        rank: response.data.rank ?? 'NEWBIE',
        currentPassword: '',
        password: '',
      });
      setIsRankMenuOpen(false);
    },
    onError: (error) => setServerMessage(toApiMessage(error)),
  });

  const handleSubmit = form.handleSubmit((values) => {
    const payload: UpdateProfilePayload = {};

    if (values.email) {
      payload.email = values.email;
    }

    if (values.cohort) {
      payload.cohort = Number(values.cohort);
    }

    if (values.rank) {
      payload.rank = values.rank;
    }

    if (values.password) {
      payload.currentPassword = values.currentPassword || '';
      payload.password = values.password;
    }

    updateMutation.mutate(payload);
  });

  const me = data?.data ?? null;
  const selectedRank = form.watch('rank') ?? 'NEWBIE';
  const selectedRankLabel = getRankLabel(selectedRank);

  return (
    <section className="mx-auto w-full max-w-[640px] space-y-6">
      {activeTab === 'profile' ? (
        <Card className="space-y-6">
          <div className="space-y-2">
            <p className="section-kicker">Profile Edit</p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">개인정보 수정</h2>
            <p className="text-sm leading-7 text-slate-500">
              이메일, 기수, 등급, 비밀번호를 한 곳에서 정리해 수정할 수 있습니다.
            </p>
          </div>

          {!me && !isLoading ? (
            <StatePanel
              title="계정 정보를 불러오지 못했습니다."
              description="잠시 후 다시 시도해 주세요. 문제가 계속되면 운영진에게 알려 주세요."
              tone="danger"
            />
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <FormField label="이메일" error={form.formState.errors.email?.message}>
              <Input type="email" placeholder="muse@example.com" {...form.register('email')} />
            </FormField>

            <FormField label="기수" error={form.formState.errors.cohort?.message?.toString()}>
              <Input type="number" placeholder="예: 35" {...form.register('cohort', { valueAsNumber: true })} />
            </FormField>

            <FormField label="등급" error={form.formState.errors.rank?.message?.toString()}>
              <div ref={rankMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsRankMenuOpen((prev) => !prev)}
                  className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-[rgba(95,75,182,0.16)] bg-white px-4 py-3 text-left text-sm font-semibold text-[#35285f] transition duration-200 hover:bg-[#faf8ff]"
                >
                  <span>{selectedRankLabel}</span>
                  <span
                    className={cn(
                      'text-xs text-[#6f678b] transition duration-200',
                      isRankMenuOpen ? 'rotate-180' : '',
                    )}
                  >
                    ▼
                  </span>
                </button>

                {isRankMenuOpen ? (
                  <div className="absolute left-0 right-0 top-full z-[60] mt-3 overflow-hidden rounded-2xl border border-[rgba(95,75,182,0.12)] bg-white shadow-[0_18px_36px_rgba(90,67,186,0.12)]">
                    {rankOptions.map((option, index) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          form.setValue('rank', option.value, { shouldDirty: true, shouldValidate: true });
                          setIsRankMenuOpen(false);
                        }}
                        className={cn(
                          'flex min-h-12 w-full items-center px-4 py-3 text-left text-sm font-semibold transition duration-200',
                          index !== rankOptions.length - 1 && 'border-b border-[rgba(95,75,182,0.08)]',
                          selectedRank === option.value
                            ? 'bg-[#f3efff] text-[#35285f]'
                            : 'text-[#6f678b] hover:bg-[#faf8ff] hover:text-[#35285f]',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </FormField>

            <FormField
              label="현재 비밀번호"
              error={form.formState.errors.currentPassword?.message}
              hint="비밀번호를 변경할 때만 입력하면 됩니다."
            >
              <Input type="password" placeholder="현재 비밀번호 입력" {...form.register('currentPassword')} />
            </FormField>

            <FormField label="새 비밀번호" error={form.formState.errors.password?.message}>
              <Input type="password" placeholder="새 비밀번호 입력" {...form.register('password')} />
            </FormField>

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
      ) : (
        <Card className="space-y-6">
          <div className="space-y-2">
            <p className="section-kicker">Feedback</p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">피드백 확인</h2>
            <p className="text-sm leading-7 text-slate-500">
              공연별 라운드 피드백과 개인 요약 내용을 한 곳에서 보기 쉽게 정리할 예정입니다.
            </p>
          </div>

          <StatePanel
            title="피드백 확인 기능 준비 중"
            description="라운드 요약과 개인 피드백 조회 기능이 연결되면 이곳에서 바로 확인할 수 있습니다."
            tone="accent"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-[rgba(95,75,182,0.12)] bg-[#faf8ff] p-5">
              <p className="text-sm font-semibold text-[#4e3b9d]">최근 피드백</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                최근 합주 라운드 기준 요약과 개선 포인트가 이 영역에 표시되도록 준비하고 있습니다.
              </p>
            </div>

            <div className="rounded-[24px] border border-[rgba(95,75,182,0.12)] bg-[#faf8ff] p-5">
              <p className="text-sm font-semibold text-[#4e3b9d]">공연별 정리</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                공연별로 누적된 피드백을 정리해서 빠르게 찾아볼 수 있도록 준비하고 있습니다.
              </p>
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}
