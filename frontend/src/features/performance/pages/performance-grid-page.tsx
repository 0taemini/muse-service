import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toApiMessage } from '@features/auth/api/auth-api';
import {
  performanceApi,
  type ChatRoomSummary,
  type PerformanceSessionColumn,
  type PerformanceSongDetail,
  type PerformanceSongSummary,
  type SelectionStatus,
} from '@features/performance/api/performance-api';
import { userApi } from '@features/user/api/user-api';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';
import { FormField } from '@shared/components/ui/form-field';
import { InlineNotice } from '@shared/components/ui/inline-notice';
import { Input } from '@shared/components/ui/input';
import { Select } from '@shared/components/ui/select';
import { StatePanel } from '@shared/components/ui/state-panel';
import { StatusBadge } from '@shared/components/ui/status-badge';
import { cn } from '@shared/lib/cn';

type StageId = 'catalog' | 'review' | 'assignment';

type SongDraft = {
  songTitle: string;
  singer: string;
  orderNo: string;
  isSheet: boolean;
};

type CreateSongForm = SongDraft;

type ColumnForm = {
  sessionName: string;
  displayOrder: string;
  isRequired: boolean;
};

type ColumnDraft = {
  performanceSessionColumnId: number;
  sessionName: string;
  displayOrder: string;
  isRequired: boolean;
  baseSessionTypeId: number | null;
  sessionSource: 'DEFAULT' | 'CUSTOM';
};

const stages: { id: StageId; label: string; helper: string }[] = [
  {
    id: 'catalog',
    label: '곡 등록',
    helper: '곡 제목, 가수, 악보 유무만 빠르게 쌓고 기본 상태는 모두 후보로 시작합니다.',
  },
  {
    id: 'review',
    label: '선곡 심사',
    helper: '사람들이 들어본 뒤 후보, 확정, 제외 상태를 바로 바꿉니다.',
  },
  {
    id: 'assignment',
    label: '세션 배정',
    helper: '확정된 곡만 따로 모아서 세션 담당자와 합주방 대상을 정리합니다.',
  },
];

const emptyCreateSongForm: CreateSongForm = {
  songTitle: '',
  singer: '',
  orderNo: '',
  isSheet: false,
};

const emptyColumnForm: ColumnForm = {
  sessionName: '',
  displayOrder: '',
  isRequired: true,
};

const statusMeta: Record<
  SelectionStatus,
  {
    label: string;
    tone: 'confirmed' | 'candidate' | 'out';
    cardClassName: string;
  }
> = {
  CONFIRMED: {
    label: '확정',
    tone: 'confirmed',
    cardClassName: 'border-emerald-200 bg-emerald-50/70',
  },
  NOT_BAD: {
    label: '후보',
    tone: 'candidate',
    cardClassName: 'border-amber-200 bg-amber-50/70',
  },
  OUT: {
    label: '제외',
    tone: 'out',
    cardClassName: 'border-rose-200 bg-rose-50/70',
  },
};

const toSongDraft = (song: PerformanceSongSummary): SongDraft => ({
  songTitle: song.songTitle,
  singer: song.singer,
  orderNo: String(song.orderNo),
  isSheet: song.isSheet,
});

const toColumnDraft = (column: PerformanceSessionColumn): ColumnDraft => ({
  performanceSessionColumnId: column.performanceSessionColumnId,
  sessionName: column.sessionName,
  displayOrder: String(column.displayOrder),
  isRequired: column.isRequired,
  baseSessionTypeId: column.baseSessionTypeId,
  sessionSource: column.sessionSource,
});

function isSameRecordValue(
  left: Record<number, Record<number, string>>,
  right: Record<number, Record<number, string>>,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isSameSongDraftMap(left: Record<number, SongDraft>, right: Record<number, SongDraft>) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isSameColumnDrafts(left: ColumnDraft[], right: ColumnDraft[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isSameNumberArray(left: number[], right: number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function buildAssignmentDraft(
  songs: PerformanceSongSummary[],
  songDetailsById: Map<number, PerformanceSongDetail>,
  columns: PerformanceSessionColumn[],
) {
  return Object.fromEntries(
    songs.map((song) => {
      const detail = songDetailsById.get(song.performanceSongId);
      const sessionByColumnId = new Map(
        (detail?.sessions ?? [])
          .filter((session) => session.performanceSessionColumnId !== null)
          .map((session) => [session.performanceSessionColumnId as number, session]),
      );

      return [
        song.performanceSongId,
        Object.fromEntries(
          columns.map((column) => [
            column.performanceSessionColumnId,
            sessionByColumnId.get(column.performanceSessionColumnId)?.assignedUserId?.toString() ?? '',
          ]),
        ),
      ];
    }),
  ) as Record<number, Record<number, string>>;
}

const EMPTY_ARRAY: never[] = [];

export function PerformanceGridPage() {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<StageId>('catalog');
  const [message, setMessage] = useState('');
  const [noticeTone, setNoticeTone] = useState<'success' | 'error'>('success');
  const [selectedPerformanceId, setSelectedPerformanceId] = useState<number | null>(null);
  const [createPerformanceTitle, setCreatePerformanceTitle] = useState('');
  const [createSongForm, setCreateSongForm] = useState<CreateSongForm>(emptyCreateSongForm);
  const [songDrafts, setSongDrafts] = useState<Record<number, SongDraft>>({});
  const [columnForm, setColumnForm] = useState<ColumnForm>(emptyColumnForm);
  const [columnDrafts, setColumnDrafts] = useState<ColumnDraft[]>([]);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<number, Record<number, string>>>({});
  const [selectedChatRoomSongIds, setSelectedChatRoomSongIds] = useState<number[]>([]);

  const performancesQuery = useQuery({
    queryKey: ['performances'],
    queryFn: performanceApi.getPerformances,
  });
  const performanceQuery = useQuery({
    queryKey: ['performance', selectedPerformanceId],
    queryFn: () => performanceApi.getPerformance(selectedPerformanceId!),
    enabled: selectedPerformanceId !== null,
  });
  const columnsQuery = useQuery({
    queryKey: ['performance-session-columns', selectedPerformanceId],
    queryFn: () => performanceApi.getPerformanceSessionColumns(selectedPerformanceId!),
    enabled: selectedPerformanceId !== null,
  });
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getAll,
  });
  const chatRoomsQuery = useQuery({
    queryKey: ['performance-chat-rooms', selectedPerformanceId],
    queryFn: () => performanceApi.getChatRooms(selectedPerformanceId!),
    enabled: selectedPerformanceId !== null,
  });

  const performances = useMemo(
    () => performancesQuery.data?.data ?? EMPTY_ARRAY,
    [performancesQuery.data],
  );
  const performance = performanceQuery.data?.data ?? null;
  const columns = useMemo(
    () => [...(columnsQuery.data?.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [columnsQuery.data],
  );
  const users = useMemo(() => usersQuery.data?.data ?? EMPTY_ARRAY, [usersQuery.data]);
  const visibleChatRooms = useMemo(
    () => chatRoomsQuery.data?.data ?? EMPTY_ARRAY,
    [chatRoomsQuery.data],
  );
  const songs = useMemo(
    () => [...(performance?.songs ?? [])].sort((a, b) => a.orderNo - b.orderNo),
    [performance],
  );
  const confirmedSongs = useMemo(
    () => songs.filter((song) => song.selectionStatus === 'CONFIRMED'),
    [songs],
  );

  const songDetailQueries = useQueries({
    queries: (selectedPerformanceId ? songs : []).map((song) => ({
      queryKey: ['performance-song', selectedPerformanceId, song.performanceSongId],
      queryFn: () => performanceApi.getSong(selectedPerformanceId!, song.performanceSongId),
      enabled: selectedPerformanceId !== null,
      staleTime: 60000,
    })),
  });

  const songDetailsById = useMemo(
    () =>
      new Map(
        songDetailQueries
          .map((query) => query.data?.data ?? null)
          .filter((detail): detail is PerformanceSongDetail => detail !== null)
          .map((detail) => [detail.performanceSongId, detail] as const),
      ),
    [songDetailQueries],
  );

  const creatableConfirmedSongs = useMemo(
    () =>
      confirmedSongs.filter((song) => {
        const detail = songDetailsById.get(song.performanceSongId);
        return detail?.chatRoomCreated === false;
      }),
    [confirmedSongs, songDetailsById],
  );

  const summaryCount = useMemo(
    () => ({
      total: songs.length,
      candidate: songs.filter((song) => song.selectionStatus === 'NOT_BAD').length,
      confirmed: confirmedSongs.length,
      out: songs.filter((song) => song.selectionStatus === 'OUT').length,
    }),
    [confirmedSongs.length, songs],
  );

  useEffect(() => {
    if (performances.length === 0) {
      setSelectedPerformanceId(null);
      return;
    }

    if (
      selectedPerformanceId === null ||
      !performances.some((item) => item.performanceId === selectedPerformanceId)
    ) {
      setSelectedPerformanceId(performances[0].performanceId);
    }
  }, [performances, selectedPerformanceId]);

  useEffect(() => {
    const nextDrafts = Object.fromEntries(songs.map((song) => [song.performanceSongId, toSongDraft(song)]));
    setSongDrafts((current) => (isSameSongDraftMap(current, nextDrafts) ? current : nextDrafts));
  }, [songs]);

  useEffect(() => {
    const nextColumnDrafts = columns.map(toColumnDraft);
    setColumnDrafts((current) => (isSameColumnDrafts(current, nextColumnDrafts) ? current : nextColumnDrafts));
    setColumnForm((current) => ({
      ...current,
      displayOrder: current.displayOrder || String(columns.length + 1),
    }));
  }, [columns]);

  useEffect(() => {
    const nextDrafts = buildAssignmentDraft(confirmedSongs, songDetailsById, columns);
    setAssignmentDrafts((current) => (isSameRecordValue(current, nextDrafts) ? current : nextDrafts));
  }, [columns, confirmedSongs, songDetailsById]);

  useEffect(() => {
    const nextSongIds = creatableConfirmedSongs.map((song) => song.performanceSongId);
    setSelectedChatRoomSongIds((current) => (isSameNumberArray(current, nextSongIds) ? current : nextSongIds));
  }, [creatableConfirmedSongs]);

  const setSuccessMessage = (nextMessage: string) => {
    setNoticeTone('success');
    setMessage(nextMessage);
  };

  const setErrorMessage = (nextMessage: string) => {
    setNoticeTone('error');
    setMessage(nextMessage);
  };

  const invalidatePerformance = async (performanceId: number) => {
    await queryClient.invalidateQueries({ queryKey: ['performances'] });
    await queryClient.invalidateQueries({ queryKey: ['performance', performanceId] });
    await queryClient.invalidateQueries({ queryKey: ['performance-session-columns', performanceId] });
    await queryClient.invalidateQueries({ queryKey: ['performance-song', performanceId] });
    await queryClient.invalidateQueries({ queryKey: ['performance-chat-rooms', performanceId] });
  };

  const createPerformanceMutation = useMutation({
    mutationFn: performanceApi.createPerformance,
    onSuccess: async (response) => {
      setSuccessMessage(response.message);
      setCreatePerformanceTitle('');
      await queryClient.invalidateQueries({ queryKey: ['performances'] });
      setSelectedPerformanceId(response.data.performanceId);
    },
    onError: (error) => setErrorMessage(toApiMessage(error)),
  });

  const createSongMutation = useMutation({
    mutationFn: ({
      performanceId,
      payload,
    }: {
      performanceId: number;
      payload: Parameters<typeof performanceApi.createSong>[1];
    }) => performanceApi.createSong(performanceId, payload),
    onSuccess: async (response) => {
      setSuccessMessage(response.message);
      setCreateSongForm(emptyCreateSongForm);
      await invalidatePerformance(response.data.performanceId);
    },
    onError: (error) => setErrorMessage(toApiMessage(error)),
  });

  const updateSongMutation = useMutation({
    mutationFn: ({
      performanceId,
      songId,
      payload,
    }: {
      performanceId: number;
      songId: number;
      payload: Parameters<typeof performanceApi.updateSong>[2];
    }) => performanceApi.updateSong(performanceId, songId, payload),
    onSuccess: async (response) => {
      setSuccessMessage(response.message);
      await invalidatePerformance(response.data.performanceId);
    },
    onError: (error) => setErrorMessage(toApiMessage(error)),
  });

  const updateSongStatusMutation = useMutation({
    mutationFn: ({
      performanceId,
      songId,
      selectionStatus,
    }: {
      performanceId: number;
      songId: number;
      selectionStatus: SelectionStatus;
    }) => performanceApi.updateSongStatus(performanceId, songId, { selectionStatus }),
    onSuccess: async (response) => {
      setSuccessMessage(response.message);
      await invalidatePerformance(response.data.performanceId);
    },
    onError: (error) => setErrorMessage(toApiMessage(error)),
  });

  const deleteSongMutation = useMutation({
    mutationFn: ({
      performanceId,
      songId,
    }: {
      performanceId: number;
      songId: number;
    }) => performanceApi.deleteSong(performanceId, songId),
    onSuccess: async (_, variables) => {
      setSuccessMessage('곡을 삭제했습니다.');
      await invalidatePerformance(variables.performanceId);
    },
    onError: (error) => setErrorMessage(toApiMessage(error)),
  });

  const createColumnMutation = useMutation({
    mutationFn: ({
      performanceId,
      payload,
    }: {
      performanceId: number;
      payload: Parameters<typeof performanceApi.createPerformanceSessionColumn>[1];
    }) => performanceApi.createPerformanceSessionColumn(performanceId, payload),
    onSuccess: async (_, variables) => {
      setSuccessMessage('세션 컬럼을 추가했습니다.');
      setColumnForm({
        ...emptyColumnForm,
        displayOrder: String(columns.length + 2),
      });
      await invalidatePerformance(variables.performanceId);
    },
    onError: (error) => setErrorMessage(toApiMessage(error)),
  });

  const updateColumnMutation = useMutation({
    mutationFn: ({
      performanceId,
      columnId,
      payload,
    }: {
      performanceId: number;
      columnId: number;
      payload: Parameters<typeof performanceApi.updatePerformanceSessionColumn>[2];
    }) => performanceApi.updatePerformanceSessionColumn(performanceId, columnId, payload),
    onSuccess: async (_, variables) => {
      setSuccessMessage('세션 컬럼을 저장했습니다.');
      await invalidatePerformance(variables.performanceId);
    },
    onError: (error) => setErrorMessage(toApiMessage(error)),
  });

  const updateAssignmentsMutation = useMutation({
    mutationFn: ({
      performanceId,
      songId,
      sessions,
    }: {
      performanceId: number;
      songId: number;
      sessions: Array<{ performanceSessionColumnId: number; assignedUserId: string }>;
    }) =>
      performanceApi.updateSongSessions(performanceId, songId, {
        sessions: sessions.map((session) => ({
          performanceSessionColumnId: session.performanceSessionColumnId,
          assignedUserId: session.assignedUserId ? Number(session.assignedUserId) : null,
        })),
      }),
    onSuccess: async (response) => {
      setSuccessMessage(response.message);
      await invalidatePerformance(response.data.performanceId);
    },
    onError: (error) => setErrorMessage(toApiMessage(error)),
  });

  const createChatRoomsMutation = useMutation({
    mutationFn: ({
      performanceId,
      performanceSongIds,
    }: {
      performanceId: number;
      performanceSongIds: number[];
    }) => performanceApi.createChatRooms(performanceId, { performanceSongIds }),
    onSuccess: async (response, variables) => {
      setSuccessMessage(response.message);
      await invalidatePerformance(variables.performanceId);
    },
    onError: (error) => setErrorMessage(toApiMessage(error)),
  });

  return (
    <section className="space-y-6">
      {message ? <InlineNotice tone={noticeTone}>{message}</InlineNotice> : null}

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="space-y-4 bg-[#14323f] text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                  Performances
                </p>
                <h2 className="mt-2 text-2xl font-semibold">공연 관리</h2>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15">
                {performances.length}
              </span>
            </div>

            <div className="space-y-3">
              {performances.length ? (
                performances.map((item) => (
                  <button
                    key={item.performanceId}
                    type="button"
                    onClick={() => setSelectedPerformanceId(item.performanceId)}
                    className={cn(
                      'w-full rounded-[20px] border px-4 py-4 text-left transition',
                      selectedPerformanceId === item.performanceId
                        ? 'border-white/70 bg-white text-[#14323f]'
                        : 'border-white/15 bg-white/8 hover:bg-white/12',
                    )}
                  >
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] opacity-70">
                      songs {item.songCount}
                    </p>
                  </button>
                ))
              ) : (
                <StatePanel
                  title="아직 공연이 없습니다"
                  description="공연을 먼저 만들면 아래 단계 흐름을 바로 이어서 사용할 수 있습니다."
                  tone="inverse"
                />
              )}
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="section-kicker">New Performance</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">공연 추가</h3>
            </div>

            <FormField label="공연 제목" hint="예: 2026 봄 정기공연">
              <Input
                value={createPerformanceTitle}
                onChange={(event) => setCreatePerformanceTitle(event.target.value)}
                placeholder="공연 제목 입력"
              />
            </FormField>

            <Button
              className="w-full"
              disabled={!createPerformanceTitle.trim() || createPerformanceMutation.isPending}
              onClick={() => createPerformanceMutation.mutate({ title: createPerformanceTitle.trim() })}
            >
              {createPerformanceMutation.isPending ? '공연 생성 중...' : '공연 생성'}
            </Button>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="section-kicker">Performance Workflow</p>
                <h2 className="text-3xl font-semibold text-slate-900">
                  {performance?.title ?? '공연을 선택해 주세요'}
                </h2>
                <p className="text-sm leading-7 text-slate-600">
                  곡을 먼저 쌓고, 함께 듣고 심사한 뒤, 확정된 곡만 세션을 배정하는 흐름으로 정리했습니다.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {stages.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStage(item.id)}
                    className={cn(
                      'rounded-[20px] border px-4 py-3 text-left text-sm font-semibold transition',
                      stage === item.id
                        ? 'border-[#4e3b9d] bg-[#f1ecff] text-[#2f225b] shadow-[0_12px_28px_rgba(78,59,157,0.12)]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">전체 곡</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">{summaryCount.total}</p>
              </div>
              <div className="rounded-[22px] border border-amber-200 bg-amber-50/70 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">후보</p>
                <p className="mt-3 text-2xl font-semibold text-amber-800">{summaryCount.candidate}</p>
              </div>
              <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/70 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">확정</p>
                <p className="mt-3 text-2xl font-semibold text-emerald-800">{summaryCount.confirmed}</p>
              </div>
              <div className="rounded-[22px] border border-rose-200 bg-rose-50/70 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">제외</p>
                <p className="mt-3 text-2xl font-semibold text-rose-800">{summaryCount.out}</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-[rgba(95,75,182,0.12)] bg-[#faf8ff] px-5 py-4">
              <p className="text-sm font-semibold text-[#4e3b9d]">
                {stages.find((item) => item.id === stage)?.label}
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {stages.find((item) => item.id === stage)?.helper}
              </p>
            </div>
          </Card>

          {!selectedPerformanceId ? (
            <StatePanel
              title="선택된 공연이 없습니다"
              description="왼쪽 목록에서 공연을 고르면 오른쪽 작업 영역이 열립니다."
            />
          ) : null}

          {selectedPerformanceId && stage === 'catalog' ? (
            <div className="space-y-6">
              <Card className="space-y-5">
                <div>
                  <p className="section-kicker">Song Intake</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">곡 등록</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    새 곡은 모두 후보 상태로 들어갑니다. 지금은 기본 정보와 악보 유무만 빠르게 쌓는 단계입니다.
                  </p>
                </div>

                <div className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_100px_110px_auto]">
                  <FormField label="곡 제목">
                    <Input
                      value={createSongForm.songTitle}
                      onChange={(event) =>
                        setCreateSongForm((current) => ({ ...current, songTitle: event.target.value }))
                      }
                      placeholder="곡 제목 입력"
                    />
                  </FormField>
                  <FormField label="가수">
                    <Input
                      value={createSongForm.singer}
                      onChange={(event) =>
                        setCreateSongForm((current) => ({ ...current, singer: event.target.value }))
                      }
                      placeholder="가수명 입력"
                    />
                  </FormField>
                  <FormField label="순서">
                    <Input
                      type="number"
                      value={createSongForm.orderNo}
                      onChange={(event) =>
                        setCreateSongForm((current) => ({ ...current, orderNo: event.target.value }))
                      }
                      placeholder="예: 3"
                    />
                  </FormField>
                  <div className="flex flex-col gap-2">
                    <span className="field-label">악보 유무</span>
                    <button
                      type="button"
                      onClick={() =>
                        setCreateSongForm((current) => ({ ...current, isSheet: !current.isSheet }))
                      }
                      className={cn(
                        'min-h-12 rounded-2xl border px-4 text-sm font-semibold transition',
                        createSongForm.isSheet
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                      )}
                    >
                      {createSongForm.isSheet ? 'O' : 'X'}
                    </button>
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="w-full"
                      disabled={
                        !createSongForm.songTitle.trim() ||
                        !createSongForm.singer.trim() ||
                        createSongMutation.isPending
                      }
                      onClick={() =>
                        createSongMutation.mutate({
                          performanceId: selectedPerformanceId,
                          payload: {
                            songTitle: createSongForm.songTitle.trim(),
                            singer: createSongForm.singer.trim(),
                            isSheet: createSongForm.isSheet,
                            orderNo: createSongForm.orderNo ? Number(createSongForm.orderNo) : undefined,
                            selectionStatus: 'NOT_BAD',
                          },
                        })
                      }
                    >
                      {createSongMutation.isPending ? '추가 중...' : '곡 추가'}
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="space-y-5">
                <div>
                  <p className="section-kicker">Song List</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">등록된 곡</h3>
                </div>

                {!songs.length ? (
                  <StatePanel
                    title="등록된 곡이 없습니다"
                    description="위 입력줄에서 첫 곡을 추가하면 바로 목록에 쌓입니다."
                  />
                ) : (
                  <div className="space-y-3">
                    {songs.map((song) => {
                      const draft = songDrafts[song.performanceSongId] ?? toSongDraft(song);

                      return (
                        <div
                          key={song.performanceSongId}
                          className="grid gap-3 rounded-[24px] border border-slate-200 bg-white p-4 md:grid-cols-[84px_minmax(0,1.2fr)_minmax(0,1fr)_110px_120px_auto_auto]"
                        >
                          <FormField label="순서">
                            <Input
                              type="number"
                              className="h-10 rounded-xl"
                              value={draft.orderNo}
                              onChange={(event) =>
                                setSongDrafts((current) => ({
                                  ...current,
                                  [song.performanceSongId]: {
                                    ...draft,
                                    orderNo: event.target.value,
                                  },
                                }))
                              }
                            />
                          </FormField>

                          <FormField label="곡 제목">
                            <Input
                              className="h-10 rounded-xl"
                              value={draft.songTitle}
                              onChange={(event) =>
                                setSongDrafts((current) => ({
                                  ...current,
                                  [song.performanceSongId]: {
                                    ...draft,
                                    songTitle: event.target.value,
                                  },
                                }))
                              }
                            />
                          </FormField>

                          <FormField label="가수">
                            <Input
                              className="h-10 rounded-xl"
                              value={draft.singer}
                              onChange={(event) =>
                                setSongDrafts((current) => ({
                                  ...current,
                                  [song.performanceSongId]: {
                                    ...draft,
                                    singer: event.target.value,
                                  },
                                }))
                              }
                            />
                          </FormField>

                          <div className="flex flex-col gap-2">
                            <span className="field-label">악보 유무</span>
                            <button
                              type="button"
                              onClick={() =>
                                setSongDrafts((current) => ({
                                  ...current,
                                  [song.performanceSongId]: {
                                    ...draft,
                                    isSheet: !draft.isSheet,
                                  },
                                }))
                              }
                              className={cn(
                                'h-10 rounded-xl border text-sm font-semibold transition',
                                draft.isSheet
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100',
                              )}
                            >
                              {draft.isSheet ? 'O' : 'X'}
                            </button>
                          </div>

                          <div className="flex flex-col gap-2">
                            <span className="field-label">현재 상태</span>
                            <div className="flex h-10 items-center">
                              <StatusBadge tone={statusMeta[song.selectionStatus].tone}>
                                {statusMeta[song.selectionStatus].label}
                              </StatusBadge>
                            </div>
                          </div>

                          <div className="flex items-end">
                            <Button
                              size="sm"
                              className="w-full"
                              disabled={
                                !draft.songTitle.trim() ||
                                !draft.singer.trim() ||
                                updateSongMutation.isPending
                              }
                              onClick={() =>
                                updateSongMutation.mutate({
                                  performanceId: selectedPerformanceId,
                                  songId: song.performanceSongId,
                                  payload: {
                                    songTitle: draft.songTitle.trim(),
                                    singer: draft.singer.trim(),
                                    isSheet: draft.isSheet,
                                    orderNo: Number(draft.orderNo || 0),
                                  },
                                })
                              }
                            >
                              저장
                            </Button>
                          </div>

                          <div className="flex items-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full text-rose-700 hover:bg-rose-50"
                              disabled={deleteSongMutation.isPending}
                              onClick={() =>
                                deleteSongMutation.mutate({
                                  performanceId: selectedPerformanceId,
                                  songId: song.performanceSongId,
                                })
                              }
                            >
                              삭제
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          ) : null}

          {selectedPerformanceId && stage === 'review' ? (
            <Card className="space-y-5">
              <div>
                <p className="section-kicker">Review Board</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">선곡 심사</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  곡을 들으면서 상태만 바로 바꾸면 됩니다. 아직 세션 배정은 하지 않습니다.
                </p>
              </div>

              {!songs.length ? (
                <StatePanel
                  title="심사할 곡이 없습니다"
                  description="먼저 곡 등록 단계에서 곡을 추가해 주세요."
                />
              ) : (
                <div className="space-y-3">
                  {songs.map((song) => (
                    <div
                      key={song.performanceSongId}
                      className={cn(
                        'rounded-[24px] border p-4 transition',
                        statusMeta[song.selectionStatus].cardClassName,
                      )}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-semibold text-slate-900">
                              #{song.orderNo} {song.songTitle}
                            </p>
                            <StatusBadge tone={statusMeta[song.selectionStatus].tone}>
                              {statusMeta[song.selectionStatus].label}
                            </StatusBadge>
                            <StatusBadge tone="neutral">{song.isSheet ? '악보 O' : '악보 X'}</StatusBadge>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{song.singer}</p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                          {(['NOT_BAD', 'CONFIRMED', 'OUT'] as SelectionStatus[]).map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant={song.selectionStatus === status ? 'secondary' : 'ghost'}
                              disabled={updateSongStatusMutation.isPending}
                              onClick={() =>
                                updateSongStatusMutation.mutate({
                                  performanceId: selectedPerformanceId,
                                  songId: song.performanceSongId,
                                  selectionStatus: status,
                                })
                              }
                            >
                              {statusMeta[status].label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : null}

          {selectedPerformanceId && stage === 'assignment' ? (
            <div className="space-y-6">
              <Card className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="section-kicker">Session Columns</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">세션 컬럼 관리</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      세션 배정은 확정된 곡에만 적용되지만, 컬럼 구조는 공연 전체에서 공유됩니다.
                    </p>
                  </div>
                  <StatusBadge tone="neutral">{columns.length}개 컬럼</StatusBadge>
                </div>

                <div className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-[minmax(0,1fr)_120px_120px_auto]">
                  <FormField label="세션명">
                    <Input
                      value={columnForm.sessionName}
                      onChange={(event) =>
                        setColumnForm((current) => ({ ...current, sessionName: event.target.value }))
                      }
                      placeholder="예: 코러스"
                    />
                  </FormField>

                  <FormField label="순서">
                    <Input
                      type="number"
                      value={columnForm.displayOrder}
                      onChange={(event) =>
                        setColumnForm((current) => ({ ...current, displayOrder: event.target.value }))
                      }
                      placeholder={String(columns.length + 1)}
                    />
                  </FormField>

                  <div className="flex flex-col gap-2">
                    <span className="field-label">필수 여부</span>
                    <button
                      type="button"
                      onClick={() =>
                        setColumnForm((current) => ({ ...current, isRequired: !current.isRequired }))
                      }
                      className={cn(
                        'min-h-12 rounded-2xl border px-4 text-sm font-semibold transition',
                        columnForm.isRequired
                          ? 'border-[#4e3b9d] bg-[#f1ecff] text-[#2f225b]'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                      )}
                    >
                      {columnForm.isRequired ? '필수' : '선택'}
                    </button>
                  </div>

                  <div className="flex items-end">
                    <Button
                      className="w-full"
                      disabled={!columnForm.sessionName.trim() || createColumnMutation.isPending}
                      onClick={() =>
                        createColumnMutation.mutate({
                          performanceId: selectedPerformanceId,
                          payload: {
                            sessionName: columnForm.sessionName.trim(),
                            displayOrder: columnForm.displayOrder
                              ? Number(columnForm.displayOrder)
                              : undefined,
                            isRequired: columnForm.isRequired,
                            baseSessionTypeId: null,
                          },
                        })
                      }
                    >
                      {createColumnMutation.isPending ? '추가 중...' : '컬럼 추가'}
                    </Button>
                  </div>
                </div>

                {columns.length ? (
                  <div className="space-y-3">
                    {columnDrafts.map((column, index) => (
                      <div
                        key={column.performanceSessionColumnId}
                        className="grid gap-3 rounded-[24px] border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_120px_120px_auto]"
                      >
                        <FormField label="세션명">
                          <Input
                            value={column.sessionName}
                            onChange={(event) =>
                              setColumnDrafts((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, sessionName: event.target.value } : item,
                                ),
                              )
                            }
                          />
                        </FormField>

                        <FormField label="순서">
                          <Input
                            type="number"
                            value={column.displayOrder}
                            onChange={(event) =>
                              setColumnDrafts((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, displayOrder: event.target.value } : item,
                                ),
                              )
                            }
                          />
                        </FormField>

                        <div className="flex flex-col gap-2">
                          <span className="field-label">필수 여부</span>
                          <button
                            type="button"
                            onClick={() =>
                              setColumnDrafts((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, isRequired: !item.isRequired } : item,
                                ),
                              )
                            }
                            className={cn(
                              'min-h-12 rounded-2xl border px-4 text-sm font-semibold transition',
                              column.isRequired
                                ? 'border-[#4e3b9d] bg-[#f1ecff] text-[#2f225b]'
                                : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-white',
                            )}
                          >
                            {column.isRequired ? '필수' : '선택'}
                          </button>
                        </div>

                        <div className="flex items-end">
                          <Button
                            className="w-full"
                            disabled={!column.sessionName.trim() || updateColumnMutation.isPending}
                            onClick={() =>
                              updateColumnMutation.mutate({
                                performanceId: selectedPerformanceId,
                                columnId: column.performanceSessionColumnId,
                                payload: {
                                  sessionName: column.sessionName.trim(),
                                  displayOrder: Number(column.displayOrder || 0),
                                  isRequired: column.isRequired,
                                  baseSessionTypeId: column.baseSessionTypeId,
                                },
                              })
                            }
                          >
                            저장
                          </Button>
                        </div>

                        <div className="md:col-span-4 flex items-center justify-between text-xs text-slate-500">
                          <span>Column #{column.performanceSessionColumnId}</span>
                          <span>{column.sessionSource === 'DEFAULT' ? '기본 컬럼' : '사용자 컬럼'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <StatePanel
                    title="세션 컬럼이 없습니다"
                    description="먼저 드럼, 보컬, 기타 같은 세션 컬럼을 추가해 주세요."
                  />
                )}
              </Card>

              <Card className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="section-kicker">Confirmed Songs</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">확정 곡 세션 배정</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      여기에는 확정 곡만 보입니다. 후보와 제외 곡은 세션 배정 대상에서 빠집니다.
                    </p>
                  </div>
                  <StatusBadge tone="confirmed">{confirmedSongs.length}곡</StatusBadge>
                </div>

                {!confirmedSongs.length ? (
                  <StatePanel
                    title="확정된 곡이 없습니다"
                    description="선곡 심사 탭에서 상태를 확정으로 바꾸면 여기로 자동으로 들어옵니다."
                  />
                ) : !columns.length ? (
                  <StatePanel
                    title="세션 컬럼을 먼저 만들어 주세요"
                    description="확정 곡은 준비됐지만, 배정할 세션 컬럼이 아직 없습니다."
                  />
                ) : (
                  <div className="space-y-4">
                    {confirmedSongs.map((song) => {
                      const detail = songDetailsById.get(song.performanceSongId);
                      const draft = assignmentDrafts[song.performanceSongId] ?? {};

                      return (
                        <div
                          key={song.performanceSongId}
                          className="rounded-[24px] border border-emerald-200 bg-emerald-50/50 p-4"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-lg font-semibold text-slate-900">
                                  #{song.orderNo} {song.songTitle}
                                </p>
                                <StatusBadge tone="confirmed">확정</StatusBadge>
                                <StatusBadge tone="neutral">{song.isSheet ? '악보 O' : '악보 X'}</StatusBadge>
                                <StatusBadge tone="neutral">
                                  {detail?.chatRoomCreated ? '채팅방 생성됨' : '채팅방 미생성'}
                                </StatusBadge>
                              </div>
                              <p className="mt-2 text-sm text-slate-600">{song.singer}</p>
                            </div>

                            <Button
                              size="sm"
                              disabled={updateAssignmentsMutation.isPending}
                              onClick={() =>
                                updateAssignmentsMutation.mutate({
                                  performanceId: selectedPerformanceId,
                                  songId: song.performanceSongId,
                                  sessions: columns.map((column) => ({
                                    performanceSessionColumnId: column.performanceSessionColumnId,
                                    assignedUserId:
                                      draft[column.performanceSessionColumnId] ?? '',
                                  })),
                                })
                              }
                            >
                              저장
                            </Button>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {columns.map((column) => (
                              <div
                                key={`${song.performanceSongId}-${column.performanceSessionColumnId}`}
                                className="rounded-[20px] border border-white/80 bg-white/80 p-4"
                              >
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <p className="font-semibold text-slate-900">{column.sessionName}</p>
                                  <StatusBadge tone="neutral">
                                    {column.isRequired ? '필수' : '선택'}
                                  </StatusBadge>
                                </div>
                                <Select
                                  value={draft[column.performanceSessionColumnId] ?? ''}
                                  onChange={(event) =>
                                    setAssignmentDrafts((current) => ({
                                      ...current,
                                      [song.performanceSongId]: {
                                        ...(current[song.performanceSongId] ?? {}),
                                        [column.performanceSessionColumnId]: event.target.value,
                                      },
                                    }))
                                  }
                                >
                                  <option value="">미배정</option>
                                  {users.map((user) => (
                                    <option key={user.userId} value={user.userId}>
                                      {user.name} #{user.userId}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <Card className="space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="section-kicker">Visible Rooms</p>
                      <h3 className="mt-2 text-2xl font-semibold text-slate-900">현재 보이는 합주방</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        확정 상태를 유지하는 곡의 합주방만 이 목록에 보입니다.
                      </p>
                    </div>
                    <StatusBadge tone="neutral">{visibleChatRooms.length}개</StatusBadge>
                  </div>

                  {chatRoomsQuery.isLoading ? (
                    <p className="text-sm text-slate-500">합주방 목록을 불러오는 중입니다.</p>
                  ) : visibleChatRooms.length ? (
                    <div className="space-y-3">
                      {visibleChatRooms.map((room: ChatRoomSummary) => (
                        <div
                          key={room.chatRoomId}
                          className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">
                                #{room.orderNo} {room.songTitle}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">{room.singer}</p>
                            </div>
                            <StatusBadge tone="confirmed">
                              {room.currentRound?.status ?? 'OPEN'}
                            </StatusBadge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <StatePanel
                      title="보이는 합주방이 없습니다"
                      description="확정 곡으로 합주방을 생성하면 여기에 바로 나타납니다."
                    />
                  )}
                </Card>

                <Card className="space-y-5 bg-[#14323f] text-white">
                  <div>
                    <p className="section-kicker text-slate-300">Room Targets</p>
                    <h3 className="mt-2 text-2xl font-semibold">합주방 생성 대상</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      채팅방이 아직 없는 확정 곡만 선택 대상으로 보여줍니다.
                    </p>
                  </div>

                  {creatableConfirmedSongs.length ? (
                    <div className="space-y-3">
                      {creatableConfirmedSongs.map((song) => (
                        <label
                          key={song.performanceSongId}
                          className="flex cursor-pointer items-start gap-3 rounded-[20px] bg-white/10 px-4 py-4 ring-1 ring-white/10"
                        >
                          <input
                            type="checkbox"
                            checked={selectedChatRoomSongIds.includes(song.performanceSongId)}
                            onChange={() =>
                              setSelectedChatRoomSongIds((current) =>
                                current.includes(song.performanceSongId)
                                  ? current.filter((id) => id !== song.performanceSongId)
                                  : [...current, song.performanceSongId],
                              )
                            }
                            className="mt-1 h-4 w-4"
                          />
                          <div className="min-w-0">
                            <p className="font-medium">
                              #{song.orderNo} {song.songTitle}
                            </p>
                            <p className="mt-1 text-xs text-slate-300">{song.singer}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-[18px] bg-white/8 px-4 py-3 text-sm text-slate-300 ring-1 ring-white/10">
                      지금 바로 만들 수 있는 확정 곡이 없습니다.
                    </p>
                  )}

                  <div className="grid gap-2">
                    <Button
                      variant="secondary"
                      className="w-full bg-white text-[#14323f] hover:bg-slate-100"
                      disabled={!creatableConfirmedSongs.length}
                      onClick={() =>
                        setSelectedChatRoomSongIds(
                          selectedChatRoomSongIds.length === creatableConfirmedSongs.length
                            ? []
                            : creatableConfirmedSongs.map((song) => song.performanceSongId),
                        )
                      }
                    >
                      {selectedChatRoomSongIds.length === creatableConfirmedSongs.length
                        ? '전체 선택 해제'
                        : '전체 선택'}
                    </Button>
                    <Button
                      className="w-full"
                      disabled={!selectedChatRoomSongIds.length || createChatRoomsMutation.isPending}
                      onClick={() =>
                        createChatRoomsMutation.mutate({
                          performanceId: selectedPerformanceId,
                          performanceSongIds: selectedChatRoomSongIds,
                        })
                      }
                    >
                      {createChatRoomsMutation.isPending
                        ? '합주방 생성 중...'
                        : `${selectedChatRoomSongIds.length}곡 합주방 생성`}
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
