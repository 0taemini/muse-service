import { ChangeEvent, InputHTMLAttributes, useId } from 'react';
import { cn } from '@shared/lib/cn';

type FilePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  file: File | null;
  onFileChange: (file: File | null) => void;
};

export function FilePicker({ file, onFileChange, className, id, ...props }: FilePickerProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFileChange(event.target.files?.[0] ?? null);
  };

  return (
    <div
      className={cn(
        'flex min-h-12 w-full items-center gap-2 rounded-2xl border border-slate-300/90 bg-white/90 p-1.5 transition focus-within:border-[#14323f] focus-within:ring-4 focus-within:ring-[#d8e5e9]',
        className,
      )}
    >
      <input id={inputId} type="file" className="sr-only" onChange={handleChange} {...props} />
      <label
        htmlFor={inputId}
        className="inline-flex min-h-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#f3efff] px-3 text-sm font-semibold text-[#35285f] ring-1 ring-[rgba(95,75,182,0.12)] transition hover:bg-[#ebe4ff]"
      >
        파일 선택
      </label>
      <span className={cn('min-w-0 flex-1 truncate px-1 text-sm', file ? 'text-slate-800' : 'text-slate-400')}>
        {file ? file.name : '선택된 파일 없음'}
      </span>
    </div>
  );
}
