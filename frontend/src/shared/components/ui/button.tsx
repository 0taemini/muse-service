import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@shared/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const variants: Record<Variant, string> = {
  primary:
    'bg-[linear-gradient(135deg,#8c7bff_0%,#b173ff_48%,#e183c8_100%)] text-white shadow-[0_16px_42px_rgba(141,123,255,0.32)] hover:-translate-y-0.5 hover:shadow-[0_22px_46px_rgba(141,123,255,0.36)]',
  secondary: 'bg-[#2b2340] text-white shadow-lg shadow-[#2b2340]/25 hover:-translate-y-0.5 hover:bg-[#352a55]',
  ghost: 'bg-white/82 text-slate-700 ring-1 ring-[#ddd5f7] hover:bg-white hover:text-slate-950',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-[20px] px-4 py-3 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
});