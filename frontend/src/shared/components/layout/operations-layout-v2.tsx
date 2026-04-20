import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '@features/auth/store/auth-store';
import { useLogout } from '@features/auth/hooks/use-auth-actions';
import { Button } from '@shared/components/ui/button';

const publicMenuItems = [
  { to: '/login', label: '로그인' },
  { to: '/signup', label: '회원가입' },
  { to: '/recovery', label: '계정 찾기' },
];

const privateMenuItems = [
  { to: '/', label: '대시보드' },
  { to: '/performances', label: '공연 관리' },
  { to: '/me', label: '마이페이지' },
  { to: '/test', label: '개발 확인' },
];

export function OperationsLayoutV2() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userEmail = useAuthStore((state) => state.userEmail);
  const logoutMutation = useLogout();
  const menuItems = accessToken ? privateMenuItems : publicMenuItems;

  return (
    <div className="min-h-screen text-slate-900">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-[rgba(247,243,234,0.86)] backdrop-blur-xl">
        <div className="page-shell min-h-0 gap-4 pb-4 pt-4">
          <div className="flex items-center justify-between gap-4">
            <NavLink to={accessToken ? '/' : '/login'} className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#14323f] text-base font-bold text-white shadow-[0_18px_36px_rgba(20,50,63,0.24)]">
                M
              </span>
              <div className="min-w-0">
                <p className="truncate font-['Space_Grotesk'] text-xl font-bold leading-none text-[#122025]">
                  Muse Service
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Band Operations
                </p>
              </div>
            </NavLink>

            <div className="flex items-center gap-3">
              {accessToken ? (
                <>
                  <div className="hidden rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 md:block">
                    {userEmail || '로그인한 사용자'}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                  </Button>
                </>
              ) : (
                <div className="hidden rounded-full bg-white/70 px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200 lg:block">
                  공연 준비부터 피드백 기록까지, 동아리 운영 흐름을 한 곳에서 관리합니다.
                </div>
              )}
            </div>
          </div>

          <nav className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
                    isActive
                      ? 'bg-[#14323f] text-white shadow-[0_14px_30px_rgba(20,50,63,0.2)]'
                      : 'bg-white/80 text-slate-600 ring-1 ring-slate-200 hover:bg-white hover:text-slate-950',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="page-shell min-h-[calc(100vh-152px)] py-6 lg:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-white/70 bg-white/60 backdrop-blur">
        <div className="page-shell min-h-0 gap-4 py-8 text-sm text-slate-600 md:grid md:grid-cols-[1.2fr_0.8fr] md:items-start">
          <div>
            <p className="text-xl font-semibold text-slate-900">뮤즈 밴드 운영을 위한 공연 준비 워크스페이스</p>
            <p className="mt-2 max-w-2xl leading-7">
              공연 목록 정리, 곡 상태 확인, 세션 배정, 피드백 기록까지 내부 운영 흐름을 자연스럽게 이어주는 서비스입니다.
            </p>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            {accessToken ? (
              <>
                <NavLink to="/performances" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
                  공연 관리로 이동
                </NavLink>
                <NavLink to="/test" className="font-semibold text-slate-700 underline-offset-4 hover:underline">
                  개발 확인 /test
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/signup" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
                  회원가입
                </NavLink>
                <NavLink to="/login" className="font-semibold text-slate-700 underline-offset-4 hover:underline">
                  로그인
                </NavLink>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
