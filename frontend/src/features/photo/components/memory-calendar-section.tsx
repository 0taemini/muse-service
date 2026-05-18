import { useMemo, useRef, useState, type TouchEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toApiMessage } from '@features/auth/api/auth-api';
import { useAuthStore } from '@features/auth/store/auth-store';
import { photoApi, type PhotoImage, variantUrl } from '@features/photo/api/photo-api';
import { Button } from '@shared/components/ui/button';
import { FilePicker } from '@shared/components/ui/file-picker';
import { FormField } from '@shared/components/ui/form-field';
import { Input } from '@shared/components/ui/input';
import { Modal } from '@shared/components/ui/modal';
import { StatePanel } from '@shared/components/ui/state-panel';
import { cn } from '@shared/lib/cn';

type CalendarDay = {
  dateKey: string;
  day: number;
  inCurrentMonth: boolean;
};

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function buildCalendarDays(monthDate: Date): CalendarDay[] {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const calendarStart = addDays(firstDay, -firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(calendarStart, index);
    return {
      dateKey: toDateInput(date),
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(date);
}

function selectedDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(`${dateKey}T00:00:00`));
}

function canOpenImageDetail() {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
}

export function MemoryCalendarSection() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = Boolean(accessToken);
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateInput(new Date()));
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailImage, setDetailImage] = useState<PhotoImage | null>(null);
  const [detailImages, setDetailImages] = useState<PhotoImage[]>([]);
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const calendarSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressDateSelectRef = useRef(false);

  const days = useMemo(() => buildCalendarDays(monthDate), [monthDate]);
  const range = useMemo(
    () => ({
      startDate: days[0]?.dateKey ?? toDateInput(monthDate),
      endDate: days[days.length - 1]?.dateKey ?? toDateInput(monthDate),
    }),
    [days, monthDate],
  );

  const memoriesQuery = useQuery({
    queryKey: ['photo-memories', range.startDate, range.endDate],
    queryFn: () => photoApi.getMemories(range),
  });

  const memories = memoriesQuery.data?.data ?? [];
  const memoriesByDate = useMemo(
    () =>
      memories.reduce<Record<string, PhotoImage[]>>((groups, image) => {
        if (!image.imageDate) {
          return groups;
        }
        groups[image.imageDate] = [...(groups[image.imageDate] ?? []), image];
        return groups;
      }, {}),
    [memories],
  );
  const todayDate = toDateInput(new Date());
  const selectedMemories = memoriesByDate[selectedDate] ?? [];

  const openImageDetail = (image: PhotoImage, images: PhotoImage[] = selectedMemories) => {
    if (!canOpenImageDetail()) {
      return;
    }

    const galleryImages = images.length ? images : [image];
    const imageIndex = Math.max(
      0,
      galleryImages.findIndex((item) => item.imageId === image.imageId),
    );

    setDetailImages(galleryImages);
    setDetailImageIndex(imageIndex);
    setDetailImage(galleryImages[imageIndex]);
  };

  const openPreviewImage = (image: PhotoImage) => {
    if (canOpenImageDetail()) {
      openImageDetail(image, selectedMemories);
      return;
    }

    setIsDetailOpen(true);
  };

  const closeImageDetail = () => {
    setDetailImage(null);
    setDetailImages([]);
    setDetailImageIndex(0);
  };

  const moveDetailImage = (amount: number) => {
    if (!detailImages.length) {
      return;
    }

    const nextIndex = (detailImageIndex + amount + detailImages.length) % detailImages.length;
    setDetailImageIndex(nextIndex);
    setDetailImage(detailImages[nextIndex]);
  };

  const moveMonth = (amount: number) => {
    setMonthDate((date) => new Date(date.getFullYear(), date.getMonth() + amount, 1));
  };

  const selectDate = (dateKey: string) => {
    if (suppressDateSelectRef.current) {
      suppressDateSelectRef.current = false;
      return;
    }

    setSelectedDate(dateKey);
  };

  const handleCalendarTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    calendarSwipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleCalendarTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = calendarSwipeStartRef.current;
    const touch = event.changedTouches[0];
    calendarSwipeStartRef.current = null;

    if (!start) {
      return;
    }

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const isHorizontalSwipe = Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4;

    if (!isHorizontalSwipe) {
      return;
    }

    suppressDateSelectRef.current = true;
    moveMonth(deltaX < 0 ? 1 : -1);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error('업로드할 사진을 선택해주세요.');
      }

      const upload = await photoApi.createUpload({
        imageType: 'MEMORY',
        albumId: null,
        title: title.trim() || null,
        description: description.trim() || null,
        imageDate: selectedDate,
        displayOrder: null,
        fileName: selectedFile.name,
        contentType: selectedFile.type,
        fileSizeBytes: selectedFile.size,
      });

      await photoApi.uploadFileToS3(upload.data.uploadUrl, selectedFile);
      return upload.data;
    },
    onSuccess: async () => {
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      await queryClient.invalidateQueries({ queryKey: ['photo-memories'] });
    },
  });

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-[2rem] font-semibold tracking-tight text-[#241b42] md:text-[2.35rem]">추억 캘린더</h2>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[20px] border border-[rgba(36,27,66,0.08)] bg-white px-2.5 py-4 shadow-[0_12px_28px_rgba(52,35,110,0.05)] md:rounded-[28px] md:px-5 md:py-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => moveMonth(-1)}>
              이전
            </Button>
            <p className="text-lg font-semibold text-[#241b42]">{monthLabel(monthDate)}</p>
            <Button variant="ghost" size="sm" onClick={() => moveMonth(1)}>
              다음
            </Button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-500 md:text-sm">
            {weekdayLabels.map((label, index) => (
              <div key={label} className={cn('py-2', index === 0 ? 'text-rose-500' : '', index === 6 ? 'text-sky-500' : '')}>
                {label}
              </div>
            ))}
          </div>
          <div
            className="grid grid-cols-7 overflow-hidden rounded-[14px] border border-slate-100 [touch-action:pan-y] md:rounded-[18px]"
            onTouchStart={handleCalendarTouchStart}
            onTouchEnd={handleCalendarTouchEnd}
          >
            {days.map((day) => {
              const dayImages = memoriesByDate[day.dateKey] ?? [];
              const thumbnail = dayImages[0] ? variantUrl(dayImages[0], ['THUMB_320', 'THUMB_480', 'DETAIL_1200']) : '';
              const isToday = day.dateKey === todayDate;
              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() => selectDate(day.dateKey)}
                  className={cn(
                    'relative aspect-square min-h-[48px] border-b border-r border-slate-100 bg-white text-left transition hover:bg-slate-50 sm:min-h-[56px]',
                    !day.inCurrentMonth ? 'bg-slate-50/70 text-slate-300' : 'text-slate-700',
                  )}
                >
                  {thumbnail ? <img src={thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : null}
                  <span
                    className={cn(
                      'absolute left-1 top-1 z-30 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold shadow-sm sm:left-1.5 sm:top-1.5 sm:h-6 sm:min-w-6 sm:text-xs',
                      isToday ? 'bg-rose-500 text-white' : 'bg-white/88',
                      !isToday && !day.inCurrentMonth ? 'text-slate-300' : '',
                    )}
                  >
                    {day.day}
                  </span>
                  {dayImages.length > 1 ? (
                    <span className="absolute bottom-1 right-1 z-10 rounded-full bg-slate-950/70 px-1.5 py-0.5 text-[8px] font-bold leading-none text-white sm:bottom-1.5 sm:right-1.5 sm:px-2 sm:py-1 sm:text-[10px] sm:leading-none">
                      +{dayImages.length - 1}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="rounded-[20px] border border-[rgba(95,75,182,0.1)] bg-white p-4 shadow-[0_12px_28px_rgba(52,35,110,0.05)] md:rounded-[28px] md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#6f678b]">선택한 날짜</p>
              <h3 className="mt-1 text-xl font-semibold text-[#241b42]">{selectedDateLabel(selectedDate)}</h3>
            </div>
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <Button variant="ghost" size="sm" onClick={() => setIsDetailOpen(true)}>
                  추가
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => setIsDetailOpen(true)}>
                보기
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {memoriesQuery.isLoading ? (
              Array.from({ length: 6 }).map((_, index) => <div key={index} className="aspect-square animate-pulse rounded-[18px] bg-slate-100" />)
            ) : selectedMemories.length ? (
              selectedMemories.slice(0, 6).map((image) => {
                const imageUrl = variantUrl(image, ['THUMB_320', 'THUMB_480']);

                return (
                  <button
                    key={image.imageId}
                    type="button"
                    className="overflow-hidden rounded-[18px] md:cursor-pointer"
                    onClick={() => openPreviewImage(image)}
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt={image.title ?? '추억 사진'} className="aspect-square w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center bg-slate-100 text-xs font-semibold text-slate-400">
                        처리 중
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="col-span-3">
                <StatePanel title="사진이 없습니다." description="이 날짜에 남겨진 추억 사진이 없습니다." />
              </div>
            )}
          </div>
        </aside>
      </div>

      <Modal open={isDetailOpen} title={selectedDateLabel(selectedDate)} onClose={() => setIsDetailOpen(false)} size="lg">
        <div className="space-y-5">
          {memoriesQuery.isError ? (
            <StatePanel tone="danger" title="사진을 불러오지 못했습니다." description={toApiMessage(memoriesQuery.error)} />
          ) : selectedMemories.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedMemories.map((image) => {
                const imageUrl = variantUrl(image, ['THUMB_480', 'THUMB_320']);

                return (
                  <button
                    key={image.imageId}
                    type="button"
                    className="overflow-hidden rounded-[18px] border border-slate-200 bg-white text-left md:cursor-pointer"
                    aria-disabled={!canOpenImageDetail()}
                    onClick={() => openImageDetail(image, selectedMemories)}
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt={image.title ?? '추억 사진'} className="aspect-[4/3] w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-100 text-sm font-semibold text-slate-400">
                        처리 중
                      </div>
                    )}
                    <div className="p-3">
                      <p className="font-semibold text-slate-900">{image.title || '제목 없는 사진'}</p>
                      {image.description ? <p className="mt-1 text-sm leading-6 text-slate-500">{image.description}</p> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <StatePanel title="사진이 없습니다." />
          )}

          {isAuthenticated ? (
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-900">추억 남기기</h4>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <FormField label="제목">
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="선택 입력" />
                </FormField>
                <FormField label="사진">
                  <FilePicker file={selectedFile} accept="image/jpeg,image/png,image/webp" onFileChange={setSelectedFile} />
                </FormField>
                <FormField label="설명" className="md:col-span-2">
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-24 w-full resize-y rounded-2xl border border-slate-300/90 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#14323f] focus:ring-4 focus:ring-[#d8e5e9]"
                    placeholder="선택 입력"
                  />
                </FormField>
              </div>
              {uploadMutation.isError ? <p className="mt-3 text-sm font-semibold text-rose-600">{toApiMessage(uploadMutation.error)}</p> : null}
              {uploadMutation.isSuccess ? <p className="mt-3 text-sm font-semibold text-emerald-700">업로드했습니다. 준비가 끝나면 사진이 표시됩니다.</p> : null}
              <div className="mt-4 flex justify-end">
                <Button disabled={!selectedFile || uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>
                  {uploadMutation.isPending ? '업로드 중...' : '사진 올리기'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal open={detailImage !== null} title={detailImage?.title || '추억 사진'} onClose={closeImageDetail} size="xl">
        {detailImage ? (
          <figure>
            <div className="relative">
              {variantUrl(detailImage, ['DETAIL_1200', 'THUMB_480', 'THUMB_320']) ? (
                <img src={variantUrl(detailImage, ['DETAIL_1200', 'THUMB_480', 'THUMB_320'])} alt={detailImage.title ?? '추억 사진'} className="max-h-[70vh] w-full rounded-[8px] object-contain" />
              ) : (
                <div className="flex h-72 w-full items-center justify-center rounded-[8px] bg-slate-100 text-sm font-semibold text-slate-400">
                  사진을 준비하고 있습니다.
                </div>
              )}
              {detailImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/65 text-xl font-bold text-white shadow-lg transition hover:bg-slate-950/80"
                    onClick={() => moveDetailImage(-1)}
                    aria-label="이전 사진"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/65 text-xl font-bold text-white shadow-lg transition hover:bg-slate-950/80"
                    onClick={() => moveDetailImage(1)}
                    aria-label="다음 사진"
                  >
                    ›
                  </button>
                </>
              ) : null}
            </div>
            {detailImages.length > 1 ? (
              <p className="mt-3 text-center text-xs font-semibold text-slate-500">
                {detailImageIndex + 1} / {detailImages.length}
              </p>
            ) : null}
            {detailImage.description ? <figcaption className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{detailImage.description}</figcaption> : null}
            {detailImages.length > 1 ? (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {detailImages.map((image, index) => {
                  const imageUrl = variantUrl(image, ['THUMB_320', 'THUMB_480']);

                  return (
                    <button
                      key={image.imageId}
                      type="button"
                      className={cn(
                        'h-16 w-16 shrink-0 overflow-hidden rounded-[8px] border bg-slate-100 transition',
                        index === detailImageIndex ? 'border-[#5a43ba] ring-2 ring-[#5a43ba]/25' : 'border-slate-200 opacity-70 hover:opacity-100',
                      )}
                      onClick={() => {
                        setDetailImageIndex(index);
                        setDetailImage(image);
                      }}
                    >
                      {imageUrl ? <img src={imageUrl} alt={image.title ?? '추억 사진'} className="h-full w-full object-cover" /> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </figure>
        ) : null}
      </Modal>
    </section>
  );
}
