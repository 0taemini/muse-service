import { http } from '@shared/api/http';
import type { ApiResponse } from '@shared/types/api';

export type SelectionStatus = 'CONFIRMED' | 'NOT_BAD' | 'OUT';

export interface PerformanceSummary {
  performanceId: number;
  title: string;
  songCount: number;
  createdAt: string;
}

export interface PerformanceSongSummary {
  performanceSongId: number;
  songTitle: string;
  singer: string;
  isSheet: boolean;
  orderNo: number;
  selectionStatus: SelectionStatus;
}

export interface PerformanceMember {
  userId: number;
  name: string;
  cohort: number;
  nickname: string;
}

export interface PerformanceDetail {
  performanceId: number;
  title: string;
  songCount: number;
  createdAt: string;
  songs: PerformanceSongSummary[];
  members: PerformanceMember[];
}

export interface PerformanceSongSession {
  performanceSongSessionId: number | null;
  performanceSessionColumnId: number | null;
  baseSessionTypeId: number | null;
  sessionName: string;
  isRequired: boolean;
  displayOrder: number;
  assignedUserId: number | null;
}

export interface PerformanceSessionColumn {
  performanceSessionColumnId: number;
  baseSessionTypeId: number | null;
  sessionName: string;
  isRequired: boolean;
  displayOrder: number;
  sessionSource: 'DEFAULT' | 'CUSTOM';
}

export interface PerformanceSongDetail {
  performanceSongId: number;
  performanceId: number;
  songTitle: string;
  singer: string;
  isSheet: boolean;
  orderNo: number;
  selectionStatus: SelectionStatus;
  createdByUserId: number | null;
  chatRoomCreated: boolean;
  sessions: PerformanceSongSession[];
}

export interface ChatRoundSummary {
  chatRoundId: number;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  summarizedAt: string | null;
  summarizedByUserId: number | null;
}

export interface ChatRoomSummary {
  chatRoomId: number;
  performanceId: number;
  performanceSongId: number;
  songTitle: string;
  singer: string;
  orderNo: number;
  selectionStatus: SelectionStatus;
  currentRound: ChatRoundSummary | null;
}

export interface ChatMessage {
  messageId: number;
  chatRoomId: number;
  chatRoundId: number;
  senderUserId: number;
  senderName: string;
  senderNickname: string;
  targetPerformanceSongSessionId: number;
  targetSessionName: string;
  targetUserId: number | null;
  targetUserName: string | null;
  senderRepresentativeSessionTypeId: number | null;
  senderRepresentativeSessionName: string | null;
  content: string;
  createdAt: string;
}

export interface ChatRoomDetail {
  room: ChatRoomSummary;
  sessions: PerformanceSongSession[];
  messages: ChatMessage[];
  canStartNewRound: boolean;
  nextRoundAvailableAt: string | null;
  currentRoundSummarized: boolean;
}

export interface FeedbackSummary {
  summaryId: number;
  chatRoundId: number;
  performanceSongSessionId: number;
  sessionName: string;
  targetUserId: number | null;
  targetUserName: string | null;
  summaryText: string;
  createdByUserId: number;
  createdAt: string;
}

export interface CreatePerformancePayload {
  title: string;
}

export interface CreatePerformanceMemberPayload {
  userId: number;
}

export interface CreatePerformanceSongPayload {
  songTitle: string;
  singer: string;
  isSheet: boolean;
  orderNo?: number;
  selectionStatus?: SelectionStatus;
}

export interface UpdatePerformanceSongPayload {
  songTitle: string;
  singer: string;
  isSheet: boolean;
  orderNo: number;
}

export interface UpdatePerformanceSongStatusPayload {
  selectionStatus: SelectionStatus;
}

export interface UpdatePerformanceSongOrderPayload {
  orderNo: number;
}

export interface UpdatePerformanceSongSessionsPayload {
  sessions: Array<{
    performanceSessionColumnId: number;
    assignedUserId?: number | null;
  }>;
}

export interface UpsertPerformanceSessionColumnPayload {
  baseSessionTypeId?: number | null;
  sessionName: string;
  isRequired?: boolean;
  displayOrder?: number;
}

export interface CreateChatRoomsPayload {
  performanceSongIds: number[];
}

const unwrap = async <T>(promise: Promise<{ data: ApiResponse<T> }>) => {
  const response = await promise;
  return response.data;
};

export const performanceApi = {
  createPerformance: (payload: CreatePerformancePayload) =>
    unwrap<PerformanceDetail>(http.post('/api/v1/performances', payload)),
  getPerformances: () => unwrap<PerformanceSummary[]>(http.get('/api/v1/performances')),
  getPerformance: (performanceId: number) =>
    unwrap<PerformanceDetail>(http.get(`/api/v1/performances/${performanceId}`)),
  createPerformanceMember: (performanceId: number, payload: CreatePerformanceMemberPayload) =>
    unwrap<PerformanceMember>(http.post(`/api/v1/performances/${performanceId}/members`, payload)),
  deletePerformanceMember: (performanceId: number, memberUserId: number) =>
    unwrap<void>(http.delete(`/api/v1/performances/${performanceId}/members/${memberUserId}`)),
  getPerformanceSessionColumns: (performanceId: number) =>
    unwrap<PerformanceSessionColumn[]>(http.get(`/api/v1/performances/${performanceId}/session-columns`)),
  createPerformanceSessionColumn: (performanceId: number, payload: UpsertPerformanceSessionColumnPayload) =>
    unwrap<PerformanceSessionColumn>(http.post(`/api/v1/performances/${performanceId}/session-columns`, payload)),
  updatePerformanceSessionColumn: (
    performanceId: number,
    performanceSessionColumnId: number,
    payload: UpsertPerformanceSessionColumnPayload,
  ) =>
    unwrap<PerformanceSessionColumn>(
      http.patch(`/api/v1/performances/${performanceId}/session-columns/${performanceSessionColumnId}`, payload),
    ),
  createSong: (performanceId: number, payload: CreatePerformanceSongPayload) =>
    unwrap<PerformanceSongDetail>(http.post(`/api/v1/performances/${performanceId}/songs`, payload)),
  getSong: (performanceId: number, performanceSongId: number) =>
    unwrap<PerformanceSongDetail>(http.get(`/api/v1/performances/${performanceId}/songs/${performanceSongId}`)),
  updateSong: (performanceId: number, performanceSongId: number, payload: UpdatePerformanceSongPayload) =>
    unwrap<PerformanceSongDetail>(http.patch(`/api/v1/performances/${performanceId}/songs/${performanceSongId}`, payload)),
  updateSongStatus: (performanceId: number, performanceSongId: number, payload: UpdatePerformanceSongStatusPayload) =>
    unwrap<PerformanceSongDetail>(
      http.patch(`/api/v1/performances/${performanceId}/songs/${performanceSongId}/status`, payload),
    ),
  updateSongOrder: (performanceId: number, performanceSongId: number, payload: UpdatePerformanceSongOrderPayload) =>
    unwrap<PerformanceSongDetail>(
      http.patch(`/api/v1/performances/${performanceId}/songs/${performanceSongId}/order`, payload),
    ),
  updateSongSessions: (
    performanceId: number,
    performanceSongId: number,
    payload: UpdatePerformanceSongSessionsPayload,
  ) =>
    unwrap<PerformanceSongDetail>(
      http.patch(`/api/v1/performances/${performanceId}/songs/${performanceSongId}/sessions`, payload),
    ),
  deleteSong: (performanceId: number, performanceSongId: number) =>
    unwrap<void>(http.delete(`/api/v1/performances/${performanceId}/songs/${performanceSongId}`)),
  getChatRooms: (performanceId: number) =>
    unwrap<ChatRoomSummary[]>(http.get(`/api/v1/performances/${performanceId}/chat-rooms`)),
  createChatRooms: (performanceId: number, payload: CreateChatRoomsPayload) =>
    unwrap<ChatRoomSummary[]>(http.post(`/api/v1/performances/${performanceId}/chat-rooms`, payload)),
  getChatRoom: (performanceId: number, chatRoomId: number) =>
    unwrap<ChatRoomDetail>(http.get(`/api/v1/performances/${performanceId}/chat-rooms/${chatRoomId}`)),
  startChatRound: (performanceId: number, chatRoomId: number) =>
    unwrap<ChatRoundSummary>(http.post(`/api/v1/performances/${performanceId}/chat-rooms/${chatRoomId}/rounds`)),
  createAiFeedback: (performanceId: number, chatRoomId: number, chatRoundId: number) =>
    unwrap<FeedbackSummary[]>(
      http.post(`/api/v1/performances/${performanceId}/chat-rooms/${chatRoomId}/rounds/${chatRoundId}/ai-feedback`),
    ),
};
