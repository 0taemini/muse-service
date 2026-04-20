import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '@features/auth/store/auth-store';
import { useLogout } from '@features/auth/hooks/use-auth-actions';
import { Button } from '@shared/components/ui/button';

const publicMenuItems = [
  { to: '/login', label: '로그인' },
  { to: '/signup', label: '회원가입' },
  { to: '/recovery', label: '계정 복구' },
];

const privateMenuItems = [
  { to: '/', label: '대시보드' },
  { to: '/performances', label: '공연 운영' },
  { to: '/me', label: '마이페이지' },
  { to: '/test', label: '개발 확인' },
];

export function OperationsLayout() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userEmail = useAuthStore((state) => state.userEmail);
  const logoutMutation = useLogout();
  const menuItems = accessToken ? privateMenuItems : publicMenuItems;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f3ea_0%,#f2ece1_100%)] text-slate-900">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(215,159,82,0.16),transparent_20%),radial-gradient(circle_at_86%_14%,rgba(31,95,107,0.14),transparent_24%),radial-gradient(circle_at_86%_82%,rgba(92,129,115,0.12),transparent_20%)]" />

      <header className="sticky top-0 z-30 border-b border-white/70 bg-[rgba(247,243,234,0.86)] backdrop-blur-xl">
        <div className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <NavLink to={accessToken ? '/' : '/login'} className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#14323f_0%,#1d5b67_52%,#d79f52_100%)] font-['Shrikhand'] text-lg text-white shadow-[0_18px_40px_rgba(20,50,63,0.24)]">
                M
              </span>
              <div>
                <p className="font-['Shrikhand'] text-2xl leading-none text-[#14323f]">Muse</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6b2f]">
                  Band Operations Desk
                </p>
              </div>
            </NavLink>

            <div className="flex items-center gap-3">
              {accessToken ? (
                <>
                  <div className="hidden rounded-full bg-[#14323f] px-4 py-2 text-sm font-medium text-white md:block">
                    {userEmail || '로그인됨'}
                  </div>
                  <Button
                    variant="ghost"
                    className="ring-[#ddd4c8]"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                  </Button>
                </>
              ) : (
                <div className="hidden rounded-full bg-white/84 px-4 py-2 text-sm text-slate-600 lg:block">
                  공연 준비, 세션 배정, 피드백 기록을 한 흐름으로 운영하는 내부 서비스
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
                      ? 'bg-[#14323f] text-white shadow-[0_14px_28px_rgba(20,50,63,0.24)]'
                      : 'bg-white/84 text-slate-600 ring-1 ring-[#ddd4c8] hover:bg-white hover:text-slate-950',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative mx-auto flex min-h-[calc(100vh-146px)] w-full max-w-[1440px] flex-col px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>

      <footer className="relative border-t border-black/5 bg-white/60">
        <div className="mx-auto grid w-full max-w-[1440px] gap-4 px-4 py-8 text-sm text-slate-600 md:grid-cols-[1.2fr_0.8fr] md:px-6 lg:px-8">
          <div>
            <p className="font-['Gaegu'] text-2xl font-bold text-[#14323f]">뮤즈 밴드 운영을 위한 공연 준비 데스크.</p>
            <p className="mt-2 leading-7">
              공연 세트리스트 정리, 곡별 세션 배정, 합주 피드백 축적까지 한 화면 흐름으로 이어집니다.
            </p>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            {accessToken ? (
              <>
                <NavLink to="/performances" className="font-semibold text-[#9a6b2f] underline-offset-4 hover:underline">
                  공연 운영으로 이동
                </NavLink>
                <NavLink to="/test" className="font-semibold text-slate-700 underline-offset-4 hover:underline">
                  개발 확인 /test
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/signup" className="font-semibold text-[#9a6b2f] underline-offset-4 hover:underline">
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
