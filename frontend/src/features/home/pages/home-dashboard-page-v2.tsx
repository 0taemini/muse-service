import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { performanceApi } from '@features/performance/api/performance-api';
import { userApi } from '@features/user/api/user-api';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';

const workflow = [
  '공연을 만들고 곡 리스트 초안을 정리합니다.',
  '곡별 상태를 확정, 후보, 제외로 조정합니다.',
  '확정 곡만 합주방으로 연결하고 라운드를 관리합니다.',
  '피드백 종합 내용을 마이페이지에 누적합니다.',
];

const shortcuts = [
  {
    title: '공연 관리',
    description: '공연 생성, 곡 등록, 세션 배정까지 실제 운영 흐름대로 이어서 작업합니다.',
    to: '/performances',
  },
  {
    title: '마이페이지',
    description: '내 계정 정보와 개인 피드백 요약을 확인하는 공간입니다.',
    to: '/me',
  },
];

export function HomeDashboardPageV2() {
  const performancesQuery = useQuery({
    queryKey: ['performances'],
    queryFn: performanceApi.getPerformances,
  });
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: userApi.getMe,
  });

  const performances = performancesQuery.data?.data ?? [];
  const me = meQuery.data?.data ?? null;
  const latestPerformance = performances[0] ?? null;
  const totalSongs = performances.reduce((sum, performance) => sum + performance.songCount, 0);

  return (
    <section className="space-y-6">
      <Card className="border-slate-900 bg-slate-900 px-6 py-7 text-white md:px-8 md:py-9">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <span className="inline-flex w-fit rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
              Muse Dashboard
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">공연 준비를 시작하는 뮤즈 운영 대시보드</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
                실제 운영 기준으로 공연 목록, 곡 선정 상태, 세션 배정, 피드백 흐름을 이어서 관리할 수 있게 구성했습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/performances">
                <Button className="min-w-[160px] bg-white text-slate-900 hover:bg-slate-100">공연 관리 열기</Button>
              </Link>
              <Link to="/me">
                <Button variant="ghost" className="min-w-[160px] border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white">
                  마이페이지
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white/10 p-5 ring-1 ring-white/12">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">현재 사용자</p>
              <p className="mt-3 text-2xl font-semibold">{me?.name ?? '불러오는 중'}</p>
              <p className="mt-2 text-sm text-slate-200">{me?.email ?? '사용자 정보를 확인하고 있습니다.'}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-5 ring-1 ring-white/12">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">등록 공연</p>
              <p className="mt-3 text-3xl font-semibold">{performances.length}</p>
              <p className="mt-2 text-sm text-slate-200">현재 관리 중인 공연 수</p>
            </div>
            <div className="rounded-xl bg-white/10 p-5 ring-1 ring-white/12">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">전체 곡</p>
              <p className="mt-3 text-3xl font-semibold">{totalSongs}</p>
              <p className="mt-2 text-sm text-slate-200">공연에 등록된 전체 곡 수</p>
            </div>
            <div className="rounded-xl bg-white/10 p-5 ring-1 ring-white/12">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">최근 공연</p>
              <p className="mt-3 text-lg font-semibold">{latestPerformance?.title ?? '아직 없음'}</p>
              <p className="mt-2 text-sm text-slate-200">
                {latestPerformance ? `곡 ${latestPerformance.songCount}개가 연결되어 있습니다.` : '먼저 공연을 하나 생성해 주세요.'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Next Actions</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">바로 이어갈 작업</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              {shortcuts.length} shortcuts
            </span>
          </div>

          <div className="mt-5 grid gap-4">
            {shortcuts.map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                <Link to={item.to} className="mt-5 inline-flex text-sm font-semibold text-slate-900 underline-offset-4 hover:underline">
                  이동하기
                </Link>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Workflow</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">뮤즈 운영 흐름</h2>
          <div className="mt-5 grid gap-3">
            {workflow.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <p className="pt-1 text-sm leading-7 text-slate-600">{step}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
