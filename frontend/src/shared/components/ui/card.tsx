import { HTMLAttributes } from 'react';
import { cn } from '@shared/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-5 md:p-6',
        'shadow-[0_14px_36px_rgba(15,23,42,0.08)]',
        className,
      )}
      {...props}
    />
  );
}
