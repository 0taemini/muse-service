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
    'bg-[#5a43ba] text-white shadow-[0_18px_36px_rgba(90,67,186,0.22)] hover:bg-[#4a35a4] focus-visible:ring-[#ddd4ff]',
  secondary:
    'bg-[#f3efff] text-[#35285f] ring-1 ring-[rgba(95,75,182,0.12)] hover:bg-[#ebe4ff] focus-visible:ring-[#ddd4ff]',
  ghost:
    'bg-white text-[#6f678b] ring-1 ring-[rgba(95,75,182,0.12)] hover:bg-[#faf8ff] hover:text-[#35285f] focus-visible:ring-[#e4dcff]',
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
