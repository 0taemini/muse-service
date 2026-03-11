import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@features/auth/store/auth-store';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';

const quickLinks = [
  {
    title: '마이페이지',
    body: '내 계정과 앞으로 쌓이는 피드백 기록을 확인합니다.',
    to: '/me',
    tone: 'bg-[#f3efff]',
  },
  {
    title: '테스트 랩',
    body: '토큰 상태와 API 응답을 검증하는 개발 전용 공간입니다.',
    to: '/test',
    tone: 'bg-[#eef3ff]',
  },
];

const workflow = [
  '공연을 만들고 테마와 무대 순서를 정합니다.',
  '곡 후보를 모아 확정, 후보, 제외 상태로 정리합니다.',
  '확정 곡만 합주방으로 연결해 라운드별 피드백을 쌓습니다.',
  '종합된 피드백은 마이페이지에서 다시 확인합니다.',
];

const upcomingFeatures = [
  '공연 목차 생성/목록/상세',
  '공연별 곡 리스트 CRUD와 상태 변경',
  '확정곡 기반 합주방 생성',
  '라운드 리셋 + 피드백 종합 저장',
];

export function HomePage() {
  const userEmail = useAuthStore((state) => state.userEmail);

  return (
    <section className="space-y-8 lg:space-y-10">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="relative overflow-hidden bg-[linear-gradient(140deg,rgba(255,255,255,0.97)_0%,rgba(242,233,255,0.95)_50%,rgba(228,218,255,0.9)_100%)] px-6 py-8 md:px-8 md:py-10">
          <div className="absolute -left-12 top-12 h-44 w-44 rounded-full bg-[#ccb6ff]/55 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-[#f0b9ea]/36 blur-3xl" />
          <div className="relative space-y-6">
            <div className="inline-flex w-fit rounded-full bg-white/84 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#8b6de0] ring-1 ring-white/80">
              Muse Jam Home
            </div>
            <div>
              <h1 className="max-w-3xl font-['Gaegu'] text-5xl font-bold leading-[1.04] text-[#2b2340] md:text-7xl">
                오늘 리허설,
                <br />
                이번 공연 세트리스트,
                <br />
                여기서 같이 맞춰요.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                로그인된 동아리원만 접근 가능한 내부 홈입니다. 공연 관리, 곡 후보, 합주 피드백 기능이 이 흐름 위에 붙도록 구성했습니다.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[26px] bg-[#2b2340] px-5 py-5 text-white shadow-[0_18px_36px_rgba(43,35,64,0.22)]">
                <p className="text-xs uppercase tracking-[0.24em] text-[#d8c3ff]">Session</p>
                <p className="mt-3 break-all text-lg font-semibold">{userEmail || '로그인 사용자'}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">현재 세션 기준으로 공연 준비와 피드백 기록이 이어집니다.</p>
              </div>
              <div className="rounded-[26px] bg-white/86 px-5 py-5 ring-1 ring-white/80">
                <p className="text-xs uppercase tracking-[0.24em] text-[#8b6de0]">Band Mood</p>
                <p className="mt-3 text-lg font-semibold text-slate-900">연보라 무드의 동아리 포털</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">딱딱한 업무툴보다, 실제 합주 감성에 맞춘 UI를 목표로 했습니다.</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="bg-[#2b2340] text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d8c3ff]">Quick Start</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight">지금 필요한 화면으로 바로 이동</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              개인 정보 수정, 검증용 페이지 접근, 이후 공연/곡/합주방 메뉴까지 같은 톤으로 확장되도록 홈을 구성했습니다.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <NavLink to="/me">
                <Button variant="secondary" className="min-w-[150px] bg-white text-[#2b2340] hover:bg-white/92">
                  마이페이지
                </Button>
              </NavLink>
              <NavLink to="/test">
                <Button variant="ghost" className="min-w-[150px] bg-white/12 text-white ring-white/20 hover:bg-white/16 hover:text-white">
                  테스트 랩
                </Button>
              </NavLink>
            </div>
          </Card>

          <Card className="bg-white/90">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b6de0]">Coming Soon</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-600">
              {upcomingFeatures.map((item) => (
                <div key={item} className="rounded-[22px] bg-[#f3efff] px-4 py-3 ring-1 ring-[#ebe2ff]">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
        <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(245,239,255,0.94)_100%)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b6de0]">Workflow</p>
          <h2 className="mt-3 font-['Gaegu'] text-4xl font-bold leading-tight text-[#2b2340] md:text-5xl">
            뮤즈 운영 흐름을
            <br />
            앱 안에 그대로 담습니다.
          </h2>
          <div className="mt-6 space-y-4">
            {workflow.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-[24px] bg-white/88 px-4 py-4 ring-1 ring-[#e9e1ff]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[#2b2340] text-sm font-semibold text-white">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <p className="pt-1 text-sm leading-7 text-slate-600">{step}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {quickLinks.map((item) => (
            <Card key={item.title} className={`${item.tone} border-transparent`}>
              <div className="mb-4 inline-flex rounded-full bg-white/84 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#7a63c6]">
                Quick Link
              </div>
              <h3 className="text-2xl font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
              <NavLink to={item.to} className="mt-6 inline-flex text-sm font-semibold text-[#7a63c6] underline-offset-4 hover:underline">
                바로 가기
              </NavLink>
            </Card>
          ))}
          <Card className="border-transparent bg-[#ece7ff] md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5e4ca5]">Setlist Roadmap</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">공연, 선곡, 합주방 기능을 같은 UX 언어로 이어갑니다.</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              지금은 회원 기능 중심이지만, 다음 단계에서 공연 도메인과 채팅 도메인을 이 홈 레이아웃에 맞춰 연결할 예정입니다.
            </p>
          </Card>
        </div>
      </section>
    </section>
  );
}