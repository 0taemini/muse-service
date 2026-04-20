import { ReactNode } from 'react';
import { cn } from '@shared/lib/cn';

interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, hint, error, children, className }: FormFieldProps) {
  return (
    <label className={cn('flex flex-col gap-2', className)}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-rose-600">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}
