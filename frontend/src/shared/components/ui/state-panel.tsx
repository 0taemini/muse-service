import { ReactNode } from 'react';
import { cn } from '@shared/lib/cn';

type Tone = 'default' | 'accent' | 'danger' | 'inverse';

interface StatePanelProps {
  title: string;
  description: string;
  action?: ReactNode;
  tone?: Tone;
  className?: string;
}

const toneClasses: Record<Tone, string> = {
  default: 'border-dashed border-slate-300 bg-slate-50 text-slate-600',
  accent: 'border-[#ddd4ff] bg-[#f7f4ff] text-[#5a43ba]',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  inverse: 'border-white/15 bg-white/10 text-slate-200',
};

export function StatePanel({ title, description, action, tone = 'default', className }: StatePanelProps) {
  return (
    <div className={cn('rounded-[24px] border px-5 py-8 text-center', toneClasses[tone], className)}>
      <div className="mx-auto max-w-md space-y-2">
        <h3 className={cn('text-lg font-semibold', tone === 'inverse' ? 'text-white' : 'text-slate-900')}>{title}</h3>
        <p className="text-sm leading-7">{description}</p>
      </div>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
