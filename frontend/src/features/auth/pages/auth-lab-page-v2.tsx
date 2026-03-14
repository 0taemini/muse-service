import { Card } from '@shared/components/ui/card';
import { useAuthStore } from '@features/auth/store/auth-store';

export function AuthLabPageV2() {
  const { accessToken, refreshToken, userEmail } = useAuthStore();

  return (
    <section className="space-y-6">
      <Card className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Developer Lab</p>
        <h2 className="text-3xl font-semibold text-slate-900">인증 검증용 테스트 페이지</h2>
        <p className="text-sm leading-7 text-slate-600">
          운영 화면과 분리된 개발용 공간입니다. 토큰 상태 확인, API 응답 점검, 임시 QA 검증 용도로만 사용합니다.
        </p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">현재 세션 상태</h3>
          <dl className="grid gap-4 text-sm text-slate-700">
            <div>
              <dt className="font-medium text-slate-500">사용자</dt>
              <dd>{userEmail || '없음'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Access Token</dt>
              <dd className="break-all">{accessToken || '없음'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Refresh Token</dt>
              <dd className="break-all">{refreshToken || '없음'}</dd>
            </div>
          </dl>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">권장 사용 방식</h3>
          <ul className="space-y-3 text-sm leading-7 text-slate-600">
            <li>운영 UX 확인은 `/`, `/login`, `/signup`, `/recovery`, `/me`에서 진행합니다.</li>
            <li>이 페이지는 토큰 상태, API 응답, 임시 QA 점검 용도로만 사용합니다.</li>
            <li>실시간 채팅이 붙으면 WebSocket 연결 상태와 구독 로그도 여기서 확인할 수 있습니다.</li>
          </ul>
        </Card>
      </div>
    </section>
  );
}
