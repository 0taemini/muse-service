import { isRouteErrorResponse, Link, useNavigate, useRouteError } from 'react-router-dom';
import { Button } from '@shared/components/ui/button';

type ErrorPageKind = 'not-found' | 'forbidden' | 'default';

interface RouteErrorPageProps {
  kind?: ErrorPageKind;
}

const errorCopy: Record<ErrorPageKind, { eyebrow: string; title: string; description: string }> = {
  'not-found': {
    eyebrow: '404',
    title: '페이지를 찾을 수 없습니다',
    description: '주소가 잘못되었거나, 이동하려는 페이지가 더 이상 제공되지 않을 수 있습니다.',
  },
  forbidden: {
    eyebrow: '권한 확인',
    title: '접근 권한이 없습니다',
    description: '관리자 권한이 필요한 페이지입니다. 권한이 필요하다면 운영진에게 문의해 주세요.',
  },
  default: {
    eyebrow: '오류',
    title: '화면을 불러오지 못했습니다',
    description: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  },
};

function getRouteErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return '요청한 경로가 존재하지 않습니다.';
    }
    if (error.status === 401) {
      return '로그인이 필요한 요청입니다.';
    }
    if (error.status === 403) {
      return '접근 권한이 없는 요청입니다.';
    }
    return error.statusText || `오류 코드 ${error.status}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '';
}

export function RouteErrorPage({ kind = 'default' }: RouteErrorPageProps) {
  const navigate = useNavigate();
  const routeError = useRouteError();
  const copy = errorCopy[kind];
  const detailMessage = kind === 'default' ? getRouteErrorMessage(routeError) : '';

  return (
    <section className="mx-auto flex min-h-[calc(100vh-180px)] w-full max-w-[760px] items-center justify-center px-4 py-10">
      <div className="w-full overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.1)]">
        <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#fff_0%,#f7f4ff_54%,#fff5f5_100%)] px-6 py-8 md:px-8">
          <span className="inline-flex min-h-8 items-center rounded-full bg-[#241b42] px-3 text-xs font-semibold text-white">
            {copy.eyebrow}
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">{copy.title}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">{copy.description}</p>
        </div>

        <div className="space-y-5 px-6 py-6 md:px-8">
          {detailMessage ? (
            <div className="rounded-[8px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium leading-6 text-rose-700">
              {detailMessage}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)} className="rounded-[8px]">
              이전 화면
            </Button>
            <Link
              to="/"
              className="inline-flex min-h-12 items-center justify-center rounded-[8px] bg-[#5a43ba] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(90,67,186,0.22)] transition hover:bg-[#4a35a4]"
            >
              홈으로 이동
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
