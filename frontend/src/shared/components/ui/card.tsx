import { HTMLAttributes } from 'react';
import { cn } from '@shared/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[30px] border border-white/85 bg-white/86 p-5 backdrop-blur md:p-6',
        'shadow-[0_24px_80px_rgba(82,52,158,0.12)]',
        className,
      )}
      {...props}
    />
  );
}