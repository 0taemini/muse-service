import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { toApiMessage } from '@features/auth/api/auth-api';
import {
  performanceApi,
  type ChatRoomSummary,
  type PerformanceMember,
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
import { Modal } from '@shared/components/ui/modal';
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
  selectionStatus: SelectionStatus;
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
    helper: '곡 제목, 가수, 악보 여부만 빠르게 쌓고 기본 상태는 모두 후보로 시작합니다.',
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
  selectionStatus: 'NOT_BAD',
};

const emptyColumnForm: ColumnForm = {
  sessionName: '',
  displayOrder: '',
  isRequired: false,
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
  selectionStatus: song.selectionStatus,
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

function formatUserAssignmentLabel(user: { cohort: number; name: string; nickname: string }) {
  return `${user.cohort}기 ${user.name}(${user.nickname})`;
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
  const location = useLocation();
  const [stage, setStage] = useState<StageId>('catalog');
  const [message, setMessage] = useState('');
  const [noticeTone, setNoticeTone] = useState<'success' | 'error'>('success');
  const [selectedPerformanceId, setSelectedPerformanceId] = useState<number | null>(null);
  const [isCreatePerformanceModalOpen, setIsCreatePerformanceModalOpen] = useState(false);
  const [isCreateSongModalOpen, setIsCreateSongModalOpen] = useState(false);
  const [isCreateColumnModalOpen, setIsCreateColumnModalOpen] = useState(false);
  const [isMemberManageModalOpen, setIsMemberManageModalOpen] = useState(false);
  const [createPerformanceTitle, setCreatePerformanceTitle] = useState('');
  const [createSongForm, setCreateSongForm] = useState<CreateSongForm>(emptyCreateSongForm);
  const [songDrafts, setSongDrafts] = useState<Record<number, SongDraft>>({});
  const [columnForm, setColumnForm] = useState<ColumnForm>(emptyColumnForm);
  const [columnDrafts, setColumnDrafts] = useState<ColumnDraft[]>([]);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<number, Record<number, string>>>({});
  const [selectedChatRoomSongIds, setSelectedChatRoomSongIds] = useState<number[]>([]);
  const [songPendingDelete, setSongPendingDelete] = useState<PerformanceSongSummary | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedMemberUserId, setSelectedMemberUserId] = useState('');

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
  const performanceMembers = useMemo(
    () => performance?.members ?? EMPTY_ARRAY,
    [performance],
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
  const assignmentGridTemplate = useMemo(
    () =>
      [
        '72px',
        'minmax(180px,1.05fr)',
        'minmax(132px,0.75fr)',
        ...columns.map(() => 'minmax(126px,0.85fr)'),
        '92px',
      ].join(' '),
    [columns],
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
  const availableUsersForMembers = useMemo(
    () =>
      users.filter(
        (user) => !performanceMembers.some((member) => member.userId === user.userId),
      ),
    [performanceMembers, users],
  );
  const activeStage = stages.find((item) => item.id === stage) ?? stages[0];
  const selectedPerformanceTitle = performance?.title ?? '공연을 선택해 주세요';

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

  useEffect(() => {
    const shouldResetToList =
      location.pathname === '/performances' &&
      Boolean(
        location.state &&
          typeof location.state === 'object' &&
          'resetPerformanceListAt' in location.state,
      );

    if (!shouldResetToList) {
      return;
    }

    setSelectedPerformanceId(null);
    setStage('catalog');
    setIsCreateSongModalOpen(false);
  }, [location.pathname, location.state]);

  const setSuccessMessage = (nextMessage: string) => {
    void nextMessage;
    setMessage('');
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
      setIsCreatePerformanceModalOpen(false);
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
      setIsCreateSongModalOpen(false);
      setCreateSongForm(emptyCreateSongForm);
      await invalidatePerformance(response.data.performanceId);
    },
    onError: (error) => setErrorMessage(toApiMessage(error)),
  });

  const createPerformanceMemberMutation = useMutation({
    mutationFn: ({
      performanceId,
      userId,
    }: {
      performanceId: number;
      userId: number;
    }) => performanceApi.createPerformanceMember(performanceId, { userId }),
    onSuccess: async (_, variables) => {
      setSelectedMemberUserId('');
      await invalidatePerformance(variables.performanceId);
    },
    onError: (error) => setErrorMessage(toApiMessage(error)),
  });

  const deletePerformanceMemberMutation = useMutation({
    mutationFn: ({
      performanceId,
      memberUserId,
    }: {
      performanceId: number;
      memberUserId: number;
    }) => performanceApi.deletePerformanceMember(performanceId, memberUserId),
    onSuccess: async (_, variables) => {
      await invalidatePerformance(variables.performanceId);
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
      setIsCreateColumnModalOpen(false);
      setColumnForm({
        ...emptyColumnForm,
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

  const persistSongDraft = async (
    song: PerformanceSongSummary,
    draftOverride?: SongDraft,
  ) => {
    if (!selectedPerformanceId) {
      return;
    }

    const currentDraft = draftOverride ?? songDrafts[song.performanceSongId] ?? toSongDraft(song);
    const normalizedSongTitle = currentDraft.songTitle.trim();
    const normalizedSinger = currentDraft.singer.trim();
    const parsedOrderNo = Number(currentDraft.orderNo);
    const normalizedOrderNo =
      Number.isFinite(parsedOrderNo) && parsedOrderNo > 0 ? parsedOrderNo : song.orderNo;

    if (!normalizedSongTitle || !normalizedSinger) {
      setSongDrafts((current) => ({
        ...current,
        [song.performanceSongId]: toSongDraft(song),
      }));
      return;
    }

    const normalizedDraft: SongDraft = {
      songTitle: normalizedSongTitle,
      singer: normalizedSinger,
      orderNo: String(normalizedOrderNo),
      isSheet: currentDraft.isSheet,
      selectionStatus: currentDraft.selectionStatus,
    };
    const detail = songDetailsById.get(song.performanceSongId);
    const isLockedSong = detail?.chatRoomCreated === true;

    setSongDrafts((current) => ({
      ...current,
      [song.performanceSongId]: normalizedDraft,
    }));

    if (!isLockedSong) {
      await updateSongMutation.mutateAsync({
        performanceId: selectedPerformanceId,
        songId: song.performanceSongId,
        payload: {
          songTitle: normalizedDraft.songTitle,
          singer: normalizedDraft.singer,
          isSheet: normalizedDraft.isSheet,
          orderNo: normalizedOrderNo,
        },
      });
    }

    if (normalizedDraft.selectionStatus !== song.selectionStatus) {
      await updateSongStatusMutation.mutateAsync({
        performanceId: selectedPerformanceId,
        songId: song.performanceSongId,
        selectionStatus: normalizedDraft.selectionStatus,
      });
    }
  };

  const persistColumnDraft = async (column: ColumnDraft) => {
    if (!selectedPerformanceId) {
      return;
    }

    const normalizedSessionName = column.sessionName.trim();
    if (!normalizedSessionName) {
      return;
    }

    const parsedDisplayOrder = Number(column.displayOrder);
    const normalizedDisplayOrder =
      Number.isFinite(parsedDisplayOrder) && parsedDisplayOrder > 0 ? parsedDisplayOrder : 1;

    const normalizedColumn: ColumnDraft = {
      ...column,
      sessionName: normalizedSessionName,
      displayOrder: String(normalizedDisplayOrder),
    };

    setColumnDrafts((current) =>
      current.map((item) =>
        item.performanceSessionColumnId === column.performanceSessionColumnId ? normalizedColumn : item,
      ),
    );

    await updateColumnMutation.mutateAsync({
      performanceId: selectedPerformanceId,
      columnId: column.performanceSessionColumnId,
      payload: {
        sessionName: normalizedColumn.sessionName,
        displayOrder: normalizedDisplayOrder,
        isRequired: normalizedColumn.isRequired,
        baseSessionTypeId: normalizedColumn.baseSessionTypeId,
      },
    });
  };

  const persistAssignmentDraft = async (songId: number, nextDraft: Record<number, string>) => {
    if (!selectedPerformanceId) {
      return;
    }

    setAssignmentDrafts((current) => ({
      ...current,
      [songId]: nextDraft,
    }));

    await updateAssignmentsMutation.mutateAsync({
      performanceId: selectedPerformanceId,
      songId,
      sessions: columns.map((column) => ({
        performanceSessionColumnId: column.performanceSessionColumnId,
        assignedUserId: nextDraft[column.performanceSessionColumnId] ?? '',
      })),
    });
  };

  if (selectedPerformanceId === null) {
    return (
      <section className="space-y-8">
        {message && noticeTone === 'error' ? <InlineNotice tone={noticeTone}>{message}</InlineNotice> : null}

        <div className="space-y-3">
          <p className="section-kicker">Performance Archive</p>
          <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">공연을 선택해 관리하세요</h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
            먼저 공연을 고른 뒤 곡 등록, 선곡 심사, 세션 배정, 합주방 생성까지 이어서 작업할 수 있습니다.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setIsCreatePerformanceModalOpen(true)}
            className="flex min-h-[220px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[rgba(95,75,182,0.28)] bg-[linear-gradient(180deg,#fcfbff_0%,#f6f2ff_100%)] px-6 text-center transition hover:border-[rgba(95,75,182,0.4)] hover:shadow-[0_16px_30px_rgba(52,35,110,0.08)]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-3xl font-light text-[#5a43ba] shadow-[0_10px_24px_rgba(90,67,186,0.14)]">
              +
            </span>
            <p className="mt-5 text-lg font-semibold text-slate-900">공연 추가하기</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">새 공연을 만들고 바로 관리 화면으로 이동합니다.</p>
          </button>

          {performances.length ? (
            performances.map((performance) => (
              <button
                key={performance.performanceId}
                type="button"
                onClick={() => setSelectedPerformanceId(performance.performanceId)}
                className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 text-left shadow-[0_14px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-1 hover:border-[rgba(95,75,182,0.2)] hover:shadow-[0_18px_36px_rgba(52,35,110,0.10)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Performance</p>
                <h2 className="mt-4 line-clamp-2 text-2xl font-semibold text-slate-900">{performance.title}</h2>
                <div className="mt-8 flex items-center justify-between text-sm text-slate-500">
                  <span>{performance.songCount}곡</span>
                  <span>열기</span>
                </div>
              </button>
            ))
          ) : (
            <Card className="sm:col-span-2 xl:col-span-3">
              <StatePanel
                title="아직 공연이 없습니다"
                description="왼쪽 첫 카드에서 공연을 추가하면 관리할 공연 카드가 여기에 생깁니다."
                className="border-0 p-0 shadow-none"
              />
            </Card>
          )}
        </div>

        <Modal
          open={isCreatePerformanceModalOpen}
          title="공연 생성"
          description="새 공연을 만들면 바로 해당 공연의 관리 화면으로 이동합니다."
          onClose={() => {
            setIsCreatePerformanceModalOpen(false);
            setCreatePerformanceTitle('');
          }}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsCreatePerformanceModalOpen(false);
                  setCreatePerformanceTitle('');
                }}
              >
                취소
              </Button>
              <Button
                disabled={!createPerformanceTitle.trim() || createPerformanceMutation.isPending}
                onClick={() => createPerformanceMutation.mutate({ title: createPerformanceTitle.trim() })}
              >
                {createPerformanceMutation.isPending ? '생성 중...' : '생성하기'}
              </Button>
            </div>
          }
        >
          <FormField label="공연 제목" hint="예: 2026 정기공연">
            <Input
              value={createPerformanceTitle}
              onChange={(event) => setCreatePerformanceTitle(event.target.value)}
              placeholder="공연 제목 입력"
            />
          </FormField>
        </Modal>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      {message && noticeTone === 'error' ? <InlineNotice tone={noticeTone}>{message}</InlineNotice> : null}

      <div className="relative">
        {isSidebarOpen ? (
          <button
            type="button"
            aria-label="사이드바 닫기 배경"
            className="fixed inset-0 z-30 bg-slate-950/8 xl:bg-transparent"
            onClick={() => setIsSidebarOpen(false)}
          />
        ) : null}

        {!isSidebarOpen ? (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="사이드바 열기"
            className="fixed left-4 top-24 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#4e3b9d] bg-[#4e3b9d] text-xl font-semibold text-white shadow-[0_18px_36px_rgba(78,59,157,0.32)] ring-4 ring-white transition hover:bg-[#3f2f84] xl:absolute xl:left-0 xl:top-6"
          >
            ›
          </button>
        ) : null}

        <div
          className={cn(
            'fixed left-4 top-24 bottom-4 z-40 w-[292px] max-w-[calc(100vw-2rem)] transition duration-300 xl:absolute xl:left-0 xl:top-0 xl:bottom-auto',
            isSidebarOpen
              ? 'translate-x-0 opacity-100'
              : '-translate-x-[calc(100%+1.5rem)] pointer-events-none opacity-0',
          )}
        >
          <Card className="flex h-full flex-col gap-5 overflow-hidden border border-[rgba(95,75,182,0.1)] bg-white text-slate-900 shadow-[0_18px_36px_rgba(52,35,110,0.08)] xl:h-auto">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl font-semibold text-slate-900">{selectedPerformanceTitle}</h2>
              <Button variant="ghost" className="shrink-0" onClick={() => setIsMemberManageModalOpen(true)}>
                멤버 관리
              </Button>
            </div>

            <div className="flex-1 space-y-3 overflow-hidden">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">곡 목록</h3>
              </div>

              {songs.length ? (
                <div className="space-y-2 xl:max-h-[calc(100vh-25rem)] xl:overflow-y-auto xl:pr-1">
                  {songs.map((song) => (
                    <button
                      key={song.performanceSongId}
                      type="button"
                      onClick={() => setStage('catalog')}
                      className="flex w-full items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-left transition hover:border-[rgba(95,75,182,0.18)] hover:bg-[#f8f5ff]"
                    >
                      <span className="truncate text-sm font-semibold text-slate-800">
                        #{song.orderNo} {song.songTitle}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">열기</span>
                    </button>
                  ))}
                </div>
              ) : (
                <StatePanel
                  title="등록된 곡이 없습니다"
                  description="왼쪽 위 곡 추가 버튼으로 첫 곡을 바로 등록해 보세요."
                />
              )}
            </div>

            <div className="space-y-3 overflow-hidden">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">채팅방</h3>
              </div>

              {chatRoomsQuery.isLoading ? (
                <p className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
                  채팅방을 불러오는 중입니다.
                </p>
              ) : visibleChatRooms.length ? (
                <div className="space-y-2 xl:max-h-[calc(100vh-18rem)] xl:overflow-y-auto xl:pr-1">
                  {visibleChatRooms.map((room) => (
                    <div
                      key={room.chatRoomId}
                      className="rounded-[22px] border border-slate-200 bg-white px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-slate-900">
                            #{room.orderNo} {room.songTitle}
                          </p>
                          <p className="mt-1 truncate text-sm text-slate-500">{room.singer}</p>
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
                  title="보이는 채팅방이 없습니다"
                  description="확정 곡으로 합주방을 만들면 여기서 바로 확인할 수 있습니다."
                />
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {selectedPerformanceId && stage === 'catalog' ? (
            <div>
              <Card className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="section-kicker">Song List</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">등록된 곡</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => setStage('assignment')}>
                      세션 배정
                    </Button>
                    <Button onClick={() => setIsCreateSongModalOpen(true)}>곡 추가</Button>
                  </div>
                </div>

                {!songs.length ? (
                  <StatePanel
                    title="등록된 곡이 없습니다"
                    description="오른쪽 상단 곡 추가 버튼으로 첫 곡을 등록해 보세요."
                  />
                ) : (
                  <div className="space-y-3">
                    {songs.map((song) => {
                      const draft = songDrafts[song.performanceSongId] ?? toSongDraft(song);
                      const detail = songDetailsById.get(song.performanceSongId);
                      const isLockedSong = detail?.chatRoomCreated === true;

                      return (
                        <div
                          key={song.performanceSongId}
                          className="grid gap-3 rounded-[24px] border border-slate-200 bg-white p-4 md:grid-cols-[84px_minmax(0,1.2fr)_minmax(0,1fr)_110px_176px_auto]"
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
                              onBlur={() => void persistSongDraft(song)}
                              disabled={isLockedSong}
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
                              onBlur={() => void persistSongDraft(song)}
                              disabled={isLockedSong}
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
                              onBlur={() => void persistSongDraft(song)}
                              disabled={isLockedSong}
                            />
                          </FormField>

                          <div className="flex flex-col gap-2">
                            <span className="field-label">악보 여부</span>
                            <button
                              type="button"
                              disabled={isLockedSong}
                              onClick={() => {
                                const nextDraft = {
                                  ...draft,
                                  isSheet: !draft.isSheet,
                                };

                                setSongDrafts((current) => ({
                                  ...current,
                                  [song.performanceSongId]: {
                                    ...nextDraft,
                                  },
                                }));
                                void persistSongDraft(song, nextDraft);
                              }}
                              className={cn(
                                'h-10 rounded-xl border text-sm font-semibold transition',
                                isLockedSong && 'cursor-not-allowed opacity-55',
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
                            <div className="grid h-10 grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                              {(['NOT_BAD', 'CONFIRMED', 'OUT'] as SelectionStatus[]).map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => {
                                    const nextDraft = {
                                      ...draft,
                                      selectionStatus: status,
                                    };

                                    setSongDrafts((current) => ({
                                      ...current,
                                      [song.performanceSongId]: {
                                        ...nextDraft,
                                      },
                                    }));
                                    void persistSongDraft(song, nextDraft);
                                  }}
                                  className={cn(
                                    'rounded-lg text-xs font-semibold transition',
                                    draft.selectionStatus === status
                                      ? status === 'CONFIRMED'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : status === 'OUT'
                                          ? 'bg-rose-100 text-rose-700'
                                          : 'bg-amber-100 text-amber-700'
                                      : 'text-slate-500 hover:bg-white',
                                  )}
                                >
                                  {statusMeta[status].label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full text-rose-700 hover:bg-rose-50"
                              disabled={deleteSongMutation.isPending || isLockedSong}
                              onClick={() => setSongPendingDelete(song)}
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
            <div className="rounded-[32px] border border-[rgba(95,75,182,0.08)] bg-[#fcfbff] p-4 md:p-5">
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
                    {songs.map((song) => {
                      const detail = songDetailsById.get(song.performanceSongId);
                      const isLockedSong = detail?.chatRoomCreated === true;

                      return (
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
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          ) : null}

          {selectedPerformanceId && stage === 'assignment' ? (
            <div className="space-y-6 rounded-[32px] border border-[rgba(95,75,182,0.08)] bg-[#fcfbff] p-4 md:p-5">
              <Card className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="section-kicker">Assignment Table</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">확정 곡 세션 배정</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      확정 곡만 표에 나타납니다. 담당자를 바꾸면 바로 반영됩니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => setStage('catalog')}>
                      곡 목록
                    </Button>
                    <Button onClick={() => setIsCreateColumnModalOpen(true)}>세션 추가</Button>
                    <StatusBadge tone="confirmed">{confirmedSongs.length}곡</StatusBadge>
                  </div>
                </div>

                {!confirmedSongs.length ? (
                  <StatePanel
                    title="확정된 곡이 없습니다"
                    description="선곡 심사 탭에서 상태를 확정으로 바꾸면 여기로 자동으로 들어옵니다."
                  />
                ) : !performanceMembers.length ? (
                  <StatePanel
                    title="공연 멤버를 먼저 등록해 주세요"
                    description="멤버 관리를 열어서 이 공연에 참여하는 사람만 먼저 등록하면 배정이 훨씬 편해집니다."
                  />
                ) : !columns.length ? (
                  <StatePanel
                    title="세션 컬럼을 먼저 만들어 주세요"
                    description="확정 곡은 준비됐지만 배정할 세션 컬럼이 아직 없습니다."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-max space-y-3">
                      <div
                        className="grid gap-3 rounded-[20px] border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600"
                        style={{ gridTemplateColumns: assignmentGridTemplate }}
                      >
                        <span>순서</span>
                        <span>곡 제목</span>
                        <span>가수</span>
                        {columns.map((column) => (
                          <span key={`assignment-head-${column.performanceSessionColumnId}`}>
                            {column.sessionName}
                          </span>
                        ))}
                        <span>채팅방</span>
                      </div>

                      {confirmedSongs.map((song) => {
                        const detail = songDetailsById.get(song.performanceSongId);
                        const draft = assignmentDrafts[song.performanceSongId] ?? {};

                        return (
                          <div
                            key={song.performanceSongId}
                            className="grid gap-3 rounded-[22px] border border-emerald-200 bg-white px-4 py-4"
                            style={{ gridTemplateColumns: assignmentGridTemplate }}
                          >
                            <div className="flex items-center">
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1.5 text-sm font-semibold text-emerald-700">
                                {song.orderNo}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-[15px] font-semibold text-slate-900">{song.songTitle}</p>
                              <p className="mt-1 text-sm text-slate-500">{song.isSheet ? '악보 O' : '악보 X'}</p>
                            </div>

                            <div className="flex items-center truncate text-[15px] text-slate-700">{song.singer}</div>

                            {columns.map((column) => (
                              <Select
                                key={`${song.performanceSongId}-${column.performanceSessionColumnId}`}
                                value={draft[column.performanceSessionColumnId] ?? ''}
                                className="h-10 rounded-xl border-slate-300 bg-slate-50 pl-2.5 pr-8 text-[13px] font-medium text-slate-800"
                                onChange={(event) => {
                                  const nextDraft = {
                                    ...draft,
                                    [column.performanceSessionColumnId]: event.target.value,
                                  };

                                  void persistAssignmentDraft(song.performanceSongId, nextDraft);
                                }}
                              >
                                <option value="">
                                  {column.isRequired ? '필수 세션 선택' : '미배정'}
                                </option>
                                {performanceMembers.map((user: PerformanceMember) => (
                                  <option key={user.userId} value={user.userId}>
                                    {formatUserAssignmentLabel(user)}
                                  </option>
                                ))}
                              </Select>
                            ))}

                            <div className="flex items-center">
                              <StatusBadge tone={detail?.chatRoomCreated ? 'confirmed' : 'neutral'}>
                                {detail?.chatRoomCreated ? '생성됨' : '없음'}
                              </StatusBadge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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

      <Modal
        open={isMemberManageModalOpen}
        title="공연 멤버 관리"
        onClose={() => {
          setIsMemberManageModalOpen(false);
          setSelectedMemberUserId('');
        }}
        footer={
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setIsMemberManageModalOpen(false);
                setSelectedMemberUserId('');
              }}
            >
              닫기
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row">
            <Select
              value={selectedMemberUserId}
              onChange={(event) => setSelectedMemberUserId(event.target.value)}
              className="h-11 flex-1 rounded-2xl"
            >
              <option value="">추가할 멤버 선택</option>
              {availableUsersForMembers.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {formatUserAssignmentLabel(user)}
                </option>
              ))}
            </Select>
            <Button
              className="md:min-w-[108px]"
              disabled={!selectedPerformanceId || !selectedMemberUserId || createPerformanceMemberMutation.isPending}
              onClick={() => {
                if (!selectedPerformanceId || !selectedMemberUserId) {
                  return;
                }

                createPerformanceMemberMutation.mutate({
                  performanceId: selectedPerformanceId,
                  userId: Number(selectedMemberUserId),
                });
              }}
            >
              {createPerformanceMemberMutation.isPending ? '추가 중...' : '멤버 추가'}
            </Button>
          </div>

          {performanceMembers.length ? (
            <div className="space-y-2">
              {performanceMembers.map((member: PerformanceMember) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                    {formatUserAssignmentLabel(member)}
                  </span>
                  <Button
                    variant="ghost"
                    className="shrink-0 text-rose-600 hover:text-rose-700"
                    disabled={!selectedPerformanceId || deletePerformanceMemberMutation.isPending}
                    onClick={() => {
                      if (!selectedPerformanceId) {
                        return;
                      }

                      deletePerformanceMemberMutation.mutate({
                        performanceId: selectedPerformanceId,
                        memberUserId: member.userId,
                      });
                    }}
                  >
                    삭제
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center text-xl font-semibold text-slate-800">
              등록된 공연 멤버가 없습니다
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={songPendingDelete !== null}
        title="곡 삭제"
        description={
          songPendingDelete
            ? `"${songPendingDelete.songTitle}" 곡을 삭제할까요? 삭제하면 되돌릴 수 없습니다.`
            : undefined
        }
        onClose={() => setSongPendingDelete(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSongPendingDelete(null)}>
              취소
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              disabled={!songPendingDelete || deleteSongMutation.isPending || !selectedPerformanceId}
              onClick={() => {
                if (!songPendingDelete || !selectedPerformanceId) {
                  return;
                }

                deleteSongMutation.mutate(
                  {
                    performanceId: selectedPerformanceId,
                    songId: songPendingDelete.performanceSongId,
                  },
                  {
                    onSuccess: async (_, variables) => {
                      setSongPendingDelete(null);
                      setSuccessMessage('곡을 삭제했습니다.');
                      await invalidatePerformance(variables.performanceId);
                    },
                  },
                );
              }}
            >
              {deleteSongMutation.isPending ? '삭제 중...' : '삭제하기'}
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-7 text-slate-600">
          곡 정보와 연결된 현재 목록이 함께 정리됩니다. 정말 삭제할 때만 진행해 주세요.
        </p>
      </Modal>

      <Modal
        open={isCreateColumnModalOpen}
        title="세션 추가"
        description="새 세션을 추가하면 확정 곡 배정 표에 바로 반영됩니다."
        onClose={() => {
          setIsCreateColumnModalOpen(false);
          setColumnForm(emptyColumnForm);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateColumnModalOpen(false);
                setColumnForm(emptyColumnForm);
              }}
            >
              취소
            </Button>
            <Button
              disabled={!columnForm.sessionName.trim() || createColumnMutation.isPending}
              onClick={() =>
                createColumnMutation.mutate({
                  performanceId: selectedPerformanceId!,
                  payload: {
                    sessionName: columnForm.sessionName.trim(),
                    displayOrder: undefined,
                    isRequired: false,
                    baseSessionTypeId: null,
                  },
                })
              }
            >
              {createColumnMutation.isPending ? '추가 중...' : '세션 추가'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <FormField label="세션명">
            <Input
              value={columnForm.sessionName}
              onChange={(event) =>
                setColumnForm((current) => ({ ...current, sessionName: event.target.value }))
              }
              placeholder="예: 코러스"
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={isCreateSongModalOpen}
        title="곡 추가"
        description="현재 선택한 공연에 곡을 바로 등록합니다."
        onClose={() => {
          setIsCreateSongModalOpen(false);
          setCreateSongForm(emptyCreateSongForm);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateSongModalOpen(false);
                setCreateSongForm(emptyCreateSongForm);
              }}
            >
              취소
            </Button>
            <Button
              disabled={
                !selectedPerformanceId ||
                !createSongForm.songTitle.trim() ||
                !createSongForm.singer.trim() ||
                createSongMutation.isPending
              }
              onClick={() => {
                if (!selectedPerformanceId) return;

                createSongMutation.mutate({
                  performanceId: selectedPerformanceId,
                  payload: {
                    songTitle: createSongForm.songTitle.trim(),
                    singer: createSongForm.singer.trim(),
                    isSheet: createSongForm.isSheet,
                    orderNo: createSongForm.orderNo ? Number(createSongForm.orderNo) : undefined,
                    selectionStatus: 'NOT_BAD',
                  },
                });
              }}
            >
              {createSongMutation.isPending ? '추가 중...' : '곡 추가'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
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
              onChange={(event) => setCreateSongForm((current) => ({ ...current, singer: event.target.value }))}
              placeholder="가수명 입력"
            />
          </FormField>
          <FormField label="순서">
            <Input
              type="number"
              value={createSongForm.orderNo}
              onChange={(event) => setCreateSongForm((current) => ({ ...current, orderNo: event.target.value }))}
              placeholder="예: 3"
            />
          </FormField>
          <div className="flex flex-col gap-2">
            <span className="field-label">악보 여부</span>
            <button
              type="button"
              onClick={() => setCreateSongForm((current) => ({ ...current, isSheet: !current.isSheet }))}
              className={cn(
                'min-h-11 rounded-2xl border px-4 text-sm font-semibold transition',
                createSongForm.isSheet
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
              )}
            >
              {createSongForm.isSheet ? 'O' : 'X'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={isCreatePerformanceModalOpen}
        title="공연 생성"
        description="새 공연을 만들면 같은 공간에서 곡과 세션, 합주방 흐름을 이어서 관리할 수 있습니다."
        onClose={() => {
          setIsCreatePerformanceModalOpen(false);
          setCreatePerformanceTitle('');
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreatePerformanceModalOpen(false);
                setCreatePerformanceTitle('');
              }}
            >
              취소
            </Button>
            <Button
              disabled={!createPerformanceTitle.trim() || createPerformanceMutation.isPending}
              onClick={() => createPerformanceMutation.mutate({ title: createPerformanceTitle.trim() })}
            >
              {createPerformanceMutation.isPending ? '생성 중...' : '생성하기'}
            </Button>
          </div>
        }
      >
        <FormField label="공연 제목" hint="예: 2026 정기공연">
          <Input
            value={createPerformanceTitle}
            onChange={(event) => setCreatePerformanceTitle(event.target.value)}
            placeholder="공연 제목 입력"
          />
        </FormField>
      </Modal>
    </section>
  );
}
