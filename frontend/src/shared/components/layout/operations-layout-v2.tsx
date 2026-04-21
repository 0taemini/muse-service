import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useLogout } from '@features/auth/hooks/use-auth-actions';
import { useAuthStore } from '@features/auth/store/auth-store';
import { FirstVisitIntro } from '@shared/components/layout/first-visit-intro';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/lib/cn';

const publicMenuItems = [
  { to: '/login', label: '로그인' },
  { to: '/signup', label: '회원가입' },
  { to: '/recovery', label: '계정 찾기' },
];

const recoverySubItems = [
  { to: '/recovery?tab=email', label: '이메일 찾기', tab: 'email' },
  { to: '/recovery?tab=password', label: '비밀번호 재설정', tab: 'password' },
] as const;

const privateMenuItems = [
  { to: '/performances', label: '공연 관리' },
  { to: '/me', label: '마이페이지' },
];

const authPaths = new Set(['/login', '/signup', '/recovery']);
const shellClassName = 'mx-auto w-full max-w-[1440px] px-4 md:px-6 lg:px-8';

function TopNavLink({
  to,
  label,
  onClick,
}: {
  to: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-[#5f567f] transition duration-200 hover:bg-[#f6f1ff] hover:text-[#241b42]"
    >
      {label}
    </NavLink>
  );
}

export function OperationsLayoutV2() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userEmail = useAuthStore((state) => state.userEmail);
  const logoutMutation = useLogout();
  const location = useLocation();
  const isAuthenticated = Boolean(accessToken);
  const isAuthPage = authPaths.has(location.pathname);
  const isRecoveryPage = location.pathname === '/recovery';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRecoveryMenuOpen, setIsRecoveryMenuOpen] = useState(false);
  const [isMobileRecoveryMenuOpen, setIsMobileRecoveryMenuOpen] = useState(false);

  const recoveryTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') === 'password' ? 'password' : 'email';
  }, [location.search]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsRecoveryMenuOpen(false);
    setIsMobileRecoveryMenuOpen(false);
  }, [location.pathname, location.search]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const footerMenuItems = isAuthenticated ? privateMenuItems : publicMenuItems;

  return (
    <div className="relative min-h-screen overflow-x-clip text-slate-900">
      <FirstVisitIntro />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(88,67,176,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(255,206,168,0.22),transparent_22%),radial-gradient(circle_at_80%_78%,rgba(118,182,202,0.16),transparent_20%),linear-gradient(180deg,#fcfbff_0%,#f6f3ff_46%,#f8fbff_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-60 [background-image:linear-gradient(rgba(106,84,200,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(106,84,200,0.04)_1px,transparent_1px)] [background-size:28px_28px]"
      />

      <div className="relative">
        <header className="sticky top-0 z-30 border-b border-[rgba(95,75,182,0.08)] bg-[rgba(248,246,255,0.94)] shadow-[0_10px_26px_rgba(51,35,110,0.06)] backdrop-blur-xl">
          <div className={`${shellClassName} py-3`}>
            <div className="relative rounded-[20px] border border-[rgba(95,75,182,0.1)] bg-white/92 px-4 py-2.5 shadow-[0_12px_30px_rgba(56,39,125,0.06)] md:px-5">
              <div className="flex items-center gap-3 md:grid md:grid-cols-[auto_1fr_auto] md:gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <NavLink to="/" className="flex min-w-0 items-center gap-3">
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[15px] bg-[linear-gradient(135deg,#241b42_0%,#5d47be_52%,#ffb88f_100%)] shadow-[0_10px_24px_rgba(75,57,155,0.18)]">
                      <img src="/favicon.ico" alt="Muse favicon" className="h-full w-full object-cover mix-blend-screen" />
                    </span>

                    <div className="min-w-0">
                      <p className="truncate font-['Space_Grotesk'] text-[1.12rem] font-bold leading-none text-[#241b42]">
                        Muse Service
                      </p>
                    </div>
                  </NavLink>
                </div>

                <nav className="hidden items-center justify-center gap-1 md:flex">
                  {isAuthenticated
                    ? privateMenuItems.map((item) => (
                        <TopNavLink
                          key={item.to}
                          to={item.to}
                          label={item.label}
                        />
                      ))
                    : publicMenuItems.map((item) =>
                        item.label === '계정 찾기' ? (
                          <div
                            key={item.to}
                            className="relative pb-5 -mb-5"
                            onMouseEnter={() => setIsRecoveryMenuOpen(true)}
                            onMouseLeave={() => setIsRecoveryMenuOpen(false)}
                          >
                            <button
                              type="button"
                              onClick={() => setIsRecoveryMenuOpen((current) => !current)}
                              className={cn(
                                'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition duration-200',
                                isRecoveryMenuOpen
                                  ? 'bg-[#241b42] text-white'
                                  : 'text-[#5f567f] hover:bg-[#f6f1ff] hover:text-[#241b42]',
                              )}
                            >
                              <span>{item.label}</span>
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 12 12"
                                className={cn('h-3 w-3 transition duration-200', isRecoveryMenuOpen ? 'rotate-180' : 'rotate-0')}
                                fill="none"
                              >
                                <path d="M2.25 4.5L6 8.25L9.75 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>

                            <div
                              className={cn(
                                'absolute left-1/2 top-[calc(100%-2px)] z-[60] hidden w-[296px] -translate-x-1/2 pt-4 md:block',
                                isRecoveryMenuOpen ? 'pointer-events-auto' : 'pointer-events-none',
                              )}
                            >
                              <div
                                className={cn(
                                  'rounded-[26px] border border-[rgba(95,75,182,0.14)] bg-white p-2 shadow-[0_28px_70px_rgba(41,28,93,0.2)] ring-1 ring-[rgba(255,255,255,0.92)] transition duration-200',
                                  isRecoveryMenuOpen
                                    ? 'translate-y-0 opacity-100'
                                    : '-translate-y-2 opacity-0',
                                )}
                              >
                                <div className="grid gap-1">
                                  {recoverySubItems.map((subItem) => (
                                    <NavLink
                                      key={subItem.to}
                                      to={subItem.to}
                                      onClick={() => setIsRecoveryMenuOpen(false)}
                                      className={cn(
                                        'rounded-[18px] px-4 py-3 text-sm font-medium transition duration-200',
                                        'text-[#4f466b] hover:bg-[#f6f1ff] hover:text-[#241b42]',
                                      )}
                                    >
                                      {subItem.label}
                                    </NavLink>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                        <TopNavLink
                          key={item.to}
                          to={item.to}
                          label={item.label}
                        />
                      ),
                    )}
                </nav>

                <div className="ml-auto flex items-center gap-2 md:ml-0 md:justify-end">
                  <button
                    type="button"
                    aria-label={isMobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기'}
                    aria-expanded={isMobileMenuOpen}
                    onClick={() => setIsMobileMenuOpen((current) => !current)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(95,75,182,0.12)] bg-[#fbf9ff] text-[#241b42] transition hover:bg-[#f6f1ff] md:hidden"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="block h-0.5 w-4 rounded-full bg-current" />
                      <span className="block h-0.5 w-4 rounded-full bg-current" />
                      <span className="block h-0.5 w-4 rounded-full bg-current" />
                    </span>
                  </button>

                  {isAuthenticated ? (
                    <>
                      <div className="hidden rounded-full border border-[rgba(95,75,182,0.08)] bg-[#faf8ff] px-3 py-2 text-sm text-[#5f567f] lg:block">
                        {userEmail || '로그인한 사용자'}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => logoutMutation.mutate()}
                        disabled={logoutMutation.isPending}
                        className="hidden rounded-full px-4 py-2 md:inline-flex"
                      >
                        {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              {isMobileMenuOpen ? (
                <div className="absolute inset-x-0 top-[calc(100%+12px)] z-[70] md:hidden">
                  <div className="rounded-[26px] border border-[rgba(95,75,182,0.12)] bg-white px-3 py-3 shadow-[0_24px_60px_rgba(41,28,93,0.18)]">
                    <div className="flex flex-col gap-3">
                  <nav className="grid gap-2">
                    {(isAuthenticated ? privateMenuItems : publicMenuItems).map((item) =>
                      !isAuthenticated && item.label === '계정 찾기' ? (
                        <div key={`mobile-${item.to}`} className="grid gap-2">
                          <button
                            type="button"
                            onClick={() => setIsMobileRecoveryMenuOpen((current) => !current)}
                            className={cn(
                              'flex w-full items-center justify-between rounded-full px-4 py-2 text-sm font-medium transition duration-200',
                              isMobileRecoveryMenuOpen
                                ? 'bg-[#241b42] text-white'
                                : 'text-[#5f567f] hover:bg-[#f6f1ff] hover:text-[#241b42]',
                            )}
                          >
                            <span>{item.label}</span>
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 12 12"
                              className={cn('h-3 w-3 transition duration-200', isMobileRecoveryMenuOpen ? 'rotate-180' : 'rotate-0')}
                              fill="none"
                            >
                              <path d="M2.25 4.5L6 8.25L9.75 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>

                          {isMobileRecoveryMenuOpen ? (
                            <div className="grid gap-2 rounded-[22px] border border-[rgba(95,75,182,0.1)] bg-white px-2 py-2 shadow-[0_14px_32px_rgba(56,39,125,0.08)]">
                              {recoverySubItems.map((subItem) => (
                                <NavLink
                                  key={`mobile-sub-${subItem.to}`}
                                  to={subItem.to}
                                  onClick={closeMobileMenu}
                                  className="rounded-[16px] px-4 py-3 text-sm font-medium text-[#4f466b] transition duration-200 hover:bg-[#f6f1ff] hover:text-[#241b42]"
                                >
                                  {subItem.label}
                                </NavLink>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <TopNavLink
                          key={`mobile-${item.to}`}
                          to={item.to}
                          label={item.label}
                          onClick={closeMobileMenu}
                        />
                      ),
                    )}
                  </nav>

                  {isAuthenticated ? (
                    <div className="grid gap-2">
                      <div className="rounded-[18px] border border-[rgba(95,75,182,0.08)] bg-[#faf8ff] px-4 py-3 text-sm text-[#5f567f]">
                        {userEmail || '로그인한 사용자'}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          closeMobileMenu();
                          logoutMutation.mutate();
                        }}
                        disabled={logoutMutation.isPending}
                        className="min-h-10 rounded-full"
                      >
                        {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                      </Button>
                    </div>
                  ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className={`${shellClassName} flex min-h-[calc(100vh-140px)] flex-col py-5 md:py-6 lg:py-8`}>
          <Outlet />
        </main>

        {isAuthPage ? null : (
          <footer className="relative pb-8">
            <div className={shellClassName}>
              <div className="grid gap-4 rounded-[32px] border border-[rgba(95,75,182,0.1)] bg-[rgba(255,255,255,0.86)] px-5 py-6 shadow-[0_20px_48px_rgba(55,39,122,0.1)] backdrop-blur-xl md:grid-cols-[1.1fr_0.8fr_0.7fr] md:px-6">
                <div>
                  <p className="font-['Space_Grotesk'] text-2xl font-bold text-[#241b42]">Muse Band Operations</p>
                  <p className="mt-3 text-sm leading-7 text-[#625a80]">
                    공연 준비부터 곡 상태 관리, 확정 곡 합주방 운영과 피드백 정리까지
                    뮤즈 동아리 운영 흐름을 한 곳에서 이어갈 수 있도록 구성했습니다.
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7a67c7]">Quick Links</p>
                  <div className="mt-3 flex flex-col gap-2 text-sm text-[#4e3b9d]">
                    <NavLink to="/" className="font-semibold underline-offset-4 hover:underline">
                      메인 페이지
                    </NavLink>
                    {footerMenuItems.map((item) => (
                      <NavLink key={`footer-${item.to}`} to={item.to} className="font-semibold underline-offset-4 hover:underline">
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7a67c7]">Support</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-[#625a80]">
                    <p>문의가 필요하면 운영진에게 전달해 주세요.</p>
                    <p>
                      {isAuthenticated
                        ? '현재 계정으로 바로 공연 운영 작업을 이어갈 수 있습니다.'
                        : '로그인하면 공연 관리와 마이페이지 기능을 이용할 수 있습니다.'}
                    </p>
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
