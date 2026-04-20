import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toApiMessage } from '@features/auth/api/auth-api';
import { performanceApi, type PerformanceSessionColumn, type PerformanceSongDetail, type SelectionStatus } from '@features/performance/api/performance-api';
import { userApi } from '@features/user/api/user-api';
import { Card } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { FormField } from '@shared/components/ui/form-field';
import { Input } from '@shared/components/ui/input';

type SongForm = { songTitle: string; singer: string; isSheet: boolean; orderNo: string; selectionStatus: SelectionStatus };
type ColumnDraft = { performanceSessionColumnId: number; sessionName: string; displayOrder: string; isRequired: boolean; baseSessionTypeId: number | null; sessionSource: 'DEFAULT' | 'CUSTOM' };
type AssignmentDraft = { performanceSessionColumnId: number; sessionName: string; assignedUserId: string; isRequired: boolean; sessionSource: 'DEFAULT' | 'CUSTOM' };

const emptySongForm: SongForm = { songTitle: '', singer: '', isSheet: false, orderNo: '', selectionStatus: 'NOT_BAD' };
const emptyColumnForm = { sessionName: '', displayOrder: '', isRequired: true };
const selectClassName = 'h-12 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100';
const statusMeta: Record<SelectionStatus, { label: string; badge: string; tone: string }> = {
  CONFIRMED: { label: '확정', badge: 'bg-emerald-100 text-emerald-700 ring-emerald-200', tone: 'bg-emerald-50/70' },
  NOT_BAD: { label: '후보', badge: 'bg-amber-100 text-amber-700 ring-amber-200', tone: 'bg-amber-50/70' },
  OUT: { label: '제외', badge: 'bg-rose-100 text-rose-700 ring-rose-200', tone: 'bg-rose-50/70' },
};

const toSongForm = (song: PerformanceSongDetail | null): SongForm => song
  ? { songTitle: song.songTitle, singer: song.singer, isSheet: song.isSheet, orderNo: String(song.orderNo), selectionStatus: song.selectionStatus }
  : emptySongForm;

const toColumnDraft = (column: PerformanceSessionColumn): ColumnDraft => ({
  performanceSessionColumnId: column.performanceSessionColumnId,
  sessionName: column.sessionName,
  displayOrder: String(column.displayOrder),
  isRequired: column.isRequired,
  baseSessionTypeId: column.baseSessionTypeId,
  sessionSource: column.sessionSource,
});

function toAssignmentDrafts(columns: PerformanceSessionColumn[], song: PerformanceSongDetail | null): AssignmentDraft[] {
  const sessionByColumnId = new Map((song?.sessions ?? []).filter((session) => session.performanceSessionColumnId !== null).map((session) => [session.performanceSessionColumnId as number, session]));
  return columns.map((column) => ({
    performanceSessionColumnId: column.performanceSessionColumnId,
    sessionName: column.sessionName,
    assignedUserId: sessionByColumnId.get(column.performanceSessionColumnId)?.assignedUserId?.toString() ?? '',
    isRequired: column.isRequired,
    sessionSource: column.sessionSource,
  }));
}

export function PerformanceGridPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [selectedPerformanceId, setSelectedPerformanceId] = useState<number | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
  const [createPerformanceTitle, setCreatePerformanceTitle] = useState('');
  const [createSongForm, setCreateSongForm] = useState<SongForm>(emptySongForm);
  const [editSongForm, setEditSongForm] = useState<SongForm>(emptySongForm);
  const [createColumnForm, setCreateColumnForm] = useState(emptyColumnForm);
  const [columnDrafts, setColumnDrafts] = useState<ColumnDraft[]>([]);
  const [assignmentDrafts, setAssignmentDrafts] = useState<AssignmentDraft[]>([]);

  const performancesQuery = useQuery({ queryKey: ['performances'], queryFn: performanceApi.getPerformances });
  const performanceQuery = useQuery({ queryKey: ['performance', selectedPerformanceId], queryFn: () => performanceApi.getPerformance(selectedPerformanceId!), enabled: selectedPerformanceId !== null });
  const columnsQuery = useQuery({ queryKey: ['performance-session-columns', selectedPerformanceId], queryFn: () => performanceApi.getPerformanceSessionColumns(selectedPerformanceId!), enabled: selectedPerformanceId !== null });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: userApi.getAll });

  const performances = performancesQuery.data?.data ?? [];
  const performance = performanceQuery.data?.data ?? null;
  const columns = columnsQuery.data?.data ?? [];
  const users = usersQuery.data?.data ?? [];
  const songs = useMemo(() => [...(performance?.songs ?? [])].sort((a, b) => a.orderNo - b.orderNo), [performance]);

  useEffect(() => { if (performances[0] && selectedPerformanceId === null) setSelectedPerformanceId(performances[0].performanceId); }, [performances, selectedPerformanceId]);
  useEffect(() => {
    if (!songs.length) return void setSelectedSongId(null);
    setSelectedSongId((current) => (current && songs.some((song) => song.performanceSongId === current) ? current : songs[0].performanceSongId));
  }, [songs]);

  const songDetailQueries = useQueries({ queries: songs.map((song) => ({ queryKey: ['performance-song', selectedPerformanceId, song.performanceSongId], queryFn: () => performanceApi.getSong(selectedPerformanceId!, song.performanceSongId), enabled: selectedPerformanceId !== null, staleTime: 60000 })) });
  const songDetailById = useMemo(() => new Map(songDetailQueries.map((query) => query.data?.data ?? null).filter((song): song is PerformanceSongDetail => song !== null).map((song) => [song.performanceSongId, song])), [songDetailQueries]);
  const selectedSong = selectedSongId !== null ? songDetailById.get(selectedSongId) ?? null : null;

  useEffect(() => setEditSongForm(toSongForm(selectedSong)), [selectedSong]);
  useEffect(() => setColumnDrafts(columns.map(toColumnDraft)), [columns]);
  useEffect(() => setAssignmentDrafts(toAssignmentDrafts(columns, selectedSong)), [columns, selectedSong]);

  const userNameById = useMemo(() => new Map(users.map((user) => [user.userId, user.name])), [users]);
  const boardRows = useMemo(() => songs.map((song) => ({ song, sessionByColumnId: new Map((songDetailById.get(song.performanceSongId)?.sessions ?? []).filter((session) => session.performanceSessionColumnId !== null).map((session) => [session.performanceSessionColumnId as number, session])) })), [songDetailById, songs]);
  const invalidatePerformance = async (performanceId: number) => {
    await queryClient.invalidateQueries({ queryKey: ['performances'] });
    await queryClient.invalidateQueries({ queryKey: ['performance', performanceId] });
    await queryClient.invalidateQueries({ queryKey: ['performance-session-columns', performanceId] });
    await queryClient.invalidateQueries({ queryKey: ['performance-song', performanceId] });
  };

  const createPerformanceMutation = useMutation({ mutationFn: performanceApi.createPerformance, onSuccess: async (response) => { setMessage(response.message); setCreatePerformanceTitle(''); await queryClient.invalidateQueries({ queryKey: ['performances'] }); setSelectedPerformanceId(response.data.performanceId); }, onError: (error) => setMessage(toApiMessage(error)) });
  const createSongMutation = useMutation({ mutationFn: ({ performanceId, payload }: { performanceId: number; payload: Parameters<typeof performanceApi.createSong>[1] }) => performanceApi.createSong(performanceId, payload), onSuccess: async (response) => { setMessage(response.message); setCreateSongForm(emptySongForm); await invalidatePerformance(response.data.performanceId); setSelectedSongId(response.data.performanceSongId); }, onError: (error) => setMessage(toApiMessage(error)) });
  const updateSongMutation = useMutation({ mutationFn: ({ performanceId, songId, payload }: { performanceId: number; songId: number; payload: Parameters<typeof performanceApi.updateSong>[2] }) => performanceApi.updateSong(performanceId, songId, payload), onSuccess: async (response) => { setMessage(response.message); await invalidatePerformance(response.data.performanceId); }, onError: (error) => setMessage(toApiMessage(error)) });
  const updateSongStatusMutation = useMutation({ mutationFn: ({ performanceId, songId, selectionStatus }: { performanceId: number; songId: number; selectionStatus: SelectionStatus }) => performanceApi.updateSongStatus(performanceId, songId, { selectionStatus }), onSuccess: async (response) => { setMessage(response.message); await invalidatePerformance(response.data.performanceId); }, onError: (error) => setMessage(toApiMessage(error)) });  const deleteSongMutation = useMutation({ mutationFn: ({ performanceId, songId }: { performanceId: number; songId: number }) => performanceApi.deleteSong(performanceId, songId), onSuccess: async (_response, variables) => { setMessage('곡을 삭제했습니다.'); await invalidatePerformance(variables.performanceId); setSelectedSongId(null); }, onError: (error) => setMessage(toApiMessage(error)) });
  const createColumnMutation = useMutation({ mutationFn: ({ performanceId, payload }: { performanceId: number; payload: Parameters<typeof performanceApi.createPerformanceSessionColumn>[1] }) => performanceApi.createPerformanceSessionColumn(performanceId, payload), onSuccess: async (_response, variables) => { setMessage('세션 컬럼을 추가했습니다.'); setCreateColumnForm(emptyColumnForm); await invalidatePerformance(variables.performanceId); }, onError: (error) => setMessage(toApiMessage(error)) });
  const updateColumnMutation = useMutation({ mutationFn: ({ performanceId, columnId, payload }: { performanceId: number; columnId: number; payload: Parameters<typeof performanceApi.updatePerformanceSessionColumn>[2] }) => performanceApi.updatePerformanceSessionColumn(performanceId, columnId, payload), onSuccess: async (_response, variables) => { setMessage('세션 컬럼을 저장했습니다.'); await invalidatePerformance(variables.performanceId); }, onError: (error) => setMessage(toApiMessage(error)) });
  const updateAssignmentsMutation = useMutation({ mutationFn: ({ performanceId, songId, sessions }: { performanceId: number; songId: number; sessions: AssignmentDraft[] }) => performanceApi.updateSongSessions(performanceId, songId, { sessions: sessions.map((session) => ({ performanceSessionColumnId: session.performanceSessionColumnId, assignedUserId: session.assignedUserId ? Number(session.assignedUserId) : null })) }), onSuccess: async (response) => { setMessage(response.message); await invalidatePerformance(response.data.performanceId); }, onError: (error) => setMessage(toApiMessage(error)) });
  const isBoardLoading = performanceQuery.isLoading || columnsQuery.isLoading || songDetailQueries.some((query) => query.isLoading || query.isPending);

  return (
    <section className="space-y-6">
      <Card className="overflow-hidden bg-[linear-gradient(135deg,#fffef9_0%,#f5fbff_52%,#eef6ff_100%)]">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <span className="sticker text-[#4567b5]">Performance Grid</span>
            <div>
              <h1 className="section-title text-[#233257]">공연을 표처럼 관리하는 워크스페이스</h1>
              <p className="section-copy mt-4 max-w-3xl text-slate-600">세션은 공연 전체의 공통 컬럼이고, 곡은 행입니다. 컬럼을 추가하면 전체 곡에 함께 반영되고 각 곡에서는 담당자만 배정합니다.</p>
            </div>
            {message ? <div className="rounded-[24px] bg-[#223257] px-4 py-3 text-sm font-medium text-white">{message}</div> : null}
          </div>
          <div className="soft-panel p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Snapshot</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-700">
              <div className="rounded-[22px] bg-white px-4 py-3 ring-1 ring-slate-200">현재 공연: <span className="font-semibold">{performance?.title ?? '선택 안 됨'}</span></div>
              <div className="rounded-[22px] bg-white px-4 py-3 ring-1 ring-slate-200">곡 수: <span className="font-semibold">{performance?.songCount ?? 0}</span></div>
              <div className="rounded-[22px] bg-white px-4 py-3 ring-1 ring-slate-200">세션 컬럼 수: <span className="font-semibold">{columns.length}</span></div>
              <div className="rounded-[22px] bg-white px-4 py-3 ring-1 ring-slate-200">선택한 곡: <span className="font-semibold">{selectedSong?.songTitle ?? '없음'}</span></div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <Card className="space-y-4 bg-[#213256] text-white">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">Performances</p><h2 className="mt-2 text-2xl font-semibold">공연 선택</h2></div><span className="rounded-full bg-white/10 px-3 py-2 text-xs ring-1 ring-white/20">{performances.length} items</span></div>
            <div className="space-y-3">{performances.map((item) => <button key={item.performanceId} type="button" onClick={() => { setSelectedPerformanceId(item.performanceId); setSelectedSongId(null); }} className={['w-full rounded-[24px] border px-4 py-4 text-left transition', selectedPerformanceId === item.performanceId ? 'border-white/80 bg-white text-[#213256]' : 'border-white/15 bg-white/8 text-white hover:bg-white/12'].join(' ')}><p className="text-lg font-semibold">{item.title}</p><p className="mt-2 text-xs uppercase tracking-[0.18em] opacity-70">Songs {item.songCount}</p></button>)}</div>
            <div className="rounded-[24px] bg-white/8 p-4 ring-1 ring-white/15">
              <FormField label="새 공연"><Input value={createPerformanceTitle} onChange={(event) => setCreatePerformanceTitle(event.target.value)} placeholder="예: 2026 봄 공연" /></FormField>
              <Button className="mt-4 w-full" disabled={!createPerformanceTitle.trim() || createPerformanceMutation.isPending} onClick={() => createPerformanceMutation.mutate({ title: createPerformanceTitle.trim() })}>{createPerformanceMutation.isPending ? '생성 중...' : '공연 생성'}</Button>
            </div>
          </Card>

          <Card className="space-y-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#4567b5]">New Song</p><h2 className="mt-2 text-xl font-semibold text-slate-900">곡 추가</h2></div>
            <div className="grid gap-4">
              <FormField label="곡 제목"><Input value={createSongForm.songTitle} onChange={(event) => setCreateSongForm((current) => ({ ...current, songTitle: event.target.value }))} /></FormField>
              <FormField label="가수명"><Input value={createSongForm.singer} onChange={(event) => setCreateSongForm((current) => ({ ...current, singer: event.target.value }))} /></FormField>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="순서"><Input type="number" value={createSongForm.orderNo} onChange={(event) => setCreateSongForm((current) => ({ ...current, orderNo: event.target.value }))} /></FormField>
                <FormField label="상태"><select className={selectClassName} value={createSongForm.selectionStatus} onChange={(event) => setCreateSongForm((current) => ({ ...current, selectionStatus: event.target.value as SelectionStatus }))}><option value="NOT_BAD">후보</option><option value="CONFIRMED">확정</option><option value="OUT">제외</option></select></FormField>
              </div>
              <label className="flex items-center gap-3 rounded-[22px] bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200"><input type="checkbox" className="h-4 w-4" checked={createSongForm.isSheet} onChange={(event) => setCreateSongForm((current) => ({ ...current, isSheet: event.target.checked }))} />악보 있음</label>
              <Button disabled={selectedPerformanceId === null || !createSongForm.songTitle.trim() || !createSongForm.singer.trim() || createSongMutation.isPending} onClick={() => { if (selectedPerformanceId === null) return; createSongMutation.mutate({ performanceId: selectedPerformanceId, payload: { songTitle: createSongForm.songTitle.trim(), singer: createSongForm.singer.trim(), isSheet: createSongForm.isSheet, orderNo: createSongForm.orderNo ? Number(createSongForm.orderNo) : undefined, selectionStatus: createSongForm.selectionStatus } }); }}>{createSongMutation.isPending ? '추가 중...' : '곡 추가'}</Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-5">
            <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#4567b5]">Session Columns</p><h2 className="mt-2 text-2xl font-semibold text-slate-900">공연 공통 컬럼</h2></div>
            <div className="grid gap-4 rounded-[26px] bg-slate-50/80 p-4 md:grid-cols-[minmax(0,1fr)_120px_120px_auto]">
              <FormField label="세션명"><Input value={createColumnForm.sessionName} onChange={(event) => setCreateColumnForm((current) => ({ ...current, sessionName: event.target.value }))} placeholder="예: 코러스" /></FormField>
              <FormField label="순서"><Input type="number" value={createColumnForm.displayOrder} onChange={(event) => setCreateColumnForm((current) => ({ ...current, displayOrder: event.target.value }))} placeholder={String(columns.length + 1)} /></FormField>
              <div className="flex items-end"><label className="flex w-full items-center gap-3 rounded-[20px] bg-white px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200"><input type="checkbox" className="h-4 w-4" checked={createColumnForm.isRequired} onChange={(event) => setCreateColumnForm((current) => ({ ...current, isRequired: event.target.checked }))} />필수</label></div>
              <div className="flex items-end"><Button className="w-full" disabled={!selectedPerformanceId || !createColumnForm.sessionName.trim() || createColumnMutation.isPending} onClick={() => { if (!selectedPerformanceId) return; createColumnMutation.mutate({ performanceId: selectedPerformanceId, payload: { sessionName: createColumnForm.sessionName.trim(), displayOrder: createColumnForm.displayOrder ? Number(createColumnForm.displayOrder) : undefined, isRequired: createColumnForm.isRequired, baseSessionTypeId: null } }); }}>{createColumnMutation.isPending ? '추가 중...' : '컬럼 추가'}</Button></div>
            </div>
            <div className="space-y-3">{columnDrafts.map((column, index) => <div key={column.performanceSessionColumnId} className="grid gap-3 rounded-[24px] border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_96px_92px_120px]"><FormField label="세션명"><Input value={column.sessionName} onChange={(event) => setColumnDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, sessionName: event.target.value } : item))} /></FormField><FormField label="순서"><Input type="number" value={column.displayOrder} onChange={(event) => setColumnDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, displayOrder: event.target.value } : item))} /></FormField><div className="flex items-end"><label className="flex w-full items-center gap-3 rounded-[20px] bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200"><input type="checkbox" className="h-4 w-4" checked={column.isRequired} onChange={(event) => setColumnDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, isRequired: event.target.checked } : item))} />필수</label></div><div className="flex items-end"><Button className="w-full" disabled={!selectedPerformanceId || updateColumnMutation.isPending || !column.sessionName.trim()} onClick={() => { if (!selectedPerformanceId) return; updateColumnMutation.mutate({ performanceId: selectedPerformanceId, columnId: column.performanceSessionColumnId, payload: { sessionName: column.sessionName.trim(), displayOrder: Number(column.displayOrder || 0), isRequired: column.isRequired, baseSessionTypeId: column.baseSessionTypeId } }); }}>저장</Button></div><div className="md:col-span-4 flex items-center justify-between text-xs text-slate-500"><span>Column #{column.performanceSessionColumnId}</span><span>{column.sessionSource === 'DEFAULT' ? '기본 컬럼' : '사용자 컬럼'}</span></div></div>)}</div>
          </Card>          <Card className="space-y-5">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#4567b5]">Session Board</p><h2 className="mt-2 text-2xl font-semibold text-slate-900">{performance ? `${performance.title} 세션 표` : '공연을 선택하세요'}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{columns.length} columns</span></div>
            {!performance ? <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">왼쪽에서 공연을 선택하면 표가 열립니다.</div> : isBoardLoading ? <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">세션 표를 불러오는 중입니다.</div> : <div className="overflow-x-auto"><table className="min-w-full border-separate border-spacing-0 text-sm"><thead><tr className="bg-[#edf4ff] text-slate-600"><th className="sticky left-0 z-20 border-b border-r border-slate-200 bg-[#edf4ff] px-4 py-3 text-left">곡</th><th className="border-b border-r border-slate-200 px-4 py-3 text-left">가수</th><th className="border-b border-r border-slate-200 px-4 py-3 text-left">상태</th>{columns.map((column) => <th key={column.performanceSessionColumnId} className="min-w-[120px] border-b border-r border-slate-200 px-4 py-3 text-center">{column.sessionName}</th>)}</tr></thead><tbody>{boardRows.map(({ song, sessionByColumnId }) => <tr key={song.performanceSongId} onClick={() => setSelectedSongId(song.performanceSongId)} className={['cursor-pointer transition hover:bg-white', statusMeta[song.selectionStatus].tone, selectedSongId === song.performanceSongId ? 'shadow-[inset_0_0_0_2px_rgba(69,103,181,0.18)]' : ''].join(' ')}><td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-inherit px-4 py-3"><p className="font-semibold text-slate-900">{song.songTitle}</p><p className="mt-1 text-xs text-slate-500">#{song.orderNo}</p></td><td className="border-b border-r border-slate-200 px-4 py-3 text-slate-600">{song.singer}</td><td className="border-b border-r border-slate-200 px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusMeta[song.selectionStatus].badge}`}>{statusMeta[song.selectionStatus].label}</span></td>{columns.map((column) => { const session = sessionByColumnId.get(column.performanceSessionColumnId); const assignedName = session?.assignedUserId ? userNameById.get(session.assignedUserId) ?? `User #${session.assignedUserId}` : null; return <td key={`${song.performanceSongId}-${column.performanceSessionColumnId}`} className="border-b border-r border-slate-200 px-3 py-3 text-center">{assignedName ? <span className="inline-flex min-w-[84px] items-center justify-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">{assignedName}</span> : <span className={['inline-flex min-w-12 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ring-1', session ? 'bg-amber-100 text-amber-700 ring-amber-200' : 'bg-slate-100 text-slate-400 ring-slate-200'].join(' ')}>{session ? 'O' : 'X'}</span>}</td>; })}</tr>)}</tbody></table></div>}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-5">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#4567b5]">Song Editor</p><h2 className="mt-2 text-2xl font-semibold text-slate-900">{selectedSong ? selectedSong.songTitle : '곡을 선택하세요'}</h2></div>{selectedSong ? <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusMeta[selectedSong.selectionStatus].badge}`}>{statusMeta[selectedSong.selectionStatus].label}</span> : null}</div>
            {!selectedSong ? <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">가운데 표에서 곡을 선택하면 곡 정보와 담당자 배정을 수정할 수 있습니다.</div> : <div className="space-y-6"><div className="grid gap-4 md:grid-cols-2"><FormField label="곡 제목"><Input value={editSongForm.songTitle} onChange={(event) => setEditSongForm((current) => ({ ...current, songTitle: event.target.value }))} /></FormField><FormField label="가수명"><Input value={editSongForm.singer} onChange={(event) => setEditSongForm((current) => ({ ...current, singer: event.target.value }))} /></FormField><FormField label="순서"><Input type="number" value={editSongForm.orderNo} onChange={(event) => setEditSongForm((current) => ({ ...current, orderNo: event.target.value }))} /></FormField><FormField label="채팅방"><div className="flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700">{selectedSong.chatRoomCreated ? '생성됨' : '미생성'}</div></FormField></div><label className="flex items-center gap-3 rounded-[22px] bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200"><input type="checkbox" className="h-4 w-4" checked={editSongForm.isSheet} onChange={(event) => setEditSongForm((current) => ({ ...current, isSheet: event.target.checked }))} />악보 있음</label><div className="space-y-3"><p className="text-sm font-semibold text-slate-700">선곡 상태</p><div className="grid gap-2 md:grid-cols-3">{(['NOT_BAD', 'CONFIRMED', 'OUT'] as SelectionStatus[]).map((status) => <Button key={status} variant={selectedSong.selectionStatus === status ? 'secondary' : 'ghost'} disabled={updateSongStatusMutation.isPending || !selectedPerformanceId || !selectedSongId} onClick={() => { if (!selectedPerformanceId || !selectedSongId) return; updateSongStatusMutation.mutate({ performanceId: selectedPerformanceId, songId: selectedSongId, selectionStatus: status }); }}>{statusMeta[status].label}</Button>)}</div></div><div className="flex flex-wrap gap-3"><Button disabled={updateSongMutation.isPending || !selectedPerformanceId || !selectedSongId} onClick={() => { if (!selectedPerformanceId || !selectedSongId) return; updateSongMutation.mutate({ performanceId: selectedPerformanceId, songId: selectedSongId, payload: { songTitle: editSongForm.songTitle.trim(), singer: editSongForm.singer.trim(), isSheet: editSongForm.isSheet, orderNo: Number(editSongForm.orderNo || 0) } }); }}>{updateSongMutation.isPending ? '저장 중...' : '곡 정보 저장'}</Button><Button variant="ghost" className="text-rose-700 ring-rose-200 hover:bg-rose-50" disabled={deleteSongMutation.isPending || !selectedPerformanceId || !selectedSongId} onClick={() => { if (!selectedPerformanceId || !selectedSongId) return; deleteSongMutation.mutate({ performanceId: selectedPerformanceId, songId: selectedSongId }); }}>{deleteSongMutation.isPending ? '삭제 중...' : '곡 삭제'}</Button></div><div className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900">세션 담당자 배정</h3><p className="mt-1 text-sm text-slate-500">컬럼 구조는 공연 전체에서 공유되고, 여기서는 각 컬럼의 담당자만 바꿉니다.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{assignmentDrafts.length} cells</span></div><div className="mt-4 space-y-3">{assignmentDrafts.map((assignment, index) => <div key={assignment.performanceSessionColumnId} className="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div><p className="text-sm font-semibold text-slate-900">{assignment.sessionName}</p><p className="mt-1 text-xs text-slate-500">{assignment.sessionSource === 'DEFAULT' ? '기본 컬럼' : '사용자 컬럼'}{assignment.isRequired ? ' · 필수' : ' · 선택'}</p></div><select className={selectClassName} value={assignment.assignedUserId} onChange={(event) => setAssignmentDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, assignedUserId: event.target.value } : item))}><option value="">미배정</option>{users.map((user) => <option key={user.userId} value={user.userId}>{user.name} #{user.userId}</option>)}</select></div>)}</div><div className="mt-4"><Button disabled={updateAssignmentsMutation.isPending || !selectedPerformanceId || !selectedSongId} onClick={() => { if (!selectedPerformanceId || !selectedSongId) return; updateAssignmentsMutation.mutate({ performanceId: selectedPerformanceId, songId: selectedSongId, sessions: assignmentDrafts }); }}>{updateAssignmentsMutation.isPending ? '저장 중...' : '담당자 저장'}</Button></div></div></div>}
          </Card>
        </div>
      </div>
    </section>
  );
}