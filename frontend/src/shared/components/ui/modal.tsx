import { ReactNode, useEffect } from 'react';
import { cn } from '@shared/lib/cn';

type ModalSize = 'md' | 'lg' | 'xl';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
}

const sizeClasses: Record<ModalSize, string> = {
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/44 backdrop-blur-sm"
        aria-label="닫기"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 max-h-[90vh] w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)]',
          sizeClasses[size],
        )}
      >
        <div className="border-b border-slate-200 px-6 py-5 md:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
              {description ? <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p> : null}
            </div>
            <button
              type="button"
              className="rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
              onClick={onClose}
            >
              닫기
            </button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-154px)] overflow-y-auto px-6 py-6 md:px-7">{children}</div>

        {footer ? <div className="border-t border-slate-200 px-6 py-4 md:px-7">{footer}</div> : null}
      </div>
    </div>
  );
}
