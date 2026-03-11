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
  { to: '/', label: '홈' },
  { to: '/me', label: '마이페이지' },
  { to: '/test', label: '테스트' },
];

export function AppLayout() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userEmail = useAuthStore((state) => state.userEmail);
  const logoutMutation = useLogout();
  const menuItems = accessToken ? privateMenuItems : publicMenuItems;

  return (
    <div className="min-h-screen text-slate-900">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-[#f8f3ff]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <NavLink to={accessToken ? '/' : '/login'} className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#8c7bff_0%,#b173ff_55%,#e183c8_100%)] font-['Shrikhand'] text-lg text-white shadow-[0_14px_30px_rgba(141,123,255,0.36)]">
                M
              </span>
              <div>
                <p className="font-['Shrikhand'] text-2xl leading-none text-[#261f3f]">Muse</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8b6de0]">Band Club Portal</p>
              </div>
            </NavLink>

            <div className="flex items-center gap-3">
              {accessToken ? (
                <>
                  <div className="hidden rounded-full bg-[#2b2340] px-4 py-2 text-sm font-medium text-white md:block">
                    {userEmail || '로그인됨'}
                  </div>
                  <Button variant="ghost" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
                    {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                  </Button>
                </>
              ) : (
                <div className="hidden rounded-full bg-white/84 px-4 py-2 text-sm text-slate-600 lg:block">
                  공연 준비부터 합주 피드백까지 이어지는 뮤즈 전용 서비스
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
                      ? 'bg-[#2b2340] text-white shadow-[0_14px_28px_rgba(43,35,64,0.24)]'
                      : 'bg-white/84 text-slate-600 ring-1 ring-[#e6dcfb] hover:bg-white hover:text-slate-950',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-146px)] w-full max-w-7xl flex-col px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-black/5 bg-white/60">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-8 text-sm text-slate-600 md:grid-cols-[1.2fr_0.8fr] md:px-6 lg:px-8">
          <div>
            <p className="font-['Gaegu'] text-2xl font-bold text-[#2b2340]">뮤즈 동아리 사운드를 위한 운영 포털.</p>
            <p className="mt-2 leading-7">
              공연 준비, 선곡, 합주 피드백, 개인 기록을 하나의 흐름으로 연결해서 동아리 운영에 맞춘 경험을 제공합니다.
            </p>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            {accessToken ? (
              <>
                <NavLink to="/" className="font-semibold text-[#8b6de0] underline-offset-4 hover:underline">
                  홈으로 이동
                </NavLink>
                <NavLink to="/test" className="font-semibold text-slate-700 underline-offset-4 hover:underline">
                  개발 검증용 /test 이동
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/signup" className="font-semibold text-[#8b6de0] underline-offset-4 hover:underline">
                  새 멤버 회원가입
                </NavLink>
                <NavLink to="/login" className="font-semibold text-slate-700 underline-offset-4 hover:underline">
                  로그인하러 가기
                </NavLink>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}