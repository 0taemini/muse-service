import { cn } from '@shared/lib/cn';

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-[8px] bg-slate-200/75', className)}
    />
  );
}

type SkeletonListProps = {
  count?: number;
  className?: string;
};

export function SkeletonList({ count = 3, className }: SkeletonListProps) {
  return (
    <div className={cn('grid gap-3', className)}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-[18px] border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
