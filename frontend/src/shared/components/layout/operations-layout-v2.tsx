import { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { FirstVisitIntro } from '@shared/components/layout/first-visit-intro';
import { MuseFloatingHeader } from '@shared/components/layout/muse-floating-header';

const authPaths = new Set(['/login', '/signup', '/recovery']);
const shellClassName = 'mx-auto w-full max-w-[1360px] px-4 md:px-6 lg:px-8';

const footerDeveloperProfile = {
  name: '김태민',
  email: 'xoals2025@naver.com',
  githubLabel: 'GitHub',
  githubText: 'github.com/0taemini',
  githubHref: 'https://github.com/0taemini',
};

const footerNewsItems = ['공지사항', '문의사항'];

const footerShortInfo: Array<{ label: string; value: string; href?: string }> = [
  {
    label: 'Instagram',
    value: '@muse___41',
    href: 'https://instagram.com/muse___41',
  },
  {
    label: '위치',
    value: '학생회관 6층 6124호',
  },
];

export function OperationsLayoutV2() {
  const location = useLocation();
  const isAuthPage = authPaths.has(location.pathname);

  const currentTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') ?? '';
  }, [location.search]);

  const hideFooter = isAuthPage || (location.pathname === '/me' && currentTab === 'profile');

  return (
    <div className="relative min-h-screen overflow-x-clip bg-white text-slate-900">
      <FirstVisitIntro />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-white"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
      />

      <div className="relative">
        <div className={shellClassName}>
          <MuseFloatingHeader />
        </div>

        <main className={`${shellClassName} flex min-h-[calc(100vh-140px)] flex-col py-5 md:py-6 lg:py-8`}>
          <Outlet key={`${location.pathname}${location.search}`} />
        </main>

        {hideFooter ? null : (
          <footer className="relative pb-8">
            <div className={shellClassName}>
              <div className="grid gap-4 rounded-[32px] border border-[rgba(95,75,182,0.1)] bg-[rgba(255,255,255,0.86)] px-5 py-6 shadow-[0_20px_48px_rgba(55,39,122,0.1)] backdrop-blur-xl md:grid-cols-[1fr_1fr_1.15fr] md:px-6">
                <div>
                  <p className="text-2xl font-semibold text-[#241b42]">개발자</p>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-[#625a80]">
                    <p>
                      <span className="font-semibold text-[#241b42]">이름</span>
                      {' : '}
                      {footerDeveloperProfile.name}
                    </p>
                    <p>
                      <span className="font-semibold text-[#241b42]">이메일</span>
                      {' : '}
                      {footerDeveloperProfile.email}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-[#241b42]">{footerDeveloperProfile.githubLabel}</span>
                      <a
                        href={footerDeveloperProfile.githubHref}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-[#4e3b9d] underline-offset-4 hover:underline"
                      >
                        {footerDeveloperProfile.githubText}
                      </a>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-2xl font-semibold text-[#241b42]">소식</p>
                  <div className="mt-4 space-y-1 text-[1.05rem] leading-8 text-[#94a0b8]">
                    {footerNewsItems.map((item) => (
                      <p key={item} className="font-medium transition duration-200 hover:text-[#241b42]">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-2xl font-semibold text-[#241b42]">링크 및 위치</p>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-[#625a80]">
                    {footerShortInfo.map((item) =>
                      item.href ? (
                        <a
                          key={item.label}
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="block font-medium text-[#4e3b9d] underline-offset-4 hover:underline"
                        >
                          {item.label} : {item.value}
                        </a>
                      ) : (
                        <p key={item.label}>
                          <span className="font-semibold text-[#241b42]">{item.label}</span>
                          {' : '}
                          {item.value}
                        </p>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
