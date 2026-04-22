import { useEffect, useRef, useState, type MouseEvent, type TouchEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@features/auth/store/auth-store';
import {
  galleryPhotos,
  heroContent,
  introKeywords,
  performancePosters,
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
  const [activePosterIndex, setActivePosterIndex] = useState(0);
  const posterTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const posterTabScrollerRef = useRef<HTMLDivElement | null>(null);
  const posterTouchStartXRef = useRef<number | null>(null);
  const posterTouchStartYRef = useRef<number | null>(null);
  const suppressPosterClickRef = useRef(false);

  useEffect(() => {
    if (performancePosters.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActivePosterIndex((current) => (current + 1) % performancePosters.length);
    }, 3500);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const scroller = posterTabScrollerRef.current;
    const activeTab = posterTabRefs.current[activePosterIndex];

    if (!scroller || !activeTab) {
      return;
    }

    const scrollerWidth = scroller.clientWidth;
    const nextLeft = activeTab.offsetLeft - (scrollerWidth - activeTab.offsetWidth) / 2;

    scroller.scrollTo({
      left: Math.max(0, nextLeft),
      behavior: 'smooth',
    });
  }, [activePosterIndex]);

  const showPrevPoster = () => {
    setActivePosterIndex((current) => (current - 1 + performancePosters.length) % performancePosters.length);
  };

  const showNextPoster = () => {
    setActivePosterIndex((current) => (current + 1) % performancePosters.length);
  };

  const handlePosterTouchStart = (event: TouchEvent<HTMLButtonElement>) => {
    const touch = event.touches[0];
    posterTouchStartXRef.current = touch.clientX;
    posterTouchStartYRef.current = touch.clientY;
    suppressPosterClickRef.current = false;
  };

  const handlePosterTouchEnd = (event: TouchEvent<HTMLButtonElement>) => {
    const startX = posterTouchStartXRef.current;
    const startY = posterTouchStartYRef.current;
    const touch = event.changedTouches[0];

    posterTouchStartXRef.current = null;
    posterTouchStartYRef.current = null;

    if (startX === null || startY === null) {
      return;
    }

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const isHorizontalSwipe = Math.abs(deltaX) > 36 && Math.abs(deltaX) > Math.abs(deltaY);

    if (!isHorizontalSwipe) {
      return;
    }

    suppressPosterClickRef.current = true;

    if (deltaX < 0) {
      showNextPoster();
      return;
    }

    showPrevPoster();
  };

  const handlePosterClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (suppressPosterClickRef.current) {
      suppressPosterClickRef.current = false;
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - bounds.left;

    if (clickX < bounds.width / 2) {
      showPrevPoster();
      return;
    }

    showNextPoster();
  };

  const activePoster = performancePosters[activePosterIndex];

  return (
    <section className="space-y-12 md:space-y-16">
      <section className="space-y-6">
        <div className="overflow-hidden rounded-[28px] border border-[rgba(95,75,182,0.08)] bg-transparent shadow-[0_16px_34px_rgba(52,35,110,0.04)]">
          <div className="relative aspect-[4/5] overflow-hidden bg-[#eef0df] md:aspect-[1.08/1]">
            <div className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(56,67,45,0.16)_0%,rgba(56,67,45,0.04)_24%,rgba(36,31,24,0.16)_56%,rgba(24,19,15,0.74)_100%)]" />
            <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_top_right,rgba(207,222,166,0.28),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(176,191,134,0.18),transparent_24%)]" />

            <div className="absolute inset-x-0 top-4 z-20 px-3 md:top-5 md:px-6">
              <div
                ref={posterTabScrollerRef}
                className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                <div className="flex w-max min-w-full gap-2 pr-4 snap-x snap-mandatory md:pr-0">
                {performancePosters.map((poster, index) => (
                  <button
                    key={poster.title}
                    ref={(element) => {
                      posterTabRefs.current[index] = element;
                    }}
                    type="button"
                    onClick={() => setActivePosterIndex(index)}
                    className={[
                      'shrink-0 snap-start whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition backdrop-blur-sm md:snap-none',
                      activePosterIndex === index
                        ? 'bg-[#f4f0e7] text-[#485433] shadow-[0_10px_22px_rgba(33,39,24,0.16)]'
                        : 'border border-white/26 bg-[rgba(255,255,255,0.18)] text-white hover:bg-[rgba(255,255,255,0.28)]',
                    ].join(' ')}
                  >
                    {poster.title}
                  </button>
                ))}
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-4 pt-16 md:px-6 md:pb-6 md:pt-20">
                <div className="max-w-[560px] space-y-2 rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(22,16,38,0.08)_0%,rgba(22,16,38,0.24)_22%,rgba(14,10,24,0.54)_100%)] px-4 py-3 shadow-[0_18px_40px_rgba(8,6,16,0.22)] backdrop-blur-[6px] md:space-y-3 md:px-6 md:py-6">
                  <h1 className="max-w-3xl text-[2.45rem] font-semibold tracking-tight text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.28)] md:text-[5.4rem] md:leading-[0.96]">
                    {heroContent.title}
                  </h1>
                <div className="space-y-1.5 text-sm leading-6 text-[rgba(249,246,255,0.96)] drop-shadow-[0_3px_12px_rgba(0,0,0,0.3)] md:space-y-2 md:text-[1.12rem] md:leading-8">
                  {heroContent.descriptionLines.slice(0, 2).map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>

                </div>
            </div>

            <button
              type="button"
              onClick={handlePosterClick}
              onTouchStart={handlePosterTouchStart}
              onTouchEnd={handlePosterTouchEnd}
              className="relative z-[2] h-full w-full cursor-pointer text-left"
              aria-label={`${activePoster.title} 포스터 넘기기`}
            >
	              {performancePosters.map((poster, index) => (
	                <div
	                  key={poster.title}
	                  className={[
	                    'absolute inset-0 transition-opacity duration-700',
	                    activePosterIndex === index ? 'opacity-100' : 'opacity-0',
	                  ].join(' ')}
	                >
	                  <img
	                    src={poster.src}
	                    alt=""
	                    aria-hidden="true"
	                    className="absolute inset-0 h-full w-full scale-[1.03] object-cover blur-sm brightness-[0.72]"
	                  />
	                  <img
	                    src={poster.src}
	                    alt={poster.alt}
	                    className="absolute inset-0 h-full w-full object-contain p-2 md:p-4"
	                  />
	                </div>
	              ))}
            </button>
          </div>
        </div>

      </section>

      <section className="space-y-5">
        <SectionTitle title="MUSE의 순간들" />

        <div className="grid gap-4 md:grid-cols-3 md:items-start md:justify-items-center md:gap-6">
          {galleryPhotos.map((photo, index) => (
            <figure
              key={photo.title}
              className={[
                'group w-full max-w-[340px] border border-[rgba(95,75,182,0.08)] bg-white p-3 shadow-[0_12px_28px_rgba(52,35,110,0.05)] rounded-tl-[28px] rounded-br-[28px] rounded-tr-none rounded-bl-none md:max-w-[360px] xl:max-w-[372px]',
                index === 1 ? 'md:translate-y-4 md:shadow-[0_18px_36px_rgba(87,58,40,0.18)]' : '',
              ].join(' ')}
            >
              <div className="relative overflow-hidden rounded-tl-[22px] rounded-br-[22px] rounded-tr-none rounded-bl-none">
                <div className="h-[310px] overflow-hidden rounded-tl-[22px] rounded-br-[22px] rounded-tr-none rounded-bl-none md:h-[360px]">
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className={[
                      'h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] rounded-tl-[22px] rounded-br-[22px] rounded-tr-none rounded-bl-none',
                      index !== 1 ? 'grayscale-[0.08]' : '',
                    ].join(' ')}
                  />
                </div>

                <figcaption
                  className={[
                    'absolute inset-x-3 bottom-3 px-4 py-3 backdrop-blur-md rounded-tl-[18px] rounded-br-[18px] rounded-tr-none rounded-bl-none',
                    index === 1
                      ? 'bg-[rgba(124,89,67,0.92)] text-white shadow-[0_14px_26px_rgba(81,54,39,0.24)]'
                      : 'bg-[rgba(255,255,255,0.88)] text-[#241b42] shadow-[0_10px_22px_rgba(20,16,37,0.08)]',
                  ].join(' ')}
                >
                  <p className="text-[1rem] font-semibold">{photo.title}</p>
                  <p
                    className={[
                      'mt-1 text-xs leading-5',
                      index === 1 ? 'text-white/84' : 'text-[#6f678b]',
                    ].join(' ')}
                  >
                    {photo.caption}
                  </p>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-5">
          <SectionTitle title="영상 아카이브" />

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
                  <span className="inline-flex w-fit rounded-full border border-[rgba(95,75,182,0.1)] bg-[#fbfaff] px-3 py-1.5 text-xs font-medium text-[#4e3b9d]">
                    {item.meta}
                  </span>
                  <p className="text-xl font-semibold text-[#241b42]">{item.title}</p>
                  <p className="text-sm leading-6 text-[#6f678b]">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-[rgba(95,75,182,0.08)] bg-[linear-gradient(135deg,#ffffff_0%,#f7f2ff_42%,#eef4ff_100%)] px-5 py-6 shadow-[0_12px_28px_rgba(52,35,110,0.04)] md:px-8 md:py-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b8350]">Join MUSE</p>
              <h2 className="text-[2rem] font-semibold tracking-tight text-[#241b42] md:text-[2.25rem]">
                함께 연주하고 함께 무대를 만드는 밴드 동아리
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#6f678b] md:text-base">
                MUSE는 신입 부원부터 YB, OB까지 함께 음악을 이어 가며 공연을 만들어 가는 밴드 동아리입니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {introKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-[rgba(95,75,182,0.12)] bg-white/78 px-3 py-2 text-xs font-medium text-[#4e3b9d] backdrop-blur-sm"
                >
                  {keyword}
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
              <Link to={isAuthenticated ? '/performances' : '/signup'} className="w-full sm:w-auto xl:w-full">
                <Button className="w-full min-w-[190px]">
                  {isAuthenticated ? '공연 관리 바로가기' : '회원가입하기'}
                </Button>
              </Link>
              <Link to={isAuthenticated ? '/me' : '/login'} className="w-full sm:w-auto xl:w-full">
                <Button variant="secondary" className="w-full min-w-[190px]">
                  {isAuthenticated ? '마이페이지 보기' : '로그인하기'}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </section>

    </section>
  );
}

