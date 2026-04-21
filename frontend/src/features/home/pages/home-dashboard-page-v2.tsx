import { Link } from 'react-router-dom';
import { useAuthStore } from '@features/auth/store/auth-store';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';

const heroHighlights = ['공연 목차', '곡 상태 관리', '확정 곡 합주방', '라운드 피드백'];

const featureBlocks = [
  {
    eyebrow: 'Performance Setup',
    title: '공연 준비 흐름을 먼저 정리합니다',
    description:
      '공연을 만들고 곡 리스트를 정리하면서 어떤 곡이 다음 단계로 넘어갈지 빠르게 판단할 수 있습니다. 복잡한 운영 과정을 하나의 흐름으로 묶어 둔 것이 뮤즈 서비스의 핵심입니다.',
    points: ['공연별 곡 리스트 구성', '확정, 후보, 제외 상태 관리', '세션 배정 흐름까지 자연스럽게 연결'],
  },
  {
    eyebrow: 'Feedback Loop',
    title: '합주 피드백은 라운드 기준으로 쌓입니다',
    description:
      '채팅을 지우는 대신 라운드를 새로 열어 이번 합주 기준으로 메시지를 분리합니다. 확정 곡만 합주방으로 이어지고, 라운드가 끝나면 종합 내용을 다시 마이페이지에서 확인할 수 있습니다.',
    points: ['확정 곡 중심의 채팅방 생성', '메시지 삭제 대신 라운드 분리', '피드백 종합 후 마이페이지에서 재확인'],
  },
];

const journeySteps = [
  {
    title: '공연 생성',
    copy: '이번 공연의 큰 목차를 만들고 필요한 곡 리스트를 붙여 넣습니다.',
  },
  {
    title: '곡 상태 정리',
    copy: '곡을 확정, 후보, 제외 상태로 나누면서 다음 단계로 이어질 대상을 정리합니다.',
  },
  {
    title: '합주와 피드백',
    copy: '확정 곡만 대상으로 합주방을 열고 라운드별 피드백을 차곡차곡 쌓습니다.',
  },
];

function ProductPreview() {
  return (
    <div className="relative">
      <div className="absolute -left-6 top-10 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(108,87,208,0.18)_0%,rgba(108,87,208,0)_72%)]" />
      <div className="absolute -right-4 top-0 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(255,212,189,0.78)_0%,rgba(255,212,189,0)_72%)]" />

      <div className="relative rounded-[30px] border border-[rgba(95,75,182,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99)_0%,rgba(248,244,255,0.95)_100%)] p-4 shadow-[0_22px_48px_rgba(90,67,186,0.1)] md:p-5">
        <div className="flex items-center justify-between gap-3 border-b border-[rgba(95,75,182,0.08)] pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#7a67c7]">Muse Flow</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#241b42]">봄 공연 준비</h2>
          </div>
          <span className="rounded-full bg-[#241b42] px-3 py-2 text-xs font-semibold text-white">진행 중</span>
        </div>

        <div className="mt-4 grid gap-3">
          {[
            { title: '곡 리스트 정리', copy: '확정 곡과 후보 곡을 구분해 다음 흐름을 정리합니다.' },
            { title: '합주방 생성', copy: '확정 곡만 골라 전체 또는 부분 선택으로 채팅방을 엽니다.' },
            { title: '라운드 종합', copy: '이번 합주 피드백을 종합해 개인 화면에서 다시 확인합니다.' },
          ].map((item, index) => (
            <div
              key={item.title}
              className="flex items-start gap-3 rounded-[22px] border border-[rgba(95,75,182,0.08)] bg-white px-4 py-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f3eeff] text-sm font-semibold text-[#5a43ba]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="font-semibold text-[#241b42]">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-[#6f678b]">{item.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureBlock({
  eyebrow,
  title,
  description,
  points,
}: {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
}) {
  return (
    <Card className="border-[rgba(95,75,182,0.12)] bg-white px-5 py-6 shadow-[0_18px_44px_rgba(90,67,186,0.08)] md:px-8 md:py-8">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr] xl:items-start">
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7a67c7]">{eyebrow}</p>
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-[#241b42] md:text-[2.2rem]">
            {title}
          </h2>
          <p className="max-w-xl text-sm leading-7 text-[#6f678b] md:text-base">{description}</p>
        </div>

        <div className="grid gap-3">
          {points.map((point) => (
            <div
              key={point}
              className="flex items-center gap-3 rounded-[22px] border border-[rgba(95,75,182,0.08)] bg-[#faf8ff] px-4 py-4 text-sm text-[#4c436d]"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[#6a54c8]" />
              <span>{point}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function HomeDashboardPageV2() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = Boolean(accessToken);

  const primaryAction = isAuthenticated
    ? { to: '/performances', label: '공연 관리 시작' }
    : { to: '/signup', label: '뮤즈 시작하기' };

  const secondaryAction = isAuthenticated
    ? { to: '/me', label: '마이페이지 보기' }
    : { to: '/login', label: '로그인하기' };

  return (
    <section className="space-y-6 md:space-y-8">
      <Card className="relative overflow-hidden border-[rgba(95,75,182,0.12)] bg-white px-5 py-6 shadow-[0_24px_60px_rgba(90,67,186,0.08)] md:px-8 md:py-8">
        <div className="absolute -right-16 top-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(255,218,197,0.9)_0%,rgba(255,218,197,0)_72%)]" />
        <div className="absolute left-[-2rem] top-[-3rem] h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(120,96,220,0.16)_0%,rgba(120,96,220,0)_74%)]" />

        <div className="relative grid gap-8 xl:grid-cols-[1fr_0.9fr] xl:items-center">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7a67c7]">Muse Main Page</p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[#241b42] md:text-[3.7rem] md:leading-[1.06]">
                공연 운영 흐름을
                <br />
                더 단순하고 선명하게
                <br />
                소개합니다
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[#6f678b] md:text-base">
                뮤즈 서비스는 공연 생성, 곡 상태 관리, 확정 곡 합주방, 피드백 종합까지 이어지는 운영 흐름을 한 곳에 정리합니다. 메인 페이지에서는 그 핵심 구조만 간결하게 보여줍니다.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to={primaryAction.to} className="w-full sm:w-auto">
                <Button className="w-full min-w-[180px]">{primaryAction.label}</Button>
              </Link>
              <Link to={secondaryAction.to} className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full min-w-[180px]">
                  {secondaryAction.label}
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              {heroHighlights.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[rgba(95,75,182,0.12)] bg-white px-3 py-2 text-xs font-semibold text-[#4e3b9d]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <ProductPreview />
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {featureBlocks.map((block) => (
          <FeatureBlock
            key={block.title}
            eyebrow={block.eyebrow}
            title={block.title}
            description={block.description}
            points={block.points}
          />
        ))}
      </div>

      <Card className="border-[rgba(95,75,182,0.12)] bg-[linear-gradient(180deg,#ffffff_0%,#f7f3ff_100%)] px-5 py-6 shadow-[0_18px_44px_rgba(90,67,186,0.08)] md:px-8 md:py-8">
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr] xl:items-end">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7a67c7]">Journey</p>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-[#241b42] md:text-[2.3rem]">
              필요한 화면으로 자연스럽게 이어집니다
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-[#6f678b] md:text-base">
              메인에서는 흐름을 이해하고, 실제 운영은 공연 관리와 마이페이지에서 이어집니다. 설명을 최소화하고 이동해야 할 다음 단계만 남겼습니다.
            </p>
          </div>

          <div className="grid gap-3">
            {journeySteps.map((step, index) => (
              <div
                key={step.title}
                className="flex items-start gap-4 rounded-[24px] border border-[rgba(95,75,182,0.08)] bg-white px-4 py-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#241b42] text-sm font-semibold text-white">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="text-base font-semibold text-[#241b42]">{step.title}</p>
                  <p className="mt-2 text-sm leading-7 text-[#6f678b]">{step.copy}</p>
                </div>
              </div>
            ))}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Link to={primaryAction.to} className="w-full sm:w-auto">
                <Button className="w-full min-w-[180px]">{primaryAction.label}</Button>
              </Link>
              <Link to={secondaryAction.to} className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full min-w-[180px]">
                  {secondaryAction.label}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
