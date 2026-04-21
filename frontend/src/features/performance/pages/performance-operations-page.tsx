import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toApiMessage } from '@features/auth/api/auth-api';
import {
  performanceApi,
  type ChatRoomSummary,
  type PerformanceSessionColumn,
  type PerformanceSongDetail,
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

const emptySongForm = {
  songTitle: '',
  singer: '',
  isSheet: false,
  orderNo: '',
  selectionStatus: 'NOT_BAD' as SelectionStatus,
};

const emptyEditSongForm = {
  ...emptySongForm,
  sessionAssignments: {} as Record<number, string>,
};

const emptySessionColumnForm = {
  sessionName: '',
  isRequired: true,
  displayOrder: '',
};

const statusLabel: Record<SelectionStatus, string> = {
  CONFIRMED: '확정',
  NOT_BAD: '후보',
  OUT: '제외',
};

const statusTone: Record<SelectionStatus, 'confirmed' | 'candidate' | 'out'> = {
  CONFIRMED: 'confirmed',
  NOT_BAD: 'candidate',
  OUT: 'out',
};

const EMPTY_ARRAY: never[] = [];

type NoticeTone = 'success' | 'error';
type SessionModalMode = 'create' | 'edit';

function getSessionDescription(column: PerformanceSessionColumn) {
  const source = column.sessionSource === 'DEFAULT' ? '기본 세션' : '사용자 세션';
  return `${source} · ${column.isRequired ? '필수' : '선택'}`;
}

export function PerformanceOperationsPage() {
  const queryClient = useQueryClient();
  const [selectedPerformanceId, setSelectedPerformanceId] = useState<number | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
  const [editingSongId, setEditingSongId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [noticeTone, setNoticeTone] = useState<NoticeTone>('success');
  const [performanceTitle, setPerformanceTitle] = useState('');
  const [createSongForm, setCreateSongForm] = useState(emptySongForm);
  const [editSongForm, setEditSongForm] = useState(emptyEditSongForm);
  const [sessionColumnForm, setSessionColumnForm] = useState(emptySessionColumnForm);
  const [sessionModalMode, setSessionModalMode] = useState<SessionModalMode>('create');
  const [editingSessionColumnId, setEditingSessionColumnId] = useState<number | null>(null);
  const [isCreatePerformanceModalOpen, setIsCreatePerformanceModalOpen] = useState(false);
  const [isCreateSongModalOpen, setIsCreateSongModalOpen] = useState(false);
  const [isEditSongModalOpen, setIsEditSongModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isCreateChatRoomModalOpen, setIsCreateChatRoomModalOpen] = useState(false);
  const [selectedChatRoomSongIds, setSelectedChatRoomSongIds] = useState<number[]>([]);

  const performancesQuery = useQuery({ queryKey: ['performances'], queryFn: performanceApi.getPerformances });
  const performanceQuery = useQuery({
    queryKey: ['performance', selectedPerformanceId],
    queryFn: () => performanceApi.getPerformance(selectedPerformanceId!),
    enabled: selectedPerformanceId !== null,
  });
  const columnsQuery = useQuery({
    queryKey: ['performance-columns', selectedPerformanceId],
    queryFn: () => performanceApi.getPerformanceSessionColumns(selectedPerformanceId!),
    enabled: selectedPerformanceId !== null,
  });
  const chatRoomsQuery = useQuery({
    queryKey: ['performance-chat-rooms', selectedPerformanceId],
    queryFn: () => performanceApi.getChatRooms(selectedPerformanceId!),
    enabled: selectedPerformanceId !== null,
  });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: userApi.getAll });

  const performances = useMemo(
    () => performancesQuery.data?.data ?? EMPTY_ARRAY,
    [performancesQuery.data],
  );
  const performance = performanceQuery.data?.data ?? null;
  const users = useMemo(() => usersQuery.data?.data ?? EMPTY_ARRAY, [usersQuery.data]);
  const songs = useMemo(
    () => [...(performance?.songs ?? [])].sort((a, b) => a.orderNo - b.orderNo),
    [performance],
  );
  const columns = useMemo(
    () => [...(columnsQuery.data?.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [columnsQuery.data],
  );
  const visibleChatRooms = chatRoomsQuery.data?.data ?? [];

  const songDetailQueries = useQueries({
    queries: (selectedPerformanceId ? songs : []).map((song) => ({
      queryKey: ['performance-song', selectedPerformanceId, song.performanceSongId],
      queryFn: () => performanceApi.getSong(selectedPerformanceId!, song.performanceSongId),
      enabled: selectedPerformanceId !== null,
    })),
  });

  const songDetailsMap = useMemo(() => {
    const entries = songDetailQueries
      .map((query) => query.data?.data)
      .filter((detail): detail is PerformanceSongDetail => Boolean(detail))
      .map((detail) => [detail.performanceSongId, detail] as const);

    return new Map(entries);
  }, [songDetailQueries]);

  const editingSongDetail = editingSongId ? songDetailsMap.get(editingSongId) ?? null : null;
  const editingSessionColumn = editingSessionColumnId
    ? columns.find((column) => column.performanceSessionColumnId === editingSessionColumnId) ?? null
    : null;

  const userNameById = useMemo(
    () => new Map(users.map((user) => [user.userId, user.name] as const)),
    [users],
  );
  const confirmedCreatableSongs = useMemo(
    () =>
      songs.filter((song) => {
        const detail = songDetailsMap.get(song.performanceSongId);
        return song.selectionStatus === 'CONFIRMED' && detail?.chatRoomCreated === false;
      }),
    [songDetailsMap, songs],
  );

  useEffect(() => {
    if (performances.length === 0) {
      setSelectedPerformanceId(null);
      return;
    }

    if (selectedPerformanceId === null || !performances.some((item) => item.performanceId === selectedPerformanceId)) {
      setSelectedPerformanceId(performances[0].performanceId);
    }
  }, [performances, selectedPerformanceId]);

  useEffect(() => {
    if (songs.length === 0) {
      setSelectedSongId(null);
      return;
    }

    if (selectedSongId === null || !songs.some((song) => song.performanceSongId === selectedSongId)) {
      setSelectedSongId(songs[0].performanceSongId);
    }
  }, [songs, selectedSongId]);

  useEffect(() => {
    if (!isEditSongModalOpen || !editingSongDetail) {
      return;
    }

    setEditSongForm({
      songTitle: editingSongDetail.songTitle,
      singer: editingSongDetail.singer,
      isSheet: editingSongDetail.isSheet,
      orderNo: String(editingSongDetail.orderNo),
      selectionStatus: editingSongDetail.selectionStatus,
      sessionAssignments: Object.fromEntries(
        editingSongDetail.sessions
          .filter((session) => session.performanceSessionColumnId !== null)
          .map((session) => [
            session.performanceSessionColumnId as number,
            session.assignedUserId ? String(session.assignedUserId) : '',
          ]),
      ),
    });
  }, [editingSongDetail, isEditSongModalOpen]);

  useEffect(() => {
    if (!isSessionModalOpen) {
      return;
    }

    if (sessionModalMode === 'edit' && editingSessionColumn) {
      setSessionColumnForm({
        sessionName: editingSessionColumn.sessionName,
        isRequired: editingSessionColumn.isRequired,
        displayOrder: String(editingSessionColumn.displayOrder),
      });
      return;
    }

    setSessionColumnForm({
      sessionName: '',
      isRequired: true,
      displayOrder: String(columns.length + 1),
    });
  }, [columns.length, editingSessionColumn, isSessionModalOpen, sessionModalMode]);

  useEffect(() => {
    if (!isCreateChatRoomModalOpen) {
      return;
    }

    setSelectedChatRoomSongIds(confirmedCreatableSongs.map((song) => song.performanceSongId));
  }, [confirmedCreatableSongs, isCreateChatRoomModalOpen]);

  const setSuccessMessage = (nextMessage: string) => {
    setNoticeTone('success');
    setMessage(nextMessage);
  };

  const setErrorMessage = (nextMessage: string) => {
    setNoticeTone('error');
    setMessage(nextMessage);
  };

  const refreshPerformance = async (performanceId: number) => {
    await queryClient.invalidateQueries({ queryKey: ['performances'] });
    await queryClient.invalidateQueries({ queryKey: ['performance', performanceId] });
    await queryClient.invalidateQueries({ queryKey: ['performance-columns', performanceId] });
    await queryClient.invalidateQueries({ queryKey: ['performance-song', performanceId] });
    await queryClient.invalidateQueries({ queryKey: ['performance-chat-rooms', performanceId] });
  };

  const closeCreatePerformanceModal = () => {
    setIsCreatePerformanceModalOpen(false);
    setPerformanceTitle('');
  };

  const closeCreateSongModal = () => {
    setIsCreateSongModalOpen(false);
    setCreateSongForm(emptySongForm);
  };

  const closeEditSongModal = () => {
    setIsEditSongModalOpen(false);
    setEditingSongId(null);
    setEditSongForm(emptyEditSongForm);
  };

  const closeSessionModal = () => {
    setIsSessionModalOpen(false);
    setEditingSessionColumnId(null);
    setSessionModalMode('create');
    setSessionColumnForm(emptySessionColumnForm);
  };

  const closeCreateChatRoomModal = () => {
    setIsCreateChatRoomModalOpen(false);
    setSelectedChatRoomSongIds([]);
  };

  const openEditSongModal = (songId: number) => {
    setSelectedSongId(songId);
    setEditingSongId(songId);
    setIsEditSongModalOpen(true);
  };

  const openCreateSessionModal = () => {
    setSessionModalMode('create');
    setEditingSessionColumnId(null);
    setIsSessionModalOpen(true);
  };

  const openEditSessionModal = (columnId: number) => {
    setSessionModalMode('edit');
    setEditingSessionColumnId(columnId);
    setIsSessionModalOpen(true);
  };

  const toggleChatRoomSong = (performanceSongId: number) => {
    setSelectedChatRoomSongIds((current) =>
      current.includes(performanceSongId)
        ? current.filter((id) => id !== performanceSongId)
        : [...current, performanceSongId],
    );
  };

  const toggleAllChatRoomSongs = () => {
    setSelectedChatRoomSongIds((current) =>
      current.length === confirmedCreatableSongs.length ? [] : confirmedCreatableSongs.map((song) => song.performanceSongId),
    );
  };

  const createPerformanceMutation = useMutation({
    mutationFn: performanceApi.createPerformance,
    onSuccess: async (response) => {
      setSuccessMessage(response.message);
      closeCreatePerformanceModal();
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
      closeCreateSongModal();
      await refreshPerformance(response.data.performanceId);
      setSelectedSongId(response.data.performanceSongId);
    },
    onError: (error) => setErrorMessage(toApiMessage(error)),
  });

  const saveSongMutation = useMutation({
    mutationFn: async ({
      performanceId,
      songId,
      original,
      form,
    }: {
      performanceId: number;
      songId: number;
      original: PerformanceSongDetail;
      form: typeof emptyEditSongForm;
    }) => {
      await performanceApi.updateSong(performanceId, songId, {
        songTitle: form.songTitle.trim(),
        singer: form.singer.trim(),
        isSheet: form.isSheet,
        orderNo: Number(form.orderNo || 0),
      });

      if (form.selectionStatus !== original.selectionStatus) {
        await performanceApi.updateSongStatus(performanceId, songId, {
          selectionStatus: form.selectionStatus,
        });
      }

      const sessionPayload = original.sessions
        .filter((session) => session.performanceSessionColumnId !== null)
        .map((session) => ({
          performanceSessionColumnId: session.performanceSessionColumnId as number,
          assignedUserId: form.sessionAssignments[session.performanceSessionColumnId as number]
            ? Number(form.sessionAssignments[session.performanceSessionColumnId as number])
            : null,
        }));

      if (sessionPayload.length) {
        await performanceApi.updateSongSessions(performanceId, songId, {
          sessions: sessionPayload,
        });
      }
    },
    onSuccess: async (_, variables) => {
      setSuccessMessage('곡 정보가 수정되었습니다.');
      closeEditSongModal();
      await refreshPerformance(variables.performanceId);
    },
    onError: (error) => setErrorMessage(toApiMessage(error)),
  });

  const saveSessionColumnMutation = useMutation({
    mutationFn: async ({
      performanceId,
      payload,
      columnId,
      mode,
    }: {
      performanceId: number;
      payload: Parameters<typeof performanceApi.createPerformanceSessionColumn>[1];
      columnId?: number;
      mode: SessionModalMode;
    }) => {
      if (mode === 'edit' && columnId) {
        return performanceApi.updatePerformanceSessionColumn(performanceId, columnId, payload);
      }

      return performanceApi.createPerformanceSessionColumn(performanceId, payload);
    },
    onSuccess: async (_, variables) => {
      setSuccessMessage(variables.mode === 'create' ? '세션이 추가되었습니다.' : '세션이 수정되었습니다.');
      closeSessionModal();
      await refreshPerformance(variables.performanceId);
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
      closeCreateChatRoomModal();
      await refreshPerformance(variables.performanceId);
    },
    onError: (error) => setErrorMessage(toApiMessage(error)),
  });

  const headerCellClass =
    'border-b border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700';
  const bodyCellClass = 'border-b border-r border-slate-200 px-4 py-3 text-sm text-slate-700';

  return (
    <section className="space-y-6">
      {message ? <InlineNotice tone={noticeTone}>{message}</InlineNotice> : null}

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="bg-[#14323f] text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Performances</p>
              <h2 className="mt-2 text-2xl font-semibold">공연 목록</h2>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15">
              {performances.length}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {performances.length ? (
              performances.map((item) => (
                <button
                  key={item.performanceId}
                  type="button"
                  onClick={() => setSelectedPerformanceId(item.performanceId)}
                  className={[
                    'w-full rounded-[20px] border px-4 py-4 text-left transition',
                    selectedPerformanceId === item.performanceId
                      ? 'border-white/70 bg-white text-[#14323f]'
                      : 'border-white/15 bg-white/8 hover:bg-white/12',
                  ].join(' ')}
                >
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] opacity-70">songs {item.songCount}</p>
                </button>
              ))
            ) : (
              <StatePanel
                title="아직 공연이 없습니다"
                description="공연을 추가하면 곡과 세션이 한 시트 안에서 연결됩니다."
                tone="inverse"
              />
            )}
          </div>

          <div className="mt-5">
            <Button className="w-full bg-white text-[#14323f] hover:bg-slate-100" onClick={() => setIsCreatePerformanceModalOpen(true)}>
              공연 추가하기
            </Button>
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Performance Sheet</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">
                {performance?.title ?? '공연을 선택해 주세요'}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                곡과 세션을 카드처럼 분리하지 않고, 한 시트 안에서 셀 단위로 읽히도록 정리했습니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsCreateChatRoomModalOpen(true)}
                disabled={!selectedPerformanceId}
              >
                채팅방 생성
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={openCreateSessionModal}
                disabled={!selectedPerformanceId}
              >
                세션 추가
              </Button>
              <Button size="sm" onClick={() => setIsCreateSongModalOpen(true)} disabled={!selectedPerformanceId}>
                곡 추가
              </Button>
            </div>
          </div>

          {!selectedPerformanceId ? (
            <StatePanel
              title="선택된 공연이 없습니다"
              description="왼쪽 목록에서 공연을 고르면 곡과 세션이 시트 형태로 표시됩니다."
            />
          ) : (
            <>
            <div className="overflow-hidden rounded-[24px] border border-slate-200">
              {songs.length === 0 ? (
                <StatePanel
                  title="등록된 곡이 없습니다"
                  description="곡 추가 버튼으로 첫 곡을 넣으면 시트가 바로 채워집니다."
                  className="rounded-none border-0"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className={headerCellClass}>순서</th>
                        <th className={headerCellClass}>곡명</th>
                        <th className={headerCellClass}>가수</th>
                        <th className={headerCellClass}>상태</th>
                        <th className={headerCellClass}>채팅방</th>
                        {columns.map((column) => (
                          <th key={column.performanceSessionColumnId} className={headerCellClass}>
                            <div className="flex min-w-[180px] items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">{column.sessionName}</p>
                                <p className="mt-1 text-xs font-medium text-slate-500">
                                  {getSessionDescription(column)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditSessionModal(column.performanceSessionColumnId)}
                              >
                                수정
                              </Button>
                            </div>
                          </th>
                        ))}
                        <th className={headerCellClass}>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {songs.map((song) => {
                        const detail = songDetailsMap.get(song.performanceSongId);

                        return (
                          <tr
                            key={song.performanceSongId}
                            className={selectedSongId === song.performanceSongId ? 'bg-[#f5f8f8]' : 'bg-white'}
                            onClick={() => setSelectedSongId(song.performanceSongId)}
                          >
                            <td className={bodyCellClass}>#{song.orderNo}</td>
                            <td className={bodyCellClass}>
                              <div className="min-w-[180px]">
                                <p className="font-semibold text-slate-900">{song.songTitle}</p>
                              </div>
                            </td>
                            <td className={bodyCellClass}>{song.singer}</td>
                            <td className={bodyCellClass}>
                              <StatusBadge tone={statusTone[song.selectionStatus]}>
                                {statusLabel[song.selectionStatus]}
                              </StatusBadge>
                            </td>
                            <td className={bodyCellClass}>
                              {detail?.chatRoomCreated
                                ? '생성됨'
                                : song.selectionStatus === 'CONFIRMED'
                                  ? '생성 가능'
                                  : '대상 아님'}
                            </td>
                            {columns.map((column) => {
                              const session = detail?.sessions.find(
                                (item) => item.performanceSessionColumnId === column.performanceSessionColumnId,
                              );
                              const assignedName =
                                session?.assignedUserId && userNameById.get(session.assignedUserId)
                                  ? userNameById.get(session.assignedUserId)
                                  : '미배정';

                              return (
                                <td
                                  key={`${song.performanceSongId}-${column.performanceSessionColumnId}`}
                                  className={bodyCellClass}
                                >
                                  <div className="min-w-[180px]">
                                    <p className={assignedName === '미배정' ? 'text-slate-400' : 'font-medium text-slate-800'}>
                                      {detail ? assignedName : '불러오는 중'}
                                    </p>
                                  </div>
                                </td>
                              );
                            })}
                            <td className={bodyCellClass}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditSongModal(song.performanceSongId);
                                }}
                              >
                                수정
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <Card className="border border-slate-200 bg-white/90">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="section-kicker">Visible Rooms</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">현재 보이는 채팅방</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      확정 곡 상태를 유지하는 방만 노출하고, 후보나 제외로 내려간 곡의 방은 삭제하지 않고 숨김 처리합니다.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {visibleChatRooms.length}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {chatRoomsQuery.isLoading ? (
                    <p className="text-sm text-slate-500">채팅방 목록을 불러오는 중입니다.</p>
                  ) : visibleChatRooms.length ? (
                    visibleChatRooms.map((room: ChatRoomSummary) => (
                      <div key={room.chatRoomId} className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              #{room.orderNo} {room.songTitle}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">{room.singer}</p>
                          </div>
                          <StatusBadge tone="confirmed">{room.currentRound?.status ?? 'OPEN'}</StatusBadge>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                          {room.currentRound
                            ? `현재 라운드 #${room.currentRound.chatRoundId}`
                            : '아직 열린 라운드 정보가 없습니다.'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <StatePanel
                      title="보이는 채팅방이 없습니다"
                      description="확정된 곡을 선택해 채팅방을 만들면 이 영역에 바로 표시됩니다."
                      className="border-0 px-0 py-2"
                    />
                  )}
                </div>
              </Card>

              <Card className="border border-slate-200 bg-[#14323f] text-white">
                <p className="section-kicker text-slate-300">Room Targets</p>
                <h3 className="mt-2 text-xl font-semibold">생성 가능한 확정 곡</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  아직 채팅방이 없는 확정 곡만 대상으로 잡았습니다. 전체 선택과 부분 선택은 생성 모달에서 할 수 있습니다.
                </p>

                <div className="mt-4 space-y-2">
                  {confirmedCreatableSongs.length ? (
                    confirmedCreatableSongs.map((song) => (
                      <div key={song.performanceSongId} className="rounded-[18px] bg-white/10 px-4 py-3 ring-1 ring-white/10">
                        <p className="font-medium">
                          #{song.orderNo} {song.songTitle}
                        </p>
                        <p className="mt-1 text-xs text-slate-300">{song.singer}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-[18px] bg-white/8 px-4 py-3 text-sm text-slate-300 ring-1 ring-white/10">
                      지금 바로 만들 수 있는 확정 곡이 없습니다.
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  <Button
                    className="w-full bg-white text-[#14323f] hover:bg-slate-100"
                    onClick={() => setIsCreateChatRoomModalOpen(true)}
                    disabled={!confirmedCreatableSongs.length}
                  >
                    채팅방 대상 선택하기
                  </Button>
                </div>
              </Card>
            </div>
            </>
          )}
        </Card>
      </div>

      <Modal
        open={isCreateChatRoomModalOpen}
        title="채팅방 생성"
        description="확정된 곡만 선택해서 채팅방을 만들 수 있습니다. 생성된 방은 곡당 1개로 유지되고 첫 라운드도 함께 열립니다."
        onClose={closeCreateChatRoomModal}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={toggleAllChatRoomSongs} disabled={!confirmedCreatableSongs.length}>
              {selectedChatRoomSongIds.length === confirmedCreatableSongs.length ? '전체 선택 해제' : '전체 선택'}
            </Button>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={closeCreateChatRoomModal}>
                취소
              </Button>
              <Button
                disabled={
                  !selectedPerformanceId ||
                  !selectedChatRoomSongIds.length ||
                  createChatRoomsMutation.isPending
                }
                onClick={() =>
                  selectedPerformanceId &&
                  createChatRoomsMutation.mutate({
                    performanceId: selectedPerformanceId,
                    performanceSongIds: selectedChatRoomSongIds,
                  })
                }
              >
                {createChatRoomsMutation.isPending ? '생성 중...' : `${selectedChatRoomSongIds.length}개 생성`}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          {!confirmedCreatableSongs.length ? (
            <StatePanel
              title="생성 가능한 확정 곡이 없습니다"
              description="이미 채팅방이 있거나 아직 확정되지 않은 곡만 남아 있습니다."
              className="border-0 px-0 py-2"
            />
          ) : (
            confirmedCreatableSongs.map((song) => (
              <label
                key={song.performanceSongId}
                className="flex cursor-pointer items-start gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <input
                  type="checkbox"
                  checked={selectedChatRoomSongIds.includes(song.performanceSongId)}
                  onChange={() => toggleChatRoomSong(song.performanceSongId)}
                  className="mt-1 h-4 w-4"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      #{song.orderNo} {song.songTitle}
                    </p>
                    <StatusBadge tone="confirmed">CONFIRMED</StatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{song.singer}</p>
                </div>
              </label>
            ))
          )}
        </div>
      </Modal>

      <Modal
        open={isCreatePerformanceModalOpen}
        title="공연 추가"
        description="새 공연을 만든 뒤 같은 화면에서 곡과 세션을 이어서 관리할 수 있습니다."
        onClose={closeCreatePerformanceModal}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeCreatePerformanceModal}>
              취소
            </Button>
            <Button
              disabled={!performanceTitle.trim() || createPerformanceMutation.isPending}
              onClick={() => createPerformanceMutation.mutate({ title: performanceTitle.trim() })}
            >
              {createPerformanceMutation.isPending ? '추가 중...' : '추가하기'}
            </Button>
          </div>
        }
      >
        <FormField label="공연 제목" hint="예: 2026 여름 공연">
          <Input
            value={performanceTitle}
            onChange={(event) => setPerformanceTitle(event.target.value)}
            placeholder="공연 제목 입력"
          />
        </FormField>
      </Modal>

      <Modal
        open={isCreateSongModalOpen}
        title="곡 추가"
        description="공연 시트에 새 곡 한 줄을 추가합니다."
        onClose={closeCreateSongModal}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeCreateSongModal}>
              취소
            </Button>
            <Button
              disabled={
                !selectedPerformanceId ||
                !createSongForm.songTitle.trim() ||
                !createSongForm.singer.trim() ||
                createSongMutation.isPending
              }
              onClick={() =>
                selectedPerformanceId &&
                createSongMutation.mutate({
                  performanceId: selectedPerformanceId,
                  payload: {
                    songTitle: createSongForm.songTitle.trim(),
                    singer: createSongForm.singer.trim(),
                    isSheet: createSongForm.isSheet,
                    orderNo: createSongForm.orderNo ? Number(createSongForm.orderNo) : undefined,
                    selectionStatus: createSongForm.selectionStatus,
                  },
                })
              }
            >
              {createSongMutation.isPending ? '추가 중...' : '추가하기'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="곡 제목">
            <Input
              value={createSongForm.songTitle}
              onChange={(event) => setCreateSongForm((current) => ({ ...current, songTitle: event.target.value }))}
              placeholder="곡 제목 입력"
            />
          </FormField>
          <FormField label="가수명">
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
          <FormField label="선곡 상태">
            <Select
              value={createSongForm.selectionStatus}
              onChange={(event) =>
                setCreateSongForm((current) => ({
                  ...current,
                  selectionStatus: event.target.value as SelectionStatus,
                }))
              }
            >
              <option value="NOT_BAD">후보</option>
              <option value="CONFIRMED">확정</option>
              <option value="OUT">제외</option>
            </Select>
          </FormField>
          <label className="md:col-span-2 flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={createSongForm.isSheet}
              onChange={(event) => setCreateSongForm((current) => ({ ...current, isSheet: event.target.checked }))}
            />
            악보 유무도 함께 기록합니다.
          </label>
        </div>
      </Modal>

      <Modal
        open={isEditSongModalOpen}
        title="곡 수정"
        description="기본 정보와 세션 배정을 한 번에 수정합니다."
        onClose={closeEditSongModal}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeEditSongModal}>
              취소
            </Button>
            <Button
              disabled={
                !selectedPerformanceId ||
                !editingSongId ||
                !editingSongDetail ||
                !editSongForm.songTitle.trim() ||
                !editSongForm.singer.trim() ||
                saveSongMutation.isPending
              }
              onClick={() =>
                selectedPerformanceId &&
                editingSongId &&
                editingSongDetail &&
                saveSongMutation.mutate({
                  performanceId: selectedPerformanceId,
                  songId: editingSongId,
                  original: editingSongDetail,
                  form: editSongForm,
                })
              }
            >
              {saveSongMutation.isPending ? '저장 중...' : '저장하기'}
            </Button>
          </div>
        }
      >
        {!editingSongDetail ? (
          <p className="text-sm text-slate-500">곡 정보를 불러오는 중입니다.</p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="곡 제목">
                <Input
                  value={editSongForm.songTitle}
                  onChange={(event) => setEditSongForm((current) => ({ ...current, songTitle: event.target.value }))}
                />
              </FormField>
              <FormField label="가수명">
                <Input
                  value={editSongForm.singer}
                  onChange={(event) => setEditSongForm((current) => ({ ...current, singer: event.target.value }))}
                />
              </FormField>
              <FormField label="순서">
                <Input
                  type="number"
                  value={editSongForm.orderNo}
                  onChange={(event) => setEditSongForm((current) => ({ ...current, orderNo: event.target.value }))}
                />
              </FormField>
              <FormField label="선곡 상태">
                <Select
                  value={editSongForm.selectionStatus}
                  onChange={(event) =>
                    setEditSongForm((current) => ({
                      ...current,
                      selectionStatus: event.target.value as SelectionStatus,
                    }))
                  }
                >
                  <option value="NOT_BAD">후보</option>
                  <option value="CONFIRMED">확정</option>
                  <option value="OUT">제외</option>
                </Select>
              </FormField>
              <label className="md:col-span-2 flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={editSongForm.isSheet}
                  onChange={(event) => setEditSongForm((current) => ({ ...current, isSheet: event.target.checked }))}
                />
                악보 유무를 함께 수정합니다.
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="section-kicker">Session Assignment</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">세션 배정</h3>
                </div>
                <StatusBadge tone={statusTone[editingSongDetail.selectionStatus]}>
                  {statusLabel[editingSongDetail.selectionStatus]}
                </StatusBadge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {editingSongDetail.sessions
                  .filter((session) => session.performanceSessionColumnId !== null)
                  .map((session) => (
                    <div key={session.performanceSessionColumnId} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">{session.sessionName}</p>
                      <p className="mt-1 text-xs text-slate-500">{session.isRequired ? '필수 세션' : '선택 세션'}</p>
                      <div className="mt-3">
                        <Select
                          value={editSongForm.sessionAssignments[session.performanceSessionColumnId as number] ?? ''}
                          onChange={(event) =>
                            setEditSongForm((current) => ({
                              ...current,
                              sessionAssignments: {
                                ...current.sessionAssignments,
                                [session.performanceSessionColumnId as number]: event.target.value,
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
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={isSessionModalOpen}
        title={sessionModalMode === 'create' ? '세션 추가' : '세션 수정'}
        description="시트의 열처럼 보이는 공연 공통 세션을 모달에서 관리합니다."
        onClose={closeSessionModal}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeSessionModal}>
              취소
            </Button>
            <Button
              disabled={
                !selectedPerformanceId ||
                !sessionColumnForm.sessionName.trim() ||
                !sessionColumnForm.displayOrder.trim() ||
                saveSessionColumnMutation.isPending
              }
              onClick={() =>
                selectedPerformanceId &&
                saveSessionColumnMutation.mutate({
                  performanceId: selectedPerformanceId,
                  mode: sessionModalMode,
                  columnId: editingSessionColumnId ?? undefined,
                  payload: {
                    sessionName: sessionColumnForm.sessionName.trim(),
                    isRequired: sessionColumnForm.isRequired,
                    displayOrder: Number(sessionColumnForm.displayOrder),
                  },
                })
              }
            >
              {saveSessionColumnMutation.isPending ? '저장 중...' : '저장하기'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="세션명">
            <Input
              value={sessionColumnForm.sessionName}
              onChange={(event) =>
                setSessionColumnForm((current) => ({ ...current, sessionName: event.target.value }))
              }
              placeholder="예: 코러스"
            />
          </FormField>
          <FormField label="표시 순서">
            <Input
              type="number"
              value={sessionColumnForm.displayOrder}
              onChange={(event) =>
                setSessionColumnForm((current) => ({ ...current, displayOrder: event.target.value }))
              }
              placeholder="예: 8"
            />
          </FormField>
          <label className="md:col-span-2 flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={sessionColumnForm.isRequired}
              onChange={(event) =>
                setSessionColumnForm((current) => ({ ...current, isRequired: event.target.checked }))
              }
            />
            필수 세션으로 표시합니다.
          </label>
        </div>
      </Modal>
    </section>
  );
}
