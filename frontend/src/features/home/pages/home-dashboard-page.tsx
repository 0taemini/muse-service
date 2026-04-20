import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { performanceApi } from '@features/performance/api/performance-api';
import { userApi } from '@features/user/api/user-api';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';

const workflow = [
  '공연을 만들고 세트리스트 초안을 정리합니다.',
  '곡별 상태를 확정, 후보, 제외로 조정합니다.',
  '확정곡을 기준으로 합주 채팅방을 엽니다.',
  '라운드별 피드백을 모아 마이페이지에 축적합니다.',
];

const shortcuts = [
  {
    title: '공연 운영',
    description: '공연 생성, 곡 등록, 세션 컬럼 편집, 담당자 배정을 한 화면에서 처리합니다.',
    to: '/performances',
  },
  {
    title: '마이페이지',
    description: '내 계정 정보와 개인 피드백 요약을 관리합니다.',
    to: '/me',
  },
];

export function HomeDashboardPage() {
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
      <Card className="overflow-hidden bg-[linear-gradient(135deg,rgba(18,40,47,0.96)_0%,rgba(24,63,71,0.94)_58%,rgba(214,157,85,0.84)_100%)] px-6 py-7 text-white md:px-8 md:py-9">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <span className="inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#f4dfba]">
              Muse Dashboard
            </span>
            <div className="space-y-3">
              <h1 className="section-title max-w-3xl text-white">
                공연 준비를 시작하는
                <br />
                뮤즈 운영 대시보드
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
                임시 실험 화면이 아니라 실제 운영 기준으로 공연 목록, 세트리스트, 세션 배정, 피드백 흐름을 바로 이어갈 수 있도록 재구성하는 단계입니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/performances">
                <Button className="min-w-[160px]">공연 운영 열기</Button>
              </Link>
              <Link to="/me">
                <Button variant="ghost" className="min-w-[160px] bg-white/12 text-white ring-white/20 hover:bg-white/18 hover:text-white">
                  마이페이지
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[26px] bg-white/10 p-5 ring-1 ring-white/12">
              <p className="text-xs uppercase tracking-[0.24em] text-[#f4dfba]">현재 사용자</p>
              <p className="mt-3 text-2xl font-semibold">{me?.name ?? '불러오는 중'}</p>
              <p className="mt-2 text-sm text-slate-200">{me?.email ?? '사용자 정보를 확인하고 있습니다.'}</p>
            </div>
            <div className="rounded-[26px] bg-white/10 p-5 ring-1 ring-white/12">
              <p className="text-xs uppercase tracking-[0.24em] text-[#f4dfba]">등록 공연</p>
              <p className="mt-3 text-3xl font-semibold">{performances.length}</p>
              <p className="mt-2 text-sm text-slate-200">운영 중인 공연 수</p>
            </div>
            <div className="rounded-[26px] bg-white/10 p-5 ring-1 ring-white/12">
              <p className="text-xs uppercase tracking-[0.24em] text-[#f4dfba]">총 곡 수</p>
              <p className="mt-3 text-3xl font-semibold">{totalSongs}</p>
              <p className="mt-2 text-sm text-slate-200">전체 세트리스트 누적 기준</p>
            </div>
            <div className="rounded-[26px] bg-white/10 p-5 ring-1 ring-white/12">
              <p className="text-xs uppercase tracking-[0.24em] text-[#f4dfba]">최근 공연</p>
              <p className="mt-3 text-lg font-semibold">{latestPerformance?.title ?? '아직 없음'}</p>
              <p className="mt-2 text-sm text-slate-200">
                {latestPerformance ? `곡 ${latestPerformance.songCount}개가 연결되어 있습니다.` : '먼저 공연을 하나 생성하세요.'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a6b2f]">Next Actions</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">지금 바로 이어갈 작업</h2>
            </div>
            <span className="rounded-full bg-[#f3ecdf] px-3 py-1 text-xs font-semibold text-[#7f5723] ring-1 ring-[#e1d2bb]">
              {shortcuts.length} shortcuts
            </span>
          </div>

          <div className="mt-5 grid gap-4">
            {shortcuts.map((item) => (
              <div key={item.title} className="rounded-[26px] border border-[#e8dfcf] bg-[#fcfaf4] p-5">
                <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                <Link to={item.to} className="mt-5 inline-flex text-sm font-semibold text-[#9a6b2f] underline-offset-4 hover:underline">
                  열기
                </Link>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(248,244,236,0.98)_100%)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a6b2f]">Workflow</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">뮤즈 운영 흐름</h2>
          <div className="mt-5 grid gap-3">
            {workflow.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-[24px] bg-white px-4 py-4 ring-1 ring-[#e6ddcf]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[#14323f] text-sm font-semibold text-white">
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
