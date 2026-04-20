import { ReactNode } from 'react';
import { cn } from '@shared/lib/cn';

type Tone = 'confirmed' | 'candidate' | 'out' | 'neutral';

interface StatusBadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

const toneClasses: Record<Tone, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  candidate: 'bg-amber-100 text-amber-700 ring-amber-200',
  out: 'bg-rose-100 text-rose-700 ring-rose-200',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export function StatusBadge({ children, tone = 'neutral', className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1', toneClasses[tone], className)}>
      {children}
    </span>
  );
}
