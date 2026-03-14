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
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <NavLink to={accessToken ? '/' : '/login'} className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-base font-bold text-white">
                M
              </span>
              <div>
                <p className="text-xl font-bold leading-none text-slate-900">Muse Service</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Band Operations
                </p>
              </div>
            </NavLink>

            <div className="flex items-center gap-3">
              {accessToken ? (
                <>
                  <div className="hidden rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 md:block">
                    {userEmail || '로그인됨'}
                  </div>
                  <Button variant="ghost" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
                    {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                  </Button>
                </>
              ) : (
                <div className="hidden rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600 lg:block">
                  공연 준비, 세션 배정, 피드백 기록을 한곳에서 관리하는 내부 서비스
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
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-950',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-146px)] w-full max-w-[1440px] flex-col px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white/80">
        <div className="mx-auto grid w-full max-w-[1440px] gap-4 px-4 py-8 text-sm text-slate-600 md:grid-cols-[1.2fr_0.8fr] md:px-6 lg:px-8">
          <div>
            <p className="text-xl font-semibold text-slate-900">뮤즈 밴드 운영을 위한 공연 준비 서비스</p>
            <p className="mt-2 leading-7">
              공연 목차 정리, 곡별 세션 배정, 합주 피드백 누적까지 실제 운영 흐름에 맞춰 연결합니다.
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
