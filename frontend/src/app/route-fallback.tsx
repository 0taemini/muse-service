import { Skeleton } from '@shared/components/ui/skeleton';

export function RouteFallback() {
  return (
    <div className="flex min-h-[360px] w-full items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[8px] border border-slate-200 bg-white px-6 py-8 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
        <Skeleton className="mx-auto h-10 w-10 rounded-full bg-[#5a43ba]/14" />
        <Skeleton className="mx-auto mt-5 h-5 w-44" />
        <Skeleton className="mx-auto mt-3 h-4 w-56" />
      </div>
    </div>
  );
}
