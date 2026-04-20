import { ReactNode } from 'react';
import { cn } from '@shared/lib/cn';

type Tone = 'info' | 'success' | 'error';

interface InlineNoticeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

const toneClasses: Record<Tone, string> = {
  info: 'border-[#d7e4e8] bg-[#f2f7f8] text-[#31515b]',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
};

export function InlineNotice({ children, tone = 'info', className }: InlineNoticeProps) {
  return (
    <div className={cn('rounded-[20px] border px-4 py-3 text-sm font-medium', toneClasses[tone], className)}>
      {children}
    </div>
  );
}
