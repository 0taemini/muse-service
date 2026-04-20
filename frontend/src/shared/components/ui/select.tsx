import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '@shared/lib/cn';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-12 w-full rounded-2xl border border-slate-300/90 bg-white/90 px-4 text-sm text-slate-900 outline-none transition focus:border-[#14323f] focus:ring-4 focus:ring-[#d8e5e9]',
        className,
      )}
      {...props}
    />
  );
});
