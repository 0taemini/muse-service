import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDeferredValue } from 'react';
import { useRef, type DragEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { toApiMessage } from '@features/auth/api/auth-api';
import {
  performanceApi,
  type ChatMessage,
  type ChatRoomDetail,
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
import { Skeleton, SkeletonList } from '@shared/components/ui/skeleton';
import { StatePanel } from '@shared/components/ui/state-panel';
import { StatusBadge } from '@shared/components/ui/status-badge';
import { cn } from '@shared/lib/cn';
import { ChatTransport, type ChatTypingEvent } from '@shared/realtime/chat-transport';

type StageId = 'catalog' | 'review' | 'assignment';
type SongStatusFilter = 'ALL' | SelectionStatus;

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

const selectionStatusSortOrder: Record<SelectionStatus, number> = {
  CONFIRMED: 0,
  NOT_BAD: 1,
  OUT: 2,
};
const selectionStatusOrder = ['CONFIRMED', 'NOT_BAD', 'OUT'] as const;
const catalogPageSize = 10;
const catalogStatusFilterOptions: SongStatusFilter[] = ['ALL', ...selectionStatusOrder];
const stageOptions: { id: StageId; label: string }[] = [
  { id: 'catalog', label: '곡 목록' },
  { id: 'review', label: '선곡 심사' },
  { id: 'assignment', label: '세션 배정' },
];

function compareByStatusThenOrder(left: PerformanceSongSummary, right: PerformanceSongSummary) {
  const statusDiff =
    selectionStatusSortOrder[left.selectionStatus] - selectionStatusSortOrder[right.selectionStatus];
  if (statusDiff !== 0) {
    return statusDiff;
  }

  return left.orderNo - right.orderNo;
}

const toSongDraft = (song: PerformanceSongSummary): SongDraft => ({
  songTitle: song.songTitle,
  singer: song.singer,
  orderNo: String(song.orderNo),
  isSheet: song.isSheet,
  selectionStatus: song.selectionStatus,
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

function isSameNumberArray(left: number[], right: number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function formatUserAssignmentLabel(user: { cohort: number; name: string; nickname: string }) {
  return `${user.cohort}기 ${user.name}(${user.nickname})`;
}

function formatChatTime(value?: string | null) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatRemainingTime(value?: string | null, now = Date.now()) {
  if (!value) {
    return '';
  }

  const remainingMs = new Date(value).getTime() - now;
  if (remainingMs <= 0) {
    return '';
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}시간 ${minutes}분 후 가능`;
  }

  if (minutes > 0) {
    return `${minutes}분 ${paddedSeconds}초 후 가능`;
  }

  return `${seconds}초 후 가능`;
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
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<SongStatusFilter>('ALL');
  const [catalogPage, setCatalogPage] = useState(1);
  const [message, setMessage] = useState('');
  const [selectedPerformanceId, setSelectedPerformanceId] = useState<number | null>(null);
  const [isCreatePerformanceModalOpen, setIsCreatePerformanceModalOpen] = useState(false);
  const [isCreateSongModalOpen, setIsCreateSongModalOpen] = useState(false);
  const [isCreateColumnModalOpen, setIsCreateColumnModalOpen] = useState(false);
  const [isMemberManageModalOpen, setIsMemberManageModalOpen] = useState(false);
  const [isCreateChatRoomsModalOpen, setIsCreateChatRoomsModalOpen] = useState(false);
  const [isMobileChatRoomsModalOpen, setIsMobileChatRoomsModalOpen] = useState(false);
  const [mobileChatRoomSearch, setMobileChatRoomSearch] = useState('');
  const [draggingSongId, setDraggingSongId] = useState<number | null>(null);
  const [dragOverSongId, setDragOverSongId] = useState<number | null>(null);
  const [createPerformanceTitle, setCreatePerformanceTitle] = useState('');
  const [createSongForm, setCreateSongForm] = useState<CreateSongForm>(emptyCreateSongForm);
  const [songDrafts, setSongDrafts] = useState<Record<number, SongDraft>>({});
  const [columnForm, setColumnForm] = useState<ColumnForm>(emptyColumnForm);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<number, Record<number, string>>>({});
  const [selectedChatRoomSongIds, setSelectedChatRoomSongIds] = useState<number[]>([]);
  const [songPendingDelete, setSongPendingDelete] = useState<PerformanceSongSummary | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1280px)').matches,
  );
  const [isSidebarSongListOpen, setIsSidebarSongListOpen] = useState(false);
  const [selectedMemberUserId, setSelectedMemberUserId] = useState('');
  const [selectedChatRoomId, setSelectedChatRoomId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [targetSessionId, setTargetSessionId] = useState('');
  const [chatConnectionMessage, setChatConnectionMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<ChatTypingEvent[]>([]);
  const [isChatInputFocused, setIsChatInputFocused] = useState(false);
  const [isChatActionMenuOpen, setIsChatActionMenuOpen] = useState(false);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const deferredMobileChatRoomSearch = useDeferredValue(mobileChatRoomSearch);
  const deferredAssignmentSearch = useDeferredValue(assignmentSearch);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const chatTransportRef = useRef<ChatTransport | null>(null);
  const currentUserIdRef = useRef<number | null>(null);
  const typingExpiryTimersRef = useRef<Record<number, number>>({});

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
  const currentUserQuery = useQuery({
    queryKey: ['users', 'me'],
    queryFn: userApi.getMe,
  });
  const chatRoomsQuery = useQuery({
    queryKey: ['performance-chat-rooms', selectedPerformanceId],
    queryFn: () => performanceApi.getChatRooms(selectedPerformanceId!),
    enabled: selectedPerformanceId !== null,
  });
  const chatRoomDetailQuery = useQuery({
    queryKey: ['performance-chat-room', selectedPerformanceId, selectedChatRoomId],
    queryFn: () => performanceApi.getChatRoom(selectedPerformanceId!, selectedChatRoomId!),
    enabled: selectedPerformanceId !== null && selectedChatRoomId !== null,
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
  const currentUser = currentUserQuery.data?.data ?? null;
  const isAdmin = currentUser?.role === 'ADMIN';
  const visibleChatRooms = useMemo(
    () => chatRoomsQuery.data?.data ?? EMPTY_ARRAY,
    [chatRoomsQuery.data],
  );
  const mobileFilteredChatRooms = useMemo(
    () => {
      const keyword = deferredMobileChatRoomSearch.trim().toLowerCase();
      if (!keyword) {
        return visibleChatRooms;
      }

      return visibleChatRooms.filter((room) =>
        `${room.songTitle} ${room.singer}`.toLowerCase().includes(keyword),
      );
    },
    [deferredMobileChatRoomSearch, visibleChatRooms],
  );
  const activeChatRoom: ChatRoomDetail | null = chatRoomDetailQuery.data?.data ?? null;
  const newChatRemainingText = formatRemainingTime(activeChatRoom?.nextRoundAvailableAt, nowMs);
  const canStartNewChatRound = Boolean(
    activeChatRoom &&
      (activeChatRoom.canStartNewRound || (activeChatRoom.nextRoundAvailableAt && !newChatRemainingText)),
  );
  const assignableChatSessions = useMemo(
    () =>
      activeChatRoom?.sessions.filter(
        (session) => session.performanceSongSessionId !== null && session.assignedUserId !== null,
      ) ?? [],
    [activeChatRoom],
  );
  const performanceMembers = useMemo(
    () => performance?.members ?? EMPTY_ARRAY,
    [performance],
  );
  const songs = useMemo(
    () => [...(performance?.songs ?? [])].sort((a, b) => a.orderNo - b.orderNo),
    [performance],
  );
  const statusSortedSongs = useMemo(
    () => [...songs].sort(compareByStatusThenOrder),
    [songs],
  );
  const songsByStatus = useMemo(
    () => {
      const groups: Record<SelectionStatus, PerformanceSongSummary[]> = {
        CONFIRMED: [],
        NOT_BAD: [],
        OUT: [],
      };

      statusSortedSongs.forEach((song) => {
        groups[song.selectionStatus].push(song);
      });

      return groups;
    },
    [statusSortedSongs],
  );
  const catalogFilteredSongs = useMemo(
    () =>
      catalogStatusFilter === 'ALL'
        ? statusSortedSongs
        : statusSortedSongs.filter((song) => song.selectionStatus === catalogStatusFilter),
    [catalogStatusFilter, statusSortedSongs],
  );
  const catalogTotalPages = Math.max(1, Math.ceil(catalogFilteredSongs.length / catalogPageSize));
  const safeCatalogPage = Math.min(catalogPage, catalogTotalPages);
  const catalogPageSongs = useMemo(
    () => {
      const startIndex = (safeCatalogPage - 1) * catalogPageSize;
      return catalogFilteredSongs.slice(startIndex, startIndex + catalogPageSize);
    },
    [catalogFilteredSongs, safeCatalogPage],
  );
  const catalogVisibleStart = catalogFilteredSongs.length
    ? (safeCatalogPage - 1) * catalogPageSize + 1
    : 0;
  const catalogVisibleEnd = Math.min(safeCatalogPage * catalogPageSize, catalogFilteredSongs.length);
  const sidebarSongGroups = useMemo(
    () =>
      selectionStatusOrder
        .map((selectionStatus) => ({
          selectionStatus,
          songs: songsByStatus[selectionStatus],
        }))
        .filter((group) => group.songs.length > 0),
    [songsByStatus],
  );
  const confirmedSongs = useMemo(
    () => songs.filter((song) => song.selectionStatus === 'CONFIRMED'),
    [songs],
  );
  const mobileFilteredConfirmedSongs = useMemo(
    () => {
      const keyword = deferredAssignmentSearch.trim().toLowerCase();
      if (!keyword) {
        return confirmedSongs;
      }

      return confirmedSongs.filter((song) =>
        `${song.songTitle} ${song.singer}`.toLowerCase().includes(keyword),
      );
    },
    [deferredAssignmentSearch, confirmedSongs],
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
        'minmax(210px,1.2fr)',
        'minmax(120px,0.7fr)',
        ...columns.map(() => 'minmax(148px,0.9fr)'),
        '88px',
      ].join(' '),
    [columns],
  );

  const availableUsersForMembers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.status === 'ACTIVE' &&
          !performanceMembers.some((member) => member.userId === user.userId),
      ),
    [performanceMembers, users],
  );
  const selectedPerformanceTitle = performance?.title ?? '공연을 선택해 주세요';

  useEffect(() => {
    const nextDrafts = Object.fromEntries(songs.map((song) => [song.performanceSongId, toSongDraft(song)]));
    setSongDrafts((current) => (isSameSongDraftMap(current, nextDrafts) ? current : nextDrafts));
  }, [songs]);

  useEffect(() => {
    setCatalogPage(1);
  }, [catalogStatusFilter, selectedPerformanceId]);

  useEffect(() => {
    setCatalogPage((current) => Math.min(current, catalogTotalPages));
  }, [catalogTotalPages]);

  useEffect(() => {
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

  useEffect(() => {
    const detail = chatRoomDetailQuery.data?.data;
    if (!detail) {
      setChatMessages([]);
      setTargetSessionId('');
      setTypingUsers([]);
      return;
    }

    setChatMessages(detail.messages);
    setTypingUsers([]);
    const firstAssignedSession = detail.sessions.find(
      (session) => session.performanceSongSessionId !== null && session.assignedUserId !== null,
    );
    setTargetSessionId((current) => {
      const currentStillAvailable = detail.sessions.some(
        (session) =>
          session.performanceSongSessionId?.toString() === current && session.assignedUserId !== null,
      );
      return currentStillAvailable ? current : firstAssignedSession?.performanceSongSessionId?.toString() || '';
    });
  }, [chatRoomDetailQuery.data]);

  useEffect(() => {
    const typingExpiryTimers = typingExpiryTimersRef.current;

    return () => {
      Object.values(typingExpiryTimers).forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  useEffect(() => {
    currentUserIdRef.current = currentUser?.userId ?? null;
  }, [currentUser?.userId]);

  useEffect(() => {
    if (!selectedChatRoomId || activeChatRoom?.canStartNewRound || !activeChatRoom?.nextRoundAvailableAt) {
      return;
    }

    setNowMs(Date.now());
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [activeChatRoom?.canStartNewRound, activeChatRoom?.nextRoundAvailableAt, selectedChatRoomId]);

  useEffect(() => {
    const isTyping = Boolean(selectedChatRoomId && isChatInputFocused && chatInput.trim());
    if (!isTyping) {
      chatTransportRef.current?.sendTyping(false);
      return;
    }

    chatTransportRef.current?.sendTyping(true);
    const timerId = window.setInterval(() => {
      chatTransportRef.current?.sendTyping(true);
    }, 1200);

    return () => window.clearInterval(timerId);
  }, [chatInput, isChatInputFocused, selectedChatRoomId]);

  useEffect(() => {
    if (!selectedChatRoomId) {
      chatTransportRef.current?.disconnect();
      chatTransportRef.current = null;
      return;
    }

    const transport = new ChatTransport();
    chatTransportRef.current = transport;
    setChatConnectionMessage('');
    transport.connect({
      chatRoomId: selectedChatRoomId,
      onConnected: () => {
        setChatConnectionMessage('');
      },
      onMessage: (nextMessage) => {
        setChatMessages((current) =>
          current.some((message) => message.messageId === nextMessage.messageId)
            ? current
            : [...current, nextMessage],
        );
      },
      onRound: () => {
        setChatMessages([]);
        setChatConnectionMessage('');
        if (selectedPerformanceId) {
          void queryClient.invalidateQueries({ queryKey: ['performance-chat-room', selectedPerformanceId, selectedChatRoomId] });
          void queryClient.invalidateQueries({ queryKey: ['performance-chat-rooms', selectedPerformanceId] });
        }
      },
      onFeedbackSummary: () => {
        setChatConnectionMessage('');
        if (selectedPerformanceId) {
          void queryClient.invalidateQueries({ queryKey: ['performance-chat-room', selectedPerformanceId, selectedChatRoomId] });
        }
      },
      onTyping: (event: ChatTypingEvent) => {
        if (event.userId === currentUserIdRef.current) {
          return;
        }

        if (typingExpiryTimersRef.current[event.userId]) {
          window.clearTimeout(typingExpiryTimersRef.current[event.userId]);
        }

        if (!event.typing) {
          setTypingUsers((current) => current.filter((user) => user.userId !== event.userId));
          return;
        }

        setTypingUsers((current) => {
          const nextUser = {
            ...event,
            senderName: event.senderName || event.senderNickname || '사용자',
          };
          return current.some((user) => user.userId === event.userId)
            ? current.map((user) => (user.userId === event.userId ? nextUser : user))
            : [...current, nextUser];
        });

        typingExpiryTimersRef.current[event.userId] = window.setTimeout(() => {
          setTypingUsers((current) => current.filter((user) => user.userId !== event.userId));
          delete typingExpiryTimersRef.current[event.userId];
        }, 3200);
      },
      onError: (error) => {
        setChatConnectionMessage(error.message);
      },
    });

    return () => {
      transport.disconnect();
      if (chatTransportRef.current === transport) {
        chatTransportRef.current = null;
      }
    };
  }, [queryClient, selectedChatRoomId, selectedPerformanceId]);

  const clearSuccessMessage = () => {
    setMessage('');
  };

  const setErrorMessage = (nextMessage: string) => {
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
      clearSuccessMessage();
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
      clearSuccessMessage();
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

  const updateSongOrderMutation = useMutation({
    mutationFn: ({
      performanceId,
      songId,
      orderNo,
    }: {
      performanceId: number;
      songId: number;
      orderNo: number;
    }) => performanceApi.updateSongOrder(performanceId, songId, { orderNo }),
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
      clearSuccessMessage();
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
      clearSuccessMessage();
      setIsCreateColumnModalOpen(false);
      setColumnForm({
        ...emptyColumnForm,
      });
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
    onSuccess: async (_, variables) => {
      clearSuccessMessage();
      setIsCreateChatRoomsModalOpen(false);
      await invalidatePerformance(variables.performanceId);
    },
    onError: (error) => setErrorMessage(toApiMessage(error)),
  });

  const startChatRoundMutation = useMutation({
    mutationFn: ({
      performanceId,
      chatRoomId,
    }: {
      performanceId: number;
      chatRoomId: number;
    }) => performanceApi.startChatRound(performanceId, chatRoomId),
    onSuccess: async (_, variables) => {
      setChatMessages([]);
      setChatConnectionMessage('');
      await queryClient.invalidateQueries({ queryKey: ['performance-chat-room', variables.performanceId, variables.chatRoomId] });
      await queryClient.invalidateQueries({ queryKey: ['performance-chat-rooms', variables.performanceId] });
    },
    onError: (error) => {
      setChatConnectionMessage(toApiMessage(error));
    },
  });

  const createAiFeedbackMutation = useMutation({
    mutationFn: ({
      performanceId,
      chatRoomId,
      chatRoundId,
    }: {
      performanceId: number;
      chatRoomId: number;
      chatRoundId: number;
    }) => performanceApi.createAiFeedback(performanceId, chatRoomId, chatRoundId),
    onSuccess: async (_, variables) => {
      setChatConnectionMessage('');
      await queryClient.invalidateQueries({ queryKey: ['performance-chat-room', variables.performanceId, variables.chatRoomId] });
    },
    onError: (error) => {
      setChatConnectionMessage(toApiMessage(error));
    },
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
      selectionStatus: isAdmin ? currentDraft.selectionStatus : song.selectionStatus,
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

  const moveSongOrder = async (
    groupSongs: PerformanceSongSummary[],
    songIndex: number,
    direction: -1 | 1,
  ) => {
    if (!selectedPerformanceId || updateSongOrderMutation.isPending) {
      return;
    }

    const targetIndex = songIndex + direction;
    const currentSong = groupSongs[songIndex];
    const targetSong = groupSongs[targetIndex];
    if (!currentSong || !targetSong) {
      return;
    }

    await Promise.all([
      updateSongOrderMutation.mutateAsync({
        performanceId: selectedPerformanceId,
        songId: currentSong.performanceSongId,
        orderNo: targetSong.orderNo,
      }),
      updateSongOrderMutation.mutateAsync({
        performanceId: selectedPerformanceId,
        songId: targetSong.performanceSongId,
        orderNo: currentSong.orderNo,
      }),
    ]);
  };

  const clearSongDragState = () => {
    setDraggingSongId(null);
    setDragOverSongId(null);
  };

  const handleSongDragStart = (event: DragEvent<HTMLElement>, song: PerformanceSongSummary) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(song.performanceSongId));

    const rowElement = event.currentTarget.closest('[data-song-row="true"]');
    if (rowElement instanceof HTMLElement) {
      const dragPreview = rowElement.cloneNode(true) as HTMLElement;
      const { width } = rowElement.getBoundingClientRect();

      dragPreview.style.position = 'fixed';
      dragPreview.style.top = '-1000px';
      dragPreview.style.left = '-1000px';
      dragPreview.style.width = `${width}px`;
      dragPreview.style.pointerEvents = 'none';
      dragPreview.style.opacity = '0.92';
      dragPreview.style.transform = 'rotate(-1deg)';
      dragPreview.style.boxShadow = '0 22px 46px rgba(15, 23, 42, 0.18)';
      dragPreview.style.borderColor = '#5a43ba';
      dragPreview.style.background = '#ffffff';
      document.body.appendChild(dragPreview);
      event.dataTransfer.setDragImage(dragPreview, 24, 24);
      window.setTimeout(() => dragPreview.remove(), 0);
    }

    setDraggingSongId(song.performanceSongId);
    setDragOverSongId(null);
  };

  const handleSongDragOver = (event: DragEvent<HTMLElement>, targetSong: PerformanceSongSummary) => {
    const draggingSong = statusSortedSongs.find((song) => song.performanceSongId === draggingSongId);
    if (!draggingSong || draggingSong.selectionStatus !== targetSong.selectionStatus) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverSongId(targetSong.performanceSongId);
  };

  const handleSongDrop = async (event: DragEvent<HTMLElement>, targetSong: PerformanceSongSummary) => {
    event.preventDefault();

    if (!selectedPerformanceId || updateSongOrderMutation.isPending) {
      clearSongDragState();
      return;
    }

    const draggedSongId = Number(event.dataTransfer.getData('text/plain')) || draggingSongId;
    const draggingSong = statusSortedSongs.find((song) => song.performanceSongId === draggedSongId);
    if (!draggingSong || draggingSong.performanceSongId === targetSong.performanceSongId) {
      clearSongDragState();
      return;
    }

    if (draggingSong.selectionStatus !== targetSong.selectionStatus) {
      clearSongDragState();
      return;
    }

    const groupSongs = statusSortedSongs.filter(
      (song) => song.selectionStatus === draggingSong.selectionStatus,
    );
    const fromIndex = groupSongs.findIndex((song) => song.performanceSongId === draggingSong.performanceSongId);
    const toIndex = groupSongs.findIndex((song) => song.performanceSongId === targetSong.performanceSongId);
    if (fromIndex < 0 || toIndex < 0) {
      clearSongDragState();
      return;
    }

    const nextSongs = [...groupSongs];
    const [movedSong] = nextSongs.splice(fromIndex, 1);
    nextSongs.splice(toIndex, 0, movedSong);

    const orderNumbers = groupSongs.map((song) => song.orderNo);
    try {
      await Promise.all(
        nextSongs
          .map((song, index) => ({ song, orderNo: orderNumbers[index] }))
          .filter(({ song, orderNo }) => song.orderNo !== orderNo)
          .map(({ song, orderNo }) =>
            updateSongOrderMutation.mutateAsync({
              performanceId: selectedPerformanceId,
              songId: song.performanceSongId,
              orderNo,
            }),
          ),
      );
    } finally {
      clearSongDragState();
    }
  };

  const openChatRoom = (chatRoomId: number) => {
    setSelectedChatRoomId(chatRoomId);
    setIsMobileChatRoomsModalOpen(false);
    setMobileChatRoomSearch('');
    setChatInput('');
    setChatConnectionMessage('');
    setIsChatActionMenuOpen(false);
  };

  const closeChatRoom = () => {
    chatTransportRef.current?.sendTyping(false);
    setSelectedChatRoomId(null);
    setChatMessages([]);
    setChatInput('');
    setTargetSessionId('');
    setTypingUsers([]);
    setChatConnectionMessage('');
    setIsChatActionMenuOpen(false);
  };

  const handleChatInputChange = (value: string) => {
    setChatInput(value);

    const hasContent = value.trim().length > 0;
    chatTransportRef.current?.sendTyping(hasContent);
  };

  const sendChatMessage = () => {
    const normalizedContent = chatInput.trim();
    const numericTargetSessionId = Number(targetSessionId);
    if (!normalizedContent || !Number.isFinite(numericTargetSessionId) || !assignableChatSessions.length) {
      return;
    }

    chatTransportRef.current?.sendMessage({
      targetPerformanceSongSessionId: numericTargetSessionId,
      content: normalizedContent,
    });
    chatTransportRef.current?.sendTyping(false);
    setChatInput('');
  };

  const moveStage = (nextStage: StageId) => {
    setStage(nextStage);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches) {
      setIsSidebarOpen(false);
    }
  };

  if (selectedPerformanceId === null) {
    return (
      <section className="space-y-8">
        {message ? <InlineNotice tone="error">{message}</InlineNotice> : null}

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
      {message ? <InlineNotice tone="error">{message}</InlineNotice> : null}

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
            className="fixed bottom-4 left-4 z-40 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition hover:border-[#5a43ba]/30 hover:text-[#5a43ba] xl:absolute xl:left-0 xl:top-6 xl:h-11 xl:w-11 xl:rounded-lg xl:px-0 xl:text-xl"
          >
            <span className="text-lg leading-none xl:block">›</span>
            <span className="xl:hidden">공연 메뉴</span>
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
              <h2 className="min-w-0 text-xl font-semibold leading-7 text-slate-900">{selectedPerformanceTitle}</h2>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 rounded-lg bg-slate-50 px-3 text-slate-600 shadow-none ring-slate-200 hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setIsMemberManageModalOpen(true)}
              >
                멤버 관리
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {stageOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => moveStage(option.id)}
                  className={cn(
                    'min-h-10 rounded-lg px-2 text-xs font-semibold transition',
                    stage === option.id
                      ? 'bg-white text-[#4d36a2] shadow-sm'
                      : 'text-slate-500 hover:bg-white/70 hover:text-slate-900',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className={cn('space-y-3 overflow-hidden', isSidebarSongListOpen && 'flex-1')}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left transition hover:bg-slate-50"
                onClick={() => setIsSidebarSongListOpen((current) => !current)}
                aria-expanded={isSidebarSongListOpen}
              >
                <span>
                  <span className="block text-lg font-semibold text-slate-900">곡 목록</span>
                </span>
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  {songs.length}곡
                  <span
                    className={cn(
                      'inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-base text-slate-500 transition',
                      isSidebarSongListOpen && 'rotate-90',
                    )}
                  >
                    ›
                  </span>
                </span>
              </button>

              {isSidebarSongListOpen && songs.length ? (
                <div className="space-y-3 xl:max-h-[calc(100vh-25rem)] xl:overflow-y-auto xl:pr-1">
                  {sidebarSongGroups.map((group) => {
                    const groupMeta = statusMeta[group.selectionStatus];
                    return (
                      <div key={group.selectionStatus} className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs font-bold text-slate-500">{groupMeta.label}</span>
                          <span className="text-[11px] font-semibold text-slate-400">{group.songs.length}곡</span>
                        </div>
                        {group.songs.map((song) => (
                          <div
                            key={song.performanceSongId}
                            className="group flex w-full items-center gap-2 rounded-lg border border-transparent bg-slate-50 px-3 py-3 transition hover:border-slate-200 hover:bg-white hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                          >
                            <span
                              className={cn(
                                'h-2.5 w-2.5 shrink-0 rounded-full',
                                groupMeta.tone === 'confirmed' && 'bg-emerald-500',
                                groupMeta.tone === 'candidate' && 'bg-amber-400',
                                groupMeta.tone === 'out' && 'bg-rose-400',
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => moveStage('catalog')}
                              className="min-w-0 flex-1 text-left"
                            >
                              <span className="block truncate text-sm font-semibold text-slate-800">
                                {song.songTitle}
                              </span>
                              <span className="mt-0.5 block text-xs font-medium text-slate-400">{song.singer}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : isSidebarSongListOpen ? (
                <StatePanel
                  title="등록된 곡이 없습니다"
                  description="왼쪽 위 곡 추가 버튼으로 첫 곡을 바로 등록해 보세요."
                />
              ) : null}
            </div>

            <div className="space-y-3 overflow-hidden">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">채팅방</h3>
              </div>

              {chatRoomsQuery.isLoading ? (
                <SkeletonList count={3} />
              ) : visibleChatRooms.length ? (
                <div className="space-y-2 xl:max-h-[calc(100vh-18rem)] xl:overflow-y-auto xl:pr-1">
                  {visibleChatRooms.map((room) => (
                    <button
                      key={room.chatRoomId}
                      type="button"
                      className="group w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-[#5a43ba]/25 hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)]"
                      onClick={() => openChatRoom(room.chatRoomId)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{room.songTitle}</p>
                          <p className="mt-1 truncate text-xs font-medium text-slate-500">{room.singer}</p>
                        </div>
                        <span className="shrink-0 rounded-lg bg-[#f3efff] px-2.5 py-1 text-xs font-semibold text-[#5a43ba] transition group-hover:bg-[#5a43ba] group-hover:text-white">
                          입장
                        </span>
                      </div>
                    </button>
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
          <div className="sticky top-3 z-20 rounded-[18px] border border-slate-200 bg-white/95 p-2 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-slate-900"
              >
                {selectedPerformanceTitle}
              </button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="min-h-9 rounded-lg px-3 text-xs"
                onClick={() => setIsSidebarOpen(true)}
              >
                메뉴
              </Button>
            </div>
            <Button
              type="button"
              className="mb-2 min-h-11 w-full rounded-xl"
              onClick={() => {
                setMobileChatRoomSearch('');
                setIsMobileChatRoomsModalOpen(true);
              }}
            >
              채팅방 바로가기
            </Button>
            <div className="grid grid-cols-3 gap-1">
              {stageOptions.map((option) => (
                <button
                  key={`mobile-${option.id}`}
                  type="button"
                  onClick={() => setStage(option.id)}
                  className={cn(
                    'min-h-10 rounded-xl px-2 text-xs font-semibold transition',
                    stage === option.id
                      ? 'bg-[#f3efff] text-[#4d36a2]'
                      : 'text-slate-500 hover:bg-slate-50',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {selectedPerformanceId && stage === 'catalog' ? (
            <div>
              <Card className="space-y-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="section-kicker">Song List</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">등록된 곡</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                    <Button variant="ghost" onClick={() => moveStage('assignment')}>
                      세션 배정
                    </Button>
                    <Button onClick={() => setIsCreateSongModalOpen(true)}>곡 추가</Button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-4">
                  <div className="rounded-[8px] border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500">전체</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{songs.length}</p>
                  </div>
                  <div className="rounded-[8px] border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <p className="text-xs font-semibold text-emerald-700">확정</p>
                    <p className="mt-1 text-2xl font-semibold text-emerald-800">
                      {songsByStatus.CONFIRMED.length}
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-700">후보</p>
                    <p className="mt-1 text-2xl font-semibold text-amber-800">
                      {songsByStatus.NOT_BAD.length}
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-rose-100 bg-rose-50 px-4 py-3">
                    <p className="text-xs font-semibold text-rose-700">제외</p>
                    <p className="mt-1 text-2xl font-semibold text-rose-800">
                      {songsByStatus.OUT.length}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-[18px] border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    {catalogStatusFilterOptions.map((filter) => {
                      const isActive = catalogStatusFilter === filter;
                      const label = filter === 'ALL' ? '전체' : statusMeta[filter].label;
                      const count = filter === 'ALL' ? songs.length : songsByStatus[filter].length;

                      return (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setCatalogStatusFilter(filter)}
                          className={cn(
                            'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                            isActive
                              ? 'border-[#5a43ba] bg-white text-[#4d36a2] shadow-[0_10px_22px_rgba(90,67,186,0.12)]'
                              : 'border-slate-200 bg-white/70 text-slate-600 hover:border-[#5a43ba]/30 hover:text-[#4d36a2]',
                          )}
                        >
                          {label}
                          <span className="ml-1 text-xs text-slate-400">{count}</span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-sm font-semibold text-slate-500">
                    {catalogFilteredSongs.length
                      ? `${catalogVisibleStart}-${catalogVisibleEnd} / ${catalogFilteredSongs.length}곡`
                      : '표시할 곡이 없습니다'}
                  </p>
                </div>

                {!songs.length ? (
                  <StatePanel
                    title="등록된 곡이 없습니다"
                    description="오른쪽 상단 곡 추가 버튼으로 첫 곡을 등록해 보세요."
                  />
                ) : !catalogFilteredSongs.length ? (
                  <StatePanel
                    title="조건에 맞는 곡이 없습니다"
                    description="다른 상태 필터를 선택해 주세요."
                  />
                ) : (
                  <div className="space-y-3">
                    {catalogPageSongs.map((song) => {
                      const draft = songDrafts[song.performanceSongId] ?? toSongDraft(song);
                      const detail = songDetailsById.get(song.performanceSongId);
                      const isLockedSong = detail?.chatRoomCreated === true;
                      const orderGroupSongs = songsByStatus[song.selectionStatus];
                      const orderGroupIndex = orderGroupSongs.findIndex(
                        (groupSong) => groupSong.performanceSongId === song.performanceSongId,
                      );

                      return (
                        <div
                          key={song.performanceSongId}
                          data-song-row="true"
                          onDragOver={(event) => handleSongDragOver(event, song)}
                          onDrop={(event) => void handleSongDrop(event, song)}
                          onDragLeave={(event) => {
                            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                              setDragOverSongId((current) =>
                                current === song.performanceSongId ? null : current,
                              );
                            }
                          }}
                          className={cn(
                            'grid gap-3 rounded-[20px] border bg-white p-3 transition sm:p-4 md:grid-cols-[40px_minmax(0,1.2fr)_minmax(0,1fr)_110px_176px_108px_auto]',
                            dragOverSongId === song.performanceSongId
                              ? 'border-[#5a43ba] bg-[#fbfaff] shadow-[0_14px_32px_rgba(90,67,186,0.14)] ring-2 ring-[#dfd6ff]'
                              : 'border-slate-200',
                            draggingSongId === song.performanceSongId &&
                              'scale-[0.99] border-[#5a43ba] bg-[#f7f4ff] opacity-80 shadow-[0_16px_36px_rgba(90,67,186,0.16)] ring-2 ring-[#dfd6ff]',
                          )}
                        >
                          <div className="hidden items-end md:flex">
                            <button
                              type="button"
                              draggable={!updateSongOrderMutation.isPending}
                              aria-label={`${song.songTitle} 순서 드래그`}
                              title="드래그해서 순서 변경"
                              onDragStart={(event) => handleSongDragStart(event, song)}
                              onDragEnd={clearSongDragState}
                              className="flex h-10 w-10 cursor-grab items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-lg font-bold leading-none text-slate-400 transition hover:border-[#5a43ba]/30 hover:bg-[#f3efff] hover:text-[#5a43ba] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={updateSongOrderMutation.isPending}
                            >
                              ⋮⋮
                            </button>
                          </div>

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
                            <div className="flex items-center justify-between gap-2">
                              <span className="field-label">현재 상태</span>
                              {!isAdmin ? (
                                <span className="text-[11px] font-semibold text-slate-500">
                                  관리자만 변경 가능
                                </span>
                              ) : null}
                            </div>
                            <div className="grid h-10 grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                              {selectionStatusOrder.map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  disabled={!isAdmin || updateSongStatusMutation.isPending}
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
                                    'rounded-lg text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
                                    draft.selectionStatus === status
                                      ? status === 'CONFIRMED'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : status === 'OUT'
                                          ? 'bg-rose-100 text-rose-700'
                                          : 'bg-amber-100 text-amber-700'
                                      : 'text-slate-500 hover:bg-white disabled:hover:bg-transparent',
                                  )}
                                >
                                  {statusMeta[status].label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <span className="field-label">순서</span>
                            <div className="grid h-10 grid-cols-2 gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-10 rounded-xl px-2"
                                disabled={orderGroupIndex <= 0 || updateSongOrderMutation.isPending}
                                onClick={() => void moveSongOrder(orderGroupSongs, orderGroupIndex, -1)}
                              >
                                위
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-10 rounded-xl px-2"
                                disabled={
                                  orderGroupIndex < 0 ||
                                  orderGroupIndex >= orderGroupSongs.length - 1 ||
                                  updateSongOrderMutation.isPending
                                }
                                onClick={() => void moveSongOrder(orderGroupSongs, orderGroupIndex, 1)}
                              >
                                아래
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="min-h-10 w-full rounded-xl text-rose-700 hover:bg-rose-50"
                              disabled={deleteSongMutation.isPending || isLockedSong}
                              onClick={() => setSongPendingDelete(song)}
                            >
                              삭제
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    {catalogTotalPages > 1 ? (
                      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-slate-500">
                          {safeCatalogPage} / {catalogTotalPages} 페이지
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={safeCatalogPage <= 1}
                            onClick={() => setCatalogPage((current) => Math.max(1, current - 1))}
                          >
                            이전
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={safeCatalogPage >= catalogTotalPages}
                            onClick={() =>
                              setCatalogPage((current) => Math.min(catalogTotalPages, current + 1))
                            }
                          >
                            다음
                          </Button>
                        </div>
                      </div>
                    ) : null}
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
                    {statusSortedSongs.map((song) => {
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
                                  {song.songTitle}
                                </p>
                                <StatusBadge tone={statusMeta[song.selectionStatus].tone}>
                                  {statusMeta[song.selectionStatus].label}
                                </StatusBadge>
                                <StatusBadge tone="neutral">{song.isSheet ? '악보 O' : '악보 X'}</StatusBadge>
                              </div>
                              <p className="mt-2 text-sm text-slate-600">{song.singer}</p>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              {selectionStatusOrder.map((status) => (
                                <Button
                                  key={status}
                                  size="sm"
                                  variant={song.selectionStatus === status ? 'secondary' : 'ghost'}
                                  disabled={!isAdmin || updateSongStatusMutation.isPending}
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
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                    <Button
                      variant="secondary"
                      onClick={() => setIsCreateChatRoomsModalOpen(true)}
                    >
                      합주방 생성
                    </Button>
                    <Button variant="ghost" onClick={() => moveStage('catalog')}>
                      곡 목록
                    </Button>
                    <Button onClick={() => setIsCreateColumnModalOpen(true)}>세션 추가</Button>
                    <div className="flex min-h-12 items-center justify-center rounded-2xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 sm:min-h-10 sm:rounded-xl">
                      {confirmedSongs.length}곡
                    </div>
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
                  <>
                    <div className="space-y-3 md:hidden">
                      <Input
                        value={assignmentSearch}
                        onChange={(event) => setAssignmentSearch(event.target.value)}
                        placeholder="곡 제목 또는 가수 검색"
                        className="h-11 rounded-xl bg-white"
                      />

                      {!mobileFilteredConfirmedSongs.length ? (
                        <StatePanel
                          title="검색 결과가 없습니다"
                          description="다른 곡 제목이나 가수 이름으로 검색해 주세요."
                          className="border-0 bg-transparent"
                        />
                      ) : null}

                      {mobileFilteredConfirmedSongs.map((song) => {
                        const detail = songDetailsById.get(song.performanceSongId);
                        const draft = assignmentDrafts[song.performanceSongId] ?? {};

                        return (
                          <div
                            key={`assignment-mobile-${song.performanceSongId}`}
                            className="space-y-4 rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-slate-900">{song.songTitle}</p>
                                <p className="mt-1 truncate text-sm font-medium text-slate-500">{song.singer}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-400">
                                  {song.isSheet ? '악보 O' : '악보 X'}
                                </p>
                              </div>
                              <StatusBadge tone={detail?.chatRoomCreated ? 'confirmed' : 'neutral'}>
                                {detail?.chatRoomCreated ? '생성됨' : '없음'}
                              </StatusBadge>
                            </div>

                            <div className="space-y-3">
                              {columns.map((column) => (
                                <label
                                  key={`assignment-mobile-${song.performanceSongId}-${column.performanceSessionColumnId}`}
                                  className="grid gap-1.5"
                                >
                                  <span className="text-xs font-semibold text-slate-500">
                                    {column.sessionName}
                                  </span>
                                  <Select
                                    value={draft[column.performanceSessionColumnId] ?? ''}
                                    className={cn(
                                      'h-11 rounded-xl border-slate-300 bg-slate-50 pl-3 pr-9 text-sm font-medium text-slate-800 focus:ring-2',
                                      !draft[column.performanceSessionColumnId] && 'text-slate-500',
                                    )}
                                    onChange={(event) => {
                                      const nextDraft = {
                                        ...draft,
                                        [column.performanceSessionColumnId]: event.target.value,
                                      };

                                      void persistAssignmentDraft(song.performanceSongId, nextDraft);
                                    }}
                                  >
                                    <option value="">{column.isRequired ? '선택 필요' : '미배정'}</option>
                                    {performanceMembers.map((user: PerformanceMember) => (
                                      <option key={user.userId} value={user.userId}>
                                        {formatUserAssignmentLabel(user)}
                                      </option>
                                    ))}
                                  </Select>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
                      <div className="min-w-max">
                        <div
                          className="grid gap-3 border-b border-slate-200 bg-slate-100/90 px-4 py-3 text-sm font-semibold text-slate-600"
                          style={{ gridTemplateColumns: assignmentGridTemplate }}
                        >
                          <span className="sticky left-0 z-20 bg-slate-100/90">곡 제목</span>
                          <span className="sticky left-[210px] z-20 bg-slate-100/90">가수</span>
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
                              className="grid gap-3 border-b border-slate-100 bg-white px-4 py-3 transition last:border-b-0 hover:bg-[#faf9ff]"
                              style={{ gridTemplateColumns: assignmentGridTemplate }}
                            >
                              <div className="sticky left-0 z-10 min-w-0 bg-inherit">
                                <p className="truncate text-[15px] font-semibold text-slate-900">{song.songTitle}</p>
                                <p className="mt-0.5 text-xs font-medium text-slate-500">{song.isSheet ? '악보 O' : '악보 X'}</p>
                              </div>

                              <div className="sticky left-[210px] z-10 flex items-center truncate bg-inherit text-sm font-medium text-slate-700">{song.singer}</div>

                              {columns.map((column) => (
                                <Select
                                  key={`${song.performanceSongId}-${column.performanceSessionColumnId}`}
                                  value={draft[column.performanceSessionColumnId] ?? ''}
                                  className={cn(
                                    'h-9 rounded-lg border-slate-300 bg-slate-50 pl-2.5 pr-8 text-[13px] font-medium text-slate-800 focus:ring-2',
                                    !draft[column.performanceSessionColumnId] && 'text-slate-500',
                                  )}
                                  onChange={(event) => {
                                    const nextDraft = {
                                      ...draft,
                                      [column.performanceSessionColumnId]: event.target.value,
                                    };

                                    void persistAssignmentDraft(song.performanceSongId, nextDraft);
                                  }}
                                >
                                  <option value="">{column.isRequired ? '선택 필요' : '미배정'}</option>
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
                  </>
                )}
              </Card>

            </div>
          ) : null}
        </div>
      </div>

      <Modal
        open={isCreateChatRoomsModalOpen}
        title="합주방 생성 대상"
        description="채팅방이 아직 없는 확정 곡만 선택 대상으로 보여줍니다."
        size="lg"
        onClose={() => setIsCreateChatRoomsModalOpen(false)}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setIsCreateChatRoomsModalOpen(false)}
            >
              취소
            </Button>
            <Button
              variant="secondary"
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
              disabled={!selectedChatRoomSongIds.length || createChatRoomsMutation.isPending}
              onClick={() => {
                if (!selectedPerformanceId) return;
                createChatRoomsMutation.mutate({
                  performanceId: selectedPerformanceId,
                  performanceSongIds: selectedChatRoomSongIds,
                });
              }}
            >
              {createChatRoomsMutation.isPending
                ? '합주방 생성 중...'
                : `${selectedChatRoomSongIds.length}곡 합주방 생성`}
            </Button>
          </div>
        }
      >
        {creatableConfirmedSongs.length ? (
          <div className="space-y-3">
            {creatableConfirmedSongs.map((song) => (
              <label
                key={song.performanceSongId}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-[#5a43ba]/25 hover:bg-white"
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
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">
                    {song.songTitle}
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-500">{song.singer}</p>
                </div>
                <StatusBadge tone="confirmed">확정</StatusBadge>
              </label>
            ))}
          </div>
        ) : (
          <StatePanel
            title="생성할 수 있는 합주방이 없습니다"
            description="채팅방이 아직 없는 확정 곡만 이 목록에 표시됩니다."
            className="border-0 bg-transparent"
          />
        )}
      </Modal>

      <Modal
        open={isMobileChatRoomsModalOpen}
        title="채팅방"
        description="확정 곡의 합주방에 바로 들어갈 수 있습니다."
        onClose={() => {
          setIsMobileChatRoomsModalOpen(false);
          setMobileChatRoomSearch('');
        }}
      >
        {chatRoomsQuery.isLoading ? (
          <SkeletonList count={4} />
        ) : visibleChatRooms.length ? (
          <div className="space-y-3">
            <Input
              value={mobileChatRoomSearch}
              onChange={(event) => setMobileChatRoomSearch(event.target.value)}
              placeholder="곡 제목 또는 가수 검색"
              className="h-11 rounded-xl bg-slate-50"
            />

            {mobileFilteredChatRooms.length ? (
              <div className="space-y-2">
                {mobileFilteredChatRooms.map((room) => (
                  <button
                    key={`mobile-room-${room.chatRoomId}`}
                    type="button"
                    className="group w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-[#5a43ba]/25 hover:bg-[#fbfaff]"
                    onClick={() => openChatRoom(room.chatRoomId)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-900">{room.songTitle}</p>
                        <p className="mt-1 truncate text-sm font-medium text-slate-500">{room.singer}</p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-[#f3efff] px-3 py-1.5 text-sm font-semibold text-[#5a43ba]">
                        입장
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <StatePanel
                title="검색 결과가 없습니다"
                description="다른 곡 제목이나 가수 이름으로 검색해 주세요."
                className="border-0 bg-transparent"
              />
            )}
          </div>
        ) : (
          <StatePanel
            title="보이는 채팅방이 없습니다"
            description="확정 곡으로 합주방을 만들면 여기에 표시됩니다."
            className="border-0 bg-transparent"
          />
        )}
      </Modal>

      <Modal
        open={selectedChatRoomId !== null}
        title={activeChatRoom ? activeChatRoom.room.songTitle : '채팅방'}
        size="xl"
        onClose={closeChatRoom}
        hideCloseButton
        bodyClassName="bg-[#f2f5f8] px-0 py-0 md:px-0"
        headerActions={
          activeChatRoom && isAdmin ? (
            <>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl font-semibold leading-none text-slate-700 transition hover:bg-slate-200 sm:hidden"
                aria-label="채팅방 관리 메뉴"
                aria-expanded={isChatActionMenuOpen}
                onClick={() => setIsChatActionMenuOpen((current) => !current)}
              >
                ≡
              </button>
              <div className="hidden items-center gap-2 sm:flex">
                <Button
                  size="sm"
                  variant="secondary"
                  title={newChatRemainingText || undefined}
                  disabled={
                    !selectedPerformanceId ||
                    !selectedChatRoomId ||
                    !canStartNewChatRound ||
                    startChatRoundMutation.isPending
                  }
                  onClick={() => {
                    if (!selectedPerformanceId || !selectedChatRoomId) return;
                    startChatRoundMutation.mutate({
                      performanceId: selectedPerformanceId,
                      chatRoomId: selectedChatRoomId,
                    });
                  }}
                >
                  {startChatRoundMutation.isPending
                    ? '시작 중...'
                    : newChatRemainingText
                      ? newChatRemainingText
                      : '새채팅 시작'}
                </Button>
                <Button
                  size="sm"
                  disabled={
                    !selectedPerformanceId ||
                    !selectedChatRoomId ||
                    !activeChatRoom.room.currentRound ||
                    activeChatRoom.currentRoundSummarized ||
                    createAiFeedbackMutation.isPending
                  }
                  onClick={() => {
                    if (!selectedPerformanceId || !selectedChatRoomId || !activeChatRoom.room.currentRound) return;
                    createAiFeedbackMutation.mutate({
                      performanceId: selectedPerformanceId,
                      chatRoomId: selectedChatRoomId,
                      chatRoundId: activeChatRoom.room.currentRound.chatRoundId,
                    });
                  }}
                >
                  {createAiFeedbackMutation.isPending
                    ? '생성 중...'
                    : activeChatRoom.currentRoundSummarized
                      ? '생성됨'
                      : '피드백 생성'}
                </Button>
              </div>
            </>
          ) : null
        }
        footer={
          activeChatRoom ? (
            <div className="space-y-2 bg-white">
              {typingUsers.length ? (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                    {typingUsers.map((user) => user.senderName).join(', ')}님이 입력 중입니다...
                  </div>
                </div>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_92px] md:grid-cols-[220px_minmax(0,1fr)_92px]">
                <Select
                  value={targetSessionId}
                  onChange={(event) => setTargetSessionId(event.target.value)}
                  className="h-11 rounded-xl bg-slate-50 sm:col-span-2 md:col-span-1"
                  disabled={!assignableChatSessions.length}
                  aria-label="피드백할 세션 선택"
                >
                  {assignableChatSessions.length ? (
                    assignableChatSessions.map((session) => {
                      const assignedMember = performanceMembers.find(
                        (member) => member.userId === session.assignedUserId,
                      );
                      return (
                        <option
                          key={session.performanceSongSessionId}
                          value={String(session.performanceSongSessionId)}
                        >
                          {session.sessionName}
                          {assignedMember ? ` · ${assignedMember.name}` : ''}
                        </option>
                      );
                    })
                  ) : (
                    <option value="">배정된 세션 없음</option>
                  )}
                </Select>
                <Input
                  value={chatInput}
                  onChange={(event) => handleChatInputChange(event.target.value)}
                  onFocus={() => {
                    setIsChatInputFocused(true);
                    if (chatInput.trim()) {
                      chatTransportRef.current?.sendTyping(true);
                    }
                  }}
                  onBlur={() => {
                    setIsChatInputFocused(false);
                    chatTransportRef.current?.sendTyping(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      sendChatMessage();
                    }
                  }}
                  disabled={!assignableChatSessions.length}
                  placeholder={assignableChatSessions.length ? '피드백 메시지 입력' : '세션 배정 후 피드백을 보낼 수 있습니다'}
                  className="h-11 rounded-xl bg-slate-50"
                />
                <Button
                  size="sm"
                  className="min-h-11 rounded-xl"
                  disabled={!chatInput.trim() || !targetSessionId || !assignableChatSessions.length}
                  onClick={sendChatMessage}
                >
                  전송
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {chatRoomDetailQuery.isLoading ? (
          <div className="flex min-h-[58dvh] flex-col sm:min-h-[58vh]">
            <div className="border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-2 h-3 w-56" />
            </div>
            <div className="flex-1 space-y-4 bg-slate-50 px-4 py-5 sm:px-6">
              <Skeleton className="h-16 w-4/5 rounded-2xl" />
              <Skeleton className="ml-auto h-16 w-3/4 rounded-2xl" />
              <Skeleton className="h-20 w-5/6 rounded-2xl" />
            </div>
          </div>
        ) : activeChatRoom ? (
          <div className="flex min-h-[58dvh] flex-col sm:min-h-[58vh]">
            <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_20%_0%,rgba(90,67,186,0.06),transparent_28%),linear-gradient(180deg,#f6f8fb_0%,#eef3f7_100%)] px-3 py-4 sm:px-6 sm:py-5">
              {isChatActionMenuOpen && isAdmin ? (
                <div className="mb-4 grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.08)] sm:hidden">
                  <Button
                    size="sm"
                    variant="secondary"
                    title={newChatRemainingText || undefined}
                    disabled={
                      !selectedPerformanceId ||
                      !selectedChatRoomId ||
                      !canStartNewChatRound ||
                      startChatRoundMutation.isPending
                    }
                    onClick={() => {
                      if (!selectedPerformanceId || !selectedChatRoomId) return;
                      setIsChatActionMenuOpen(false);
                      startChatRoundMutation.mutate({
                        performanceId: selectedPerformanceId,
                        chatRoomId: selectedChatRoomId,
                      });
                    }}
                  >
                    {startChatRoundMutation.isPending
                      ? '시작 중...'
                      : newChatRemainingText
                        ? newChatRemainingText
                        : '새채팅 시작'}
                  </Button>
                  <Button
                    size="sm"
                    disabled={
                      !selectedPerformanceId ||
                      !selectedChatRoomId ||
                      !activeChatRoom.room.currentRound ||
                      activeChatRoom.currentRoundSummarized ||
                      createAiFeedbackMutation.isPending
                    }
                    onClick={() => {
                      if (!selectedPerformanceId || !selectedChatRoomId || !activeChatRoom.room.currentRound) return;
                      setIsChatActionMenuOpen(false);
                      createAiFeedbackMutation.mutate({
                        performanceId: selectedPerformanceId,
                        chatRoomId: selectedChatRoomId,
                        chatRoundId: activeChatRoom.room.currentRound.chatRoundId,
                      });
                    }}
                  >
                    {createAiFeedbackMutation.isPending
                      ? '생성 중...'
                      : activeChatRoom.currentRoundSummarized
                        ? '생성됨'
                        : '피드백 생성'}
                  </Button>
                </div>
              ) : null}
              {chatConnectionMessage ? (
                <div className="mx-auto mb-4 max-w-md">
                  <InlineNotice tone="error">{chatConnectionMessage}</InlineNotice>
                </div>
              ) : null}
              {!assignableChatSessions.length ? (
                <div className="mx-auto mb-4 max-w-md">
                  <InlineNotice tone="error">
                    세션 배정에서 담당자를 먼저 지정해야 피드백을 보낼 수 있습니다.
                  </InlineNotice>
                </div>
              ) : null}
              {chatMessages.length ? (
                <div className="space-y-4">
                  {chatMessages.map((chatMessage) => {
                    const isMine = chatMessage.senderUserId === currentUser?.userId;
                    return (
                    <div
                      key={chatMessage.messageId}
                      className={cn('flex gap-2', isMine ? 'justify-end' : 'justify-start')}
                    >
                      <div className={cn('max-w-[86%] space-y-1 sm:max-w-[64%]', isMine && 'items-end text-right')}>
                        {!isMine ? (
                          <p className="px-1 text-xs font-semibold text-slate-700">
                            {chatMessage.senderName}
                            <span className="ml-1 font-medium text-slate-500">
                              {chatMessage.senderRepresentativeSessionName ?? '세션 미지정'}
                            </span>
                          </p>
                        ) : null}
                        <div className={cn('flex items-end gap-2', isMine && 'flex-row-reverse')}>
                          <div
                            className={cn(
                              'rounded-2xl border px-3 py-2.5 text-left text-sm leading-6 shadow-[0_8px_20px_rgba(15,23,42,0.05)] sm:px-4 sm:py-3',
                              isMine
                                ? 'rounded-tr-md border-[#dfd6ff] bg-[#f3efff] text-[#241b42]'
                                : 'rounded-tl-md border-slate-200 bg-white text-slate-900',
                            )}
                          >
                            <p className="mb-2 inline-flex max-w-full items-center rounded-lg bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-[#5a43ba] ring-1 ring-[#dfd6ff]">
                              <span className="truncate">
                                {chatMessage.targetSessionName}에게
                                {chatMessage.targetUserName ? ` · ${chatMessage.targetUserName}` : ''}
                              </span>
                            </p>
                            <p className="whitespace-pre-wrap break-words">{chatMessage.content}</p>
                          </div>
                          <span className="shrink-0 pb-1 text-[11px] font-medium text-slate-500">
                            {formatChatTime(chatMessage.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[360px] items-center justify-center">
                  <div className="rounded-full bg-white/72 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
                    아직 메시지가 없습니다
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <StatePanel title="합주방 정보를 불러오지 못했습니다" description="목록에서 다시 입장해 주세요." />
        )}
      </Modal>

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
                      clearSuccessMessage();
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
