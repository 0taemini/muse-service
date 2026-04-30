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
  headerActions?: ReactNode;
  bodyClassName?: string;
  hideCloseButton?: boolean;
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
  headerActions,
  bodyClassName,
  hideCloseButton = false,
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/44 backdrop-blur-sm"
        aria-label="닫기"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 flex h-[92dvh] max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[24px] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)] sm:h-auto sm:max-h-[90vh] sm:rounded-[28px]',
          sizeClasses[size],
        )}
      >
        <div className="shrink-0 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5 md:px-7">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
              {description ? <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p> : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {headerActions}
              {!hideCloseButton ? (
                <button
                  type="button"
                  className="rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
                  onClick={onClose}
                >
                  닫기
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 md:px-7', bodyClassName)}>
          {children}
        </div>

        {footer ? <div className="shrink-0 border-t border-slate-200 px-4 py-3 sm:px-6 sm:py-4 md:px-7">{footer}</div> : null}
      </div>
    </div>
  );
}
