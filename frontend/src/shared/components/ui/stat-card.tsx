import { ReactNode } from 'react';
import { cn } from '@shared/lib/cn';

type Tone = 'default' | 'accent' | 'inverse';

interface StatCardProps {
  label: string;
  value: ReactNode;
  description?: string;
  tone?: Tone;
  className?: string;
}

const toneClasses: Record<Tone, string> = {
  default: 'bg-white/82 text-slate-900 ring-1 ring-slate-200/80',
  accent: 'bg-[#eef4f5] text-[#14323f] ring-1 ring-[#d0dde1]',
  inverse: 'bg-white/10 text-white ring-1 ring-white/10',
};

export function StatCard({ label, value, description, tone = 'default', className }: StatCardProps) {
  return (
    <div className={cn('rounded-[24px] p-5', toneClasses[tone], className)}>
      <p className={cn('text-[11px] font-semibold uppercase tracking-[0.24em]', tone === 'inverse' ? 'text-slate-300' : 'text-slate-500')}>
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      {description ? (
        <p className={cn('mt-2 text-sm leading-6', tone === 'inverse' ? 'text-slate-200' : 'text-slate-600')}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
