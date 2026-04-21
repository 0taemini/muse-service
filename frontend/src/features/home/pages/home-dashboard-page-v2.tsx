import { Link } from 'react-router-dom';
import { useAuthStore } from '@features/auth/store/auth-store';
import {
  galleryPhotos,
  heroContent,
  introKeywords,
  scheduleItems,
  videoItems,
} from '@features/home/data/home-temp-content';
import { Button } from '@shared/components/ui/button';

function SectionTitle({
  title,
}: {
  title: string;
}) {
  return (
    <h2 className="text-[2rem] font-semibold tracking-tight text-[#241b42] md:text-[2.35rem]">{title}</h2>
  );
}

export function HomeDashboardPageV2() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = Boolean(accessToken);

  return (
    <section className="space-y-12 md:space-y-16">
      <section className="rounded-[32px] border border-[rgba(95,75,182,0.08)] bg-white px-5 py-6 shadow-[0_14px_34px_rgba(52,35,110,0.05)] md:px-8 md:py-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="max-w-3xl text-[2.7rem] font-semibold tracking-tight text-[#241b42] md:text-[4.4rem] md:leading-[1.02]">
              {heroContent.title}
            </h1>
            <div className="max-w-3xl space-y-2 text-base leading-8 text-[#6f678b] md:text-[1.18rem] md:leading-9">
              {heroContent.descriptionLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {introKeywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-[rgba(95,75,182,0.1)] bg-[#fbfaff] px-3 py-2 text-xs font-medium text-[#4e3b9d]"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <SectionTitle title="뮤즈의 순간들" />

        <div className="grid gap-4 md:grid-cols-3">
          {galleryPhotos.map((photo) => (
            <figure
              key={photo.title}
              className="overflow-hidden rounded-[28px] border border-[rgba(95,75,182,0.08)] bg-white shadow-[0_12px_28px_rgba(52,35,110,0.05)]"
            >
              <img src={photo.src} alt={photo.alt} className="h-[260px] w-full object-cover" />
              <figcaption className="space-y-2 px-4 py-4">
                <p className="text-lg font-semibold text-[#241b42]">{photo.title}</p>
                <p className="text-sm leading-6 text-[#6f678b]">{photo.caption}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <SectionTitle title="일정" />

          <div className="overflow-hidden rounded-[28px] border border-[rgba(95,75,182,0.08)] bg-white shadow-[0_12px_28px_rgba(52,35,110,0.04)]">
            {scheduleItems.map((item, index) => (
              <div
                key={`${item.date}-${item.title}`}
                className={`grid gap-3 px-5 py-5 md:grid-cols-[120px_1fr] ${index !== scheduleItems.length - 1 ? 'border-b border-[rgba(95,75,182,0.07)]' : ''}`}
              >
                <div className="text-sm font-semibold text-[#5a43ba]">{item.date}</div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-[#241b42]">{item.title}</p>
                  <p className="text-sm leading-6 text-[#6f678b]">{item.description}</p>
                  <p className="text-sm text-[#857ca5]">{item.place}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <SectionTitle title="영상" />

          <div className="grid gap-4">
            {videoItems.map((item) => (
              <article
                key={item.title}
                className="grid gap-4 rounded-[28px] border border-[rgba(95,75,182,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(52,35,110,0.04)] md:grid-cols-[220px_1fr]"
              >
                <div className="overflow-hidden rounded-[22px] border border-[rgba(95,75,182,0.07)] bg-[#f7f5ff]">
                  <img src={item.thumbnail} alt={`${item.title} 썸네일`} className="h-full w-full object-cover" />
                </div>

                <div className="flex flex-col justify-center space-y-3">
                  <p className="text-xl font-semibold text-[#241b42]">{item.title}</p>
                  <p className="text-sm leading-6 text-[#6f678b]">{item.description}</p>
                  <span className="inline-flex w-fit rounded-full border border-[rgba(95,75,182,0.1)] bg-[#fbfaff] px-3 py-2 text-xs font-medium text-[#4e3b9d]">
                    {item.meta}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-[rgba(95,75,182,0.08)] bg-white px-5 py-6 shadow-[0_12px_28px_rgba(52,35,110,0.04)] md:px-8 md:py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-3">
            <h2 className="text-[2rem] font-semibold tracking-tight text-[#241b42] md:text-[2.25rem]">
              함께 연주하고 함께 무대를 만드는 밴드 동아리
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-[#6f678b] md:text-base">
              MUSE는 신입생부터 YB, OB까지 함께 이어지는 공연 중심의 밴드 동아리입니다.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link to={isAuthenticated ? '/performances' : '/signup'} className="w-full sm:w-auto">
              <Button className="w-full min-w-[190px]">
                {isAuthenticated ? '공연 관리 바로가기' : '회원가입하기'}
              </Button>
            </Link>
            <Link to={isAuthenticated ? '/me' : '/login'} className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full min-w-[190px]">
                {isAuthenticated ? '마이페이지 보기' : '로그인하기'}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </section>
  );
}
