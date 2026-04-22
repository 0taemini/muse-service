import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLogout } from '@features/auth/hooks/use-auth-actions';
import { useAuthStore } from '@features/auth/store/auth-store';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/lib/cn';

const publicMenuItems = [
  { to: '/login', label: '로그인' },
  { to: '/signup', label: '회원가입' },
  { to: '/recovery', label: '계정 찾기' },
] as const;

const recoverySubItems = [
  { to: '/recovery?tab=email', label: '이메일 찾기' },
  { to: '/recovery?tab=password', label: '비밀번호 재설정' },
] as const;

const privateMenuItems = [
  { to: '/performances', label: '공연 관리' },
  { to: '/me', label: '마이페이지' },
] as const;

const myPageSubItems = [
  { to: '/me?tab=profile', label: '개인정보 수정' },
  { to: '/me?tab=feedback', label: '피드백 확인' },
] as const;

function FloatingNavLink({
  to,
  label,
  onNavigate,
}: {
  to: string;
  label: string;
  onNavigate: (to: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onNavigate(to);
      }}
      className="shrink-0 rounded-full bg-white px-4 py-2 text-[0.9rem] font-medium text-[#5a5180] transition hover:bg-[#faf7ff] hover:text-[#2d2b3f]"
    >
      {label}
    </button>
  );
}

function FloatingNavDropdown({
  label,
  isOpen,
  onToggle,
  onOpen,
  onClose,
  items,
  onNavigate,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onClose: () => void;
  items: readonly { to: string; label: string }[];
  onNavigate: (to: string) => void;
}) {
  return (
    <div className="relative -mb-5 pb-5" onMouseEnter={onOpen} onMouseLeave={onClose}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.9rem] font-medium transition',
          isOpen
            ? 'bg-[#2d2358] text-white'
            : 'bg-white text-[#5a5180] hover:bg-[#faf7ff] hover:text-[#2d2b3f]',
        )}
      >
        <span>{label}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className={cn('h-3 w-3 transition duration-200', isOpen ? 'rotate-180' : 'rotate-0')}
          fill="none"
        >
          <path
            d="M2.25 4.5L6 8.25L9.75 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div
        className={cn(
          'absolute left-1/2 top-[calc(100%-2px)] z-20 hidden w-[260px] -translate-x-1/2 pt-4 md:block',
          isOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <div
          className={cn(
            'rounded-[26px] border border-[rgba(95,75,182,0.14)] bg-white p-2 shadow-[0_16px_32px_rgba(41,28,93,0.08)] transition duration-200',
            isOpen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
          )}
        >
          <div className="grid gap-1">
            {items.map((item) => (
              <button
                key={item.to}
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate(item.to);
                }}
                className="rounded-[18px] px-4 py-4 text-sm font-medium text-[#5a5180] transition hover:bg-[#faf7ff] hover:text-[#2d2b3f]"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MuseFloatingHeader() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userEmail = useAuthStore((state) => state.userEmail);
  const logoutMutation = useLogout();
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(accessToken);

  const [isRecoveryMenuOpen, setIsRecoveryMenuOpen] = useState(false);
  const [isMyPageMenuOpen, setIsMyPageMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileRecoveryMenuOpen, setIsMobileRecoveryMenuOpen] = useState(false);
  const [isMobileMyPageMenuOpen, setIsMobileMyPageMenuOpen] = useState(false);

  const closeMenus = () => {
    setIsRecoveryMenuOpen(false);
    setIsMyPageMenuOpen(false);
    setIsMobileMenuOpen(false);
    setIsMobileRecoveryMenuOpen(false);
    setIsMobileMyPageMenuOpen(false);
  };

  const navigateFromMenu = (to: string) => {
    closeMenus();
    navigate(to);
  };

  useEffect(() => {
    closeMenus();
  }, [location.pathname, location.search]);

  return (
    <div className="sticky top-2 z-40 mb-4 w-full px-1 pt-2 md:top-4 md:mb-5 md:pt-4">
      <div className="relative mx-auto w-full max-w-[1328px]">
        <div className="flex w-full items-center justify-between gap-3 rounded-full border border-[rgba(95,75,182,0.16)] bg-white px-3 py-1.5 shadow-[0_10px_24px_rgba(41,28,93,0.06)] md:px-4 md:py-2">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#d78fff_0%,#a783ff_56%,#7f9150_100%)] text-lg font-bold text-white shadow-[0_10px_22px_rgba(144,108,214,0.28)] md:h-10 md:w-10 md:text-xl">
              M
            </span>
            <span className="text-[0.96rem] font-semibold text-[#2d2b3f] md:text-[1.15rem]">MUSE</span>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-6 md:flex">
            {isAuthenticated ? (
              <>
                {privateMenuItems.map((item) =>
                  item.to === '/me' ? (
                    <FloatingNavDropdown
                      key={item.to}
                      label={item.label}
                      isOpen={isMyPageMenuOpen}
                      onToggle={() => setIsMyPageMenuOpen((current) => !current)}
                      onOpen={() => setIsMyPageMenuOpen(true)}
                      onClose={() => setIsMyPageMenuOpen(false)}
                      items={myPageSubItems}
                      onNavigate={navigateFromMenu}
                    />
                  ) : (
                    <FloatingNavLink key={item.to} to={item.to} label={item.label} onNavigate={navigateFromMenu} />
                  ),
                )}
              </>
            ) : (
              <>
                {publicMenuItems.map((item) =>
                  item.to === '/recovery' ? (
                    <FloatingNavDropdown
                      key={item.to}
                      label={item.label}
                      isOpen={isRecoveryMenuOpen}
                      onToggle={() => setIsRecoveryMenuOpen((current) => !current)}
                      onOpen={() => setIsRecoveryMenuOpen(true)}
                      onClose={() => setIsRecoveryMenuOpen(false)}
                      items={recoverySubItems}
                      onNavigate={navigateFromMenu}
                    />
                  ) : (
                    <FloatingNavLink key={item.to} to={item.to} label={item.label} onNavigate={navigateFromMenu} />
                  ),
                )}
              </>
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {isAuthenticated ? (
              <>
                <div className="hidden rounded-full bg-white px-3 py-2 text-sm text-[#5f567f] lg:block">
                  {userEmail || '로그인한 사용자'}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="hidden rounded-full bg-white px-4 py-2 text-[#5a5180] hover:bg-[#faf7ff] hover:text-[#2d2b3f] md:inline-flex"
                >
                  {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                </Button>
              </>
            ) : null}

            <button
              type="button"
              aria-label={isMobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기'}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((current) => !current)}
               className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#5a5180] transition hover:bg-[#faf7ff] hover:text-[#2d2b3f] md:hidden"
            >
              <span className="flex flex-col gap-1">
                <span className="block h-0.5 w-4 rounded-full bg-current" />
                <span className="block h-0.5 w-4 rounded-full bg-current" />
                <span className="block h-0.5 w-4 rounded-full bg-current" />
              </span>
            </button>
          </div>
        </div>

        {isMobileMenuOpen ? (
          <div className="absolute right-0 top-[calc(100%+10px)] w-[min(248px,calc(100vw-24px))] md:hidden">
            <div className="rounded-[24px] border border-[rgba(95,75,182,0.14)] bg-white px-2.5 py-2.5 shadow-[0_18px_38px_rgba(41,28,93,0.1)]">
              <div className="flex flex-col gap-2">
                {(isAuthenticated ? privateMenuItems : publicMenuItems).map((item) => {
                  if (!isAuthenticated && item.to === '/recovery') {
                    return (
                      <div key={`mobile-${item.to}`} className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setIsMobileRecoveryMenuOpen((current) => !current)}
                          className={cn(
                             'flex w-full items-center justify-between rounded-full px-3.5 py-2.5 text-[0.82rem] font-medium transition',
                             isMobileRecoveryMenuOpen
                               ? 'bg-[#2d2358] text-white'
                               : 'bg-white text-[#5a5180] hover:bg-[#faf7ff] hover:text-[#2d2b3f]',
                          )}
                        >
                          <span>{item.label}</span>
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 12 12"
                            className={cn(
                              'h-3 w-3 transition duration-200',
                              isMobileRecoveryMenuOpen ? 'rotate-180' : 'rotate-0',
                            )}
                            fill="none"
                          >
                            <path
                              d="M2.25 4.5L6 8.25L9.75 4.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>

                        {isMobileRecoveryMenuOpen ? (
                           <div className="grid gap-1 rounded-[20px] border border-[rgba(95,75,182,0.1)] bg-white p-1.5 shadow-[0_14px_28px_rgba(52,35,110,0.07)]">
                            {recoverySubItems.map((subItem) => (
                              <button
                                key={`mobile-sub-${subItem.to}`}
                                type="button"
                                onClick={() => navigateFromMenu(subItem.to)}
                                 className="rounded-[14px] px-3.5 py-2.5 text-left text-[0.82rem] font-medium text-[#5a5180] transition hover:bg-[#faf7ff] hover:text-[#2d2b3f]"
                              >
                                {subItem.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  }

                  if (isAuthenticated && item.to === '/me') {
                    return (
                      <div key={`mobile-${item.to}`} className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setIsMobileMyPageMenuOpen((current) => !current)}
                          className={cn(
                             'flex w-full items-center justify-between rounded-full px-3.5 py-2.5 text-[0.82rem] font-medium transition',
                             isMobileMyPageMenuOpen
                               ? 'bg-[#2d2358] text-white'
                               : 'bg-white text-[#5a5180] hover:bg-[#faf7ff] hover:text-[#2d2b3f]',
                          )}
                        >
                          <span>{item.label}</span>
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 12 12"
                            className={cn(
                              'h-3 w-3 transition duration-200',
                              isMobileMyPageMenuOpen ? 'rotate-180' : 'rotate-0',
                            )}
                            fill="none"
                          >
                            <path
                              d="M2.25 4.5L6 8.25L9.75 4.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>

                        {isMobileMyPageMenuOpen ? (
                           <div className="grid gap-1 rounded-[20px] border border-[rgba(95,75,182,0.1)] bg-white p-1.5 shadow-[0_14px_28px_rgba(52,35,110,0.07)]">
                            {myPageSubItems.map((subItem) => (
                              <button
                                key={`mobile-sub-${subItem.to}`}
                                type="button"
                                onClick={() => navigateFromMenu(subItem.to)}
                                 className="rounded-[14px] px-3.5 py-2.5 text-left text-[0.82rem] font-medium text-[#5a5180] transition hover:bg-[#faf7ff] hover:text-[#2d2b3f]"
                              >
                                {subItem.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={`mobile-${item.to}`}
                      type="button"
                      onClick={() => navigateFromMenu(item.to)}
                       className="rounded-full bg-white px-3.5 py-2.5 text-left text-[0.82rem] font-medium text-[#5a5180] transition hover:bg-[#faf7ff] hover:text-[#2d2b3f]"
                    >
                      {item.label}
                    </button>
                  );
                })}

                {isAuthenticated ? (
                  <div className="grid gap-2 pt-1">
                    <div className="rounded-[16px] bg-white px-3.5 py-2.5 text-[0.8rem] text-[#5f567f]">
                      {userEmail || '로그인한 사용자'}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        closeMenus();
                        logoutMutation.mutate();
                      }}
                      disabled={logoutMutation.isPending}
                       className="min-h-9 rounded-full bg-white px-3.5 text-[0.82rem] text-[#5a5180] hover:bg-[#faf7ff] hover:text-[#2d2b3f]"
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
  );
}
