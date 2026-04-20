import { ReactNode } from 'react';
import { cn } from '@shared/lib/cn';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  tone?: 'default' | 'inverse';
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  tone = 'default',
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
      <div className="space-y-3">
        <p className={cn('text-[11px] font-semibold uppercase tracking-[0.28em]', tone === 'inverse' ? 'text-slate-300' : 'text-slate-500')}>
          {eyebrow}
        </p>
        <div className="space-y-2">
          <h1 className={cn('text-3xl font-semibold tracking-tight md:text-5xl', tone === 'inverse' ? 'text-white' : 'text-[var(--text-strong)]')}>
            {title}
          </h1>
          {description ? (
            <p className={cn('max-w-3xl text-sm leading-7 md:text-base', tone === 'inverse' ? 'text-slate-200' : 'text-[var(--text-muted)]')}>
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
