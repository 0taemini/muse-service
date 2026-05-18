import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
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
import photo2025Mt from '../../../../2025뮤즈MT사진.png';
import photo2025Regular from '../../../../2025정기공연사진.png';
import poster2024Regular from '../../../../2024정기공연.jpg';
import poster2025Early from '../../../../2025초반공연포스터.jpg';

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

function createDemoMemory(imageId: number, imageDate: string, url: string, title: string): PhotoImage {
  return {
    imageId,
    imageType: 'MEMORY',
    albumId: null,
    title,
    description: null,
    imageDate,
    displayOrder: 0,
    status: 'READY',
    originalKey: '',
    createdByUserId: 0,
    createdByNickname: 'demo',
    createdAt: '',
    updatedAt: '',
    variants: [
      {
        variantType: 'THUMB_320',
        s3Key: '',
        url,
        width: null,
        height: null,
        contentType: 'image/*',
      },
    ],
  };
}

function thumbnailRotation(dateKey: string) {
  const total = dateKey.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return [-5.5, 4.2, -3.8, 5.8, -6.2, 4.9][total % 6];
}

function memoryLabel(dateKey: string) {
  const labels = ['LIVE', 'REHEARSAL', 'MT', 'SETLIST'];
  const total = dateKey.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return labels[total % labels.length];
}

function ticketRotation(dateKey: string) {
  const total = dateKey.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return [-8, 5, -6, 7][total % 4];
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
  const detailModalHistoryRef = useRef(false);

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

  const demoMemories = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = String(monthDate.getMonth() + 1).padStart(2, '0');

    return [
      createDemoMemory(-1, `${year}-${month}-05`, photo2025Mt, '임시 추억 1'),
      createDemoMemory(-2, `${year}-${month}-06`, photo2025Regular, '임시 추억 2'),
      createDemoMemory(-3, `${year}-${month}-07`, poster2024Regular, '임시 추억 3'),
      createDemoMemory(-4, `${year}-${month}-12`, poster2025Early, '임시 추억 4'),
      createDemoMemory(-5, `${year}-${month}-13`, photo2025Regular, '임시 추억 5'),
      createDemoMemory(-6, `${year}-${month}-14`, photo2025Mt, '임시 추억 6'),
    ];
  }, [monthDate]);
  const memories = [...(memoriesQuery.data?.data ?? []), ...demoMemories];
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

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!isDetailOpen || !detailModalHistoryRef.current) {
        return;
      }

      if (!event.state?.memoryCalendarDetailOpen) {
        detailModalHistoryRef.current = false;
        setIsDetailOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDetailOpen]);

  const openDetailModal = () => {
    if (!isDetailOpen) {
      window.history.pushState(
        {
          ...window.history.state,
          memoryCalendarDetailOpen: true,
        },
        '',
      );
      detailModalHistoryRef.current = true;
    }

    setIsDetailOpen(true);
  };

  const closeDetailModal = () => {
    if (detailModalHistoryRef.current && window.history.state?.memoryCalendarDetailOpen) {
      window.history.back();
      return;
    }

    detailModalHistoryRef.current = false;
    setIsDetailOpen(false);
  };

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

    openDetailModal();
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
        <div className="relative overflow-hidden rounded-[20px] border border-[#dcc89d] bg-[#fff8eb] px-2.5 py-4 shadow-[0_18px_34px_rgba(100,72,24,0.12)] md:rounded-[28px] md:px-5 md:py-6">
          <span className="pointer-events-none absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#f7f2ea] md:h-8 md:w-8" />
          <span className="pointer-events-none absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#f7f2ea] md:h-8 md:w-8" />
          <div className="mb-4 flex items-center justify-between gap-2 rounded-[14px] border border-[#ead9b5] bg-white/72 px-2 py-2 shadow-sm">
            <Button variant="ghost" size="sm" onClick={() => moveMonth(-1)}>
              이전
            </Button>
            <div className="text-center">
              <p className="text-[10px] font-bold tracking-[0.28em] text-[#9b7a36]">MUSE MEMORY TICKET</p>
              <p className="text-lg font-semibold text-[#241b42]">{monthLabel(monthDate)}</p>
            </div>
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
          <div className="mb-2 border-t border-dashed border-[#d6bf8d]" />
          <div
            className="grid grid-cols-7 overflow-hidden rounded-[14px] border border-[#ead9b5] bg-white [touch-action:pan-y] md:rounded-[18px]"
            onTouchStart={handleCalendarTouchStart}
            onTouchEnd={handleCalendarTouchEnd}
          >
            {days.map((day) => {
              const dayImages = memoriesByDate[day.dateKey] ?? [];
              const thumbnail = dayImages[0] ? variantUrl(dayImages[0], ['THUMB_320', 'THUMB_480', 'DETAIL_1200']) : '';
              const isToday = day.dateKey === todayDate;
              const rotation = thumbnailRotation(day.dateKey);
              const label = memoryLabel(day.dateKey);
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
                  {thumbnail ? (
                    <>
                      <img
                        src={thumbnail}
                        alt=""
                        className="absolute inset-[2px] h-[calc(100%-4px)] w-[calc(100%-4px)] rounded-[4px] object-cover shadow-[0_4px_10px_rgba(15,23,42,0.18)] transition duration-200 hover:rotate-0"
                        style={{ transform: `rotate(${rotation}deg)` }}
                        loading="lazy"
                      />
                      <span
                        className="absolute -right-1 top-1 z-20 inline-flex items-center gap-1 rounded-[2px] border border-[#d8c38e] bg-[#fff4d8] px-1.5 py-1 text-[7px] font-bold leading-none tracking-[0.08em] text-[#5f4313] shadow-[0_2px_6px_rgba(73,52,18,0.22)] sm:right-0 sm:top-1.5 sm:px-2 sm:text-[8px]"
                        style={{ transform: `rotate(${ticketRotation(day.dateKey)}deg)` }}
                      >
                        <span className="inline-block h-1 w-1 rounded-full bg-[#c8a65b]" />
                        {label}
                      </span>
                      <span className="pointer-events-none absolute inset-x-1 bottom-1 z-20 flex items-center justify-between gap-[2px] rounded-[2px] bg-white/82 px-1 py-0.5 shadow-sm sm:inset-x-1.5 sm:bottom-1.5">
                        {[0, 1, 2, 3, 4].map((index) => (
                          <span key={`${day.dateKey}-stub-${index}`} className="h-[1px] flex-1 bg-[#5f4313]/55" />
                        ))}
                      </span>
                    </>
                  ) : null}
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

        <aside className="relative overflow-hidden rounded-[20px] border border-[#dcc89d] bg-[#fff8eb] p-4 shadow-[0_18px_34px_rgba(100,72,24,0.12)] md:rounded-[28px] md:p-5">
          <span className="pointer-events-none absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#f7f2ea] md:h-8 md:w-8" />
          <span className="pointer-events-none absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#f7f2ea] md:h-8 md:w-8" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.28em] text-[#9b7a36]">ADMIT ONE</p>
              <p className="text-xs font-semibold text-[#6f678b]">선택한 날짜</p>
              <h3 className="mt-1 text-xl font-semibold text-[#241b42]">{selectedDateLabel(selectedDate)}</h3>
            </div>
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <Button variant="ghost" size="sm" onClick={openDetailModal}>
                  추가
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={openDetailModal}>
                보기
              </Button>
            </div>
          </div>

          <div className="my-4 border-t border-dashed border-[#d6bf8d]" />

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

      <Modal open={isDetailOpen} title={selectedDateLabel(selectedDate)} onClose={closeDetailModal} size="lg">
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
