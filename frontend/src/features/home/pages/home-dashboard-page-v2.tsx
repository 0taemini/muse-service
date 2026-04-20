import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { performanceApi } from '@features/performance/api/performance-api';
import { userApi } from '@features/user/api/user-api';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';
import { PageHeader } from '@shared/components/ui/page-header';
import { StatCard } from '@shared/components/ui/stat-card';
import { StatePanel } from '@shared/components/ui/state-panel';

const workflow = [
  '공연을 만들고 곡 리스트를 정리해 준비 흐름의 시작점을 만듭니다.',
  '곡마다 선곡 상태를 확정, 후보, 제외로 나눠 팀 기준을 분명히 맞춥니다.',
  '확정 곡만 합주 피드백 대상으로 묶어 채팅과 라운드 관리를 이어갑니다.',
  '라운드별 피드백을 정리해 마이페이지에 누적 기록으로 남깁니다.',
];

const shortcuts = [
  {
    title: '공연 관리',
    description: '공연 생성, 곡 등록, 세션 배정까지 한 화면 흐름으로 이어서 관리합니다.',
    to: '/performances',
  },
  {
    title: '마이페이지',
    description: '내 계정 정보와 개인 피드백 기록을 확인하고 정리할 수 있습니다.',
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
      <Card className="hero-panel app-grid">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <PageHeader
              eyebrow="Muse Dashboard"
              title={`${me?.name ?? '뮤즈 팀원'}님, 오늘도 공연 준비 흐름을 이어가볼까요?`}
              description="공연, 곡 상태, 세션 배정, 피드백 기록까지 운영에 필요한 흐름을 한 화면 감각으로 정리했습니다."
              tone="inverse"
              actions={
                <>
                  <Link to="/performances">
                    <Button className="min-w-[160px] bg-white text-[#14323f] hover:bg-[#f5f7f8]">
                      공연 관리 열기
                    </Button>
                  </Link>
                  <Link to="/me">
                    <Button
                      variant="ghost"
                      className="min-w-[160px] border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                    >
                      마이페이지
                    </Button>
                  </Link>
                </>
              }
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label="현재 사용자"
              value={me?.name ?? '불러오는 중'}
              description={me?.email ?? '계정 정보를 확인하고 있습니다.'}
              tone="inverse"
            />
            <StatCard
              label="등록된 공연"
              value={performances.length}
              description="현재 관리 중인 공연 수"
              tone="inverse"
            />
            <StatCard
              label="전체 곡 수"
              value={totalSongs}
              description="모든 공연에 등록된 곡 합계"
              tone="inverse"
            />
            <StatCard
              label="최근 공연"
              value={latestPerformance?.title ?? '아직 없음'}
              description={
                latestPerformance
                  ? `곡 ${latestPerformance.songCount}개가 연결되어 있습니다.`
                  : '먼저 공연 하나를 생성해 작업 흐름을 시작해보세요.'
              }
              tone="inverse"
              className="text-left"
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Next Actions</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">바로 이어갈 작업</h2>
            </div>
            <span className="sticker">{shortcuts.length} shortcuts</span>
          </div>

          <div className="mt-5 grid gap-4">
            {shortcuts.map((item) => (
              <div key={item.title} className="panel-muted">
                <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                <Link
                  to={item.to}
                  className="mt-5 inline-flex text-sm font-semibold text-[#14323f] underline-offset-4 hover:underline"
                >
                  이동하기
                </Link>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="section-kicker">Workflow</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">뮤즈 운영 흐름</h2>
          <div className="mt-5 grid gap-3">
            {workflow.map((step, index) => (
              <div key={step} className="panel-muted flex gap-4 px-4 py-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#14323f] text-sm font-semibold text-white">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <p className="pt-1 text-sm leading-7 text-slate-600">{step}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {!performancesQuery.isLoading && performances.length === 0 ? (
        <StatePanel
          title="아직 등록된 공연이 없습니다"
          description="첫 공연을 만들면 곡 등록, 상태 분류, 세션 배정, 피드백 채팅 흐름이 이어집니다."
          action={
            <Link to="/performances">
              <Button>공연 만들러 가기</Button>
            </Link>
          }
          tone="accent"
        />
      ) : null}
    </section>
  );
}
