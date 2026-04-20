import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@shared/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'sm';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variants: Record<Variant, string> = {
  primary:
    'bg-[#14323f] text-white shadow-[0_18px_36px_rgba(20,50,63,0.18)] hover:bg-[#102731] focus-visible:ring-[#b7cad0]',
  secondary: 'bg-[#e4edf0] text-[#14323f] ring-1 ring-[#c8d7dc] hover:bg-[#d9e6ea] focus-visible:ring-[#b7cad0]',
  ghost: 'bg-white/80 text-slate-700 ring-1 ring-slate-200 hover:bg-white hover:text-slate-950 focus-visible:ring-slate-200',
};

const sizes: Record<Size, string> = {
  md: 'min-h-12 rounded-2xl px-4 py-3 text-sm',
  sm: 'min-h-10 rounded-xl px-3 py-2 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60',
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    />
  );
});
