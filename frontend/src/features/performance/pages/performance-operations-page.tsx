import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toApiMessage } from '@features/auth/api/auth-api';
import { performanceApi, type SelectionStatus } from '@features/performance/api/performance-api';
import { userApi } from '@features/user/api/user-api';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';
import { FormField } from '@shared/components/ui/form-field';
import { Input } from '@shared/components/ui/input';

const emptySongForm = { songTitle: '', singer: '', isSheet: false, orderNo: '', selectionStatus: 'NOT_BAD' as SelectionStatus };
const statusMeta: Record<SelectionStatus, string> = {
  CONFIRMED: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  NOT_BAD: 'bg-amber-100 text-amber-700 ring-amber-200',
  OUT: 'bg-rose-100 text-rose-700 ring-rose-200',
};

export function PerformanceOperationsPage() {
  const queryClient = useQueryClient();
  const [selectedPerformanceId, setSelectedPerformanceId] = useState<number | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [performanceTitle, setPerformanceTitle] = useState('');
  const [createSongForm, setCreateSongForm] = useState(emptySongForm);
  const [editSongForm, setEditSongForm] = useState(emptySongForm);

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
  const songDetailQuery = useQuery({
    queryKey: ['performance-song', selectedPerformanceId, selectedSongId],
    queryFn: () => performanceApi.getSong(selectedPerformanceId!, selectedSongId!),
    enabled: selectedPerformanceId !== null && selectedSongId !== null,
  });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: userApi.getAll });

  const performances = performancesQuery.data?.data ?? [];
  const performance = performanceQuery.data?.data ?? null;
  const columns = columnsQuery.data?.data ?? [];
  const songDetail = songDetailQuery.data?.data ?? null;
  const users = usersQuery.data?.data ?? [];
  const songs = useMemo(() => [...(performance?.songs ?? [])].sort((a, b) => a.orderNo - b.orderNo), [performance]);

  useEffect(() => {
    if (performances[0] && selectedPerformanceId === null) {
      setSelectedPerformanceId(performances[0].performanceId);
    }
  }, [performances, selectedPerformanceId]);

  useEffect(() => {
    if (songs[0] && (selectedSongId === null || !songs.some((song) => song.performanceSongId === selectedSongId))) {
      setSelectedSongId(songs[0].performanceSongId);
    }
    if (!songs.length) {
      setSelectedSongId(null);
    }
  }, [songs, selectedSongId]);

  useEffect(() => {
    if (songDetail) {
      setEditSongForm({
        songTitle: songDetail.songTitle,
        singer: songDetail.singer,
        isSheet: songDetail.isSheet,
        orderNo: String(songDetail.orderNo),
        selectionStatus: songDetail.selectionStatus,
      });
    }
  }, [songDetail]);

  const refreshPerformance = async (performanceId: number) => {
    await queryClient.invalidateQueries({ queryKey: ['performances'] });
    await queryClient.invalidateQueries({ queryKey: ['performance', performanceId] });
    await queryClient.invalidateQueries({ queryKey: ['performance-columns', performanceId] });
    await queryClient.invalidateQueries({ queryKey: ['performance-song', performanceId] });
  };

  const createPerformanceMutation = useMutation({
    mutationFn: performanceApi.createPerformance,
    onSuccess: async (response) => {
      setMessage(response.message);
      setPerformanceTitle('');
      await queryClient.invalidateQueries({ queryKey: ['performances'] });
      setSelectedPerformanceId(response.data.performanceId);
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  const createSongMutation = useMutation({
    mutationFn: ({ performanceId, payload }: { performanceId: number; payload: Parameters<typeof performanceApi.createSong>[1] }) =>
      performanceApi.createSong(performanceId, payload),
    onSuccess: async (response) => {
      setMessage(response.message);
      setCreateSongForm(emptySongForm);
      await refreshPerformance(response.data.performanceId);
      setSelectedSongId(response.data.performanceSongId);
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  const updateSongMutation = useMutation({
    mutationFn: ({ performanceId, songId, payload }: { performanceId: number; songId: number; payload: Parameters<typeof performanceApi.updateSong>[2] }) =>
      performanceApi.updateSong(performanceId, songId, payload),
    onSuccess: async (response) => {
      setMessage(response.message);
      await refreshPerformance(response.data.performanceId);
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  const updateSongStatusMutation = useMutation({
    mutationFn: ({ performanceId, songId, selectionStatus }: { performanceId: number; songId: number; selectionStatus: SelectionStatus }) =>
      performanceApi.updateSongStatus(performanceId, songId, { selectionStatus }),
    onSuccess: async (response) => {
      setMessage(response.message);
      await refreshPerformance(response.data.performanceId);
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  const updateAssignmentsMutation = useMutation({
    mutationFn: ({ performanceId, songId, sessions }: { performanceId: number; songId: number; sessions: Array<{ performanceSessionColumnId: number; assignedUserId: number | null }> }) =>
      performanceApi.updateSongSessions(performanceId, songId, { sessions }),
    onSuccess: async (response) => {
      setMessage(response.message);
      await refreshPerformance(response.data.performanceId);
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  return (
    <section className="space-y-6">
      <Card className="bg-[linear-gradient(135deg,rgba(20,50,63,0.98)_0%,rgba(31,95,107,0.95)_58%,rgba(217,159,82,0.86)_100%)] text-white">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4dfba]">Performance Desk</p>
            <h1 className="section-title mt-3 text-white">공연 운영 워크스페이스</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">공연 목록, 세트리스트, 세션 배정까지 이어서 작업할 수 있는 운영 화면입니다.</p>
            {message ? <div className="mt-4 rounded-[22px] bg-white/12 px-4 py-3 text-sm ring-1 ring-white/10">{message}</div> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] bg-white/10 p-4 ring-1 ring-white/12"><p className="text-xs uppercase tracking-[0.2em] text-[#f4dfba]">현재 공연</p><p className="mt-2 text-lg font-semibold">{performance?.title ?? '선택 전'}</p></div>
            <div className="rounded-[22px] bg-white/10 p-4 ring-1 ring-white/12"><p className="text-xs uppercase tracking-[0.2em] text-[#f4dfba]">곡 수</p><p className="mt-2 text-3xl font-semibold">{performance?.songCount ?? 0}</p></div>
            <div className="rounded-[22px] bg-white/10 p-4 ring-1 ring-white/12"><p className="text-xs uppercase tracking-[0.2em] text-[#f4dfba]">세션 컬럼</p><p className="mt-2 text-3xl font-semibold">{columns.length}</p></div>
            <div className="rounded-[22px] bg-white/10 p-4 ring-1 ring-white/12"><p className="text-xs uppercase tracking-[0.2em] text-[#f4dfba]">선택한 곡</p><p className="mt-2 text-lg font-semibold">{songDetail?.songTitle ?? '없음'}</p></div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <Card className="bg-[#14323f] text-white">
            <div className="flex items-center justify-between">
              <div><p className="text-xs uppercase tracking-[0.22em] text-[#f4dfba]">Performances</p><h2 className="mt-2 text-2xl font-semibold">공연 목록</h2></div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15">{performances.length}</span>
            </div>
            <div className="mt-4 space-y-3">
              {performances.map((item) => (
                <button key={item.performanceId} type="button" onClick={() => setSelectedPerformanceId(item.performanceId)} className={['w-full rounded-[22px] border px-4 py-4 text-left transition', selectedPerformanceId === item.performanceId ? 'border-white/70 bg-white text-[#14323f]' : 'border-white/15 bg-white/8 hover:bg-white/12'].join(' ')}>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] opacity-75">songs {item.songCount}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <FormField label="새 공연">
              <Input value={performanceTitle} onChange={(event) => setPerformanceTitle(event.target.value)} placeholder="예: 2026 여름 공연" />
            </FormField>
            <Button className="mt-4 w-full bg-[linear-gradient(135deg,#14323f_0%,#1d5b67_52%,#d79f52_100%)]" disabled={!performanceTitle.trim() || createPerformanceMutation.isPending} onClick={() => createPerformanceMutation.mutate({ title: performanceTitle.trim() })}>
              {createPerformanceMutation.isPending ? '생성 중...' : '공연 생성'}
            </Button>
          </Card>

          <Card>
            <div><p className="text-xs uppercase tracking-[0.22em] text-[#9a6b2f]">Quick Add</p><h2 className="mt-2 text-xl font-semibold">곡 추가</h2></div>
            <div className="mt-4 grid gap-4">
              <FormField label="곡 제목"><Input value={createSongForm.songTitle} onChange={(event) => setCreateSongForm((current) => ({ ...current, songTitle: event.target.value }))} /></FormField>
              <FormField label="가수명"><Input value={createSongForm.singer} onChange={(event) => setCreateSongForm((current) => ({ ...current, singer: event.target.value }))} /></FormField>
              <FormField label="순서"><Input type="number" value={createSongForm.orderNo} onChange={(event) => setCreateSongForm((current) => ({ ...current, orderNo: event.target.value }))} /></FormField>
              <Button className="bg-[linear-gradient(135deg,#14323f_0%,#1d5b67_52%,#d79f52_100%)]" disabled={!selectedPerformanceId || !createSongForm.songTitle.trim() || !createSongForm.singer.trim() || createSongMutation.isPending} onClick={() => selectedPerformanceId && createSongMutation.mutate({ performanceId: selectedPerformanceId, payload: { songTitle: createSongForm.songTitle.trim(), singer: createSongForm.singer.trim(), isSheet: createSongForm.isSheet, orderNo: createSongForm.orderNo ? Number(createSongForm.orderNo) : undefined, selectionStatus: createSongForm.selectionStatus } })}>
                {createSongMutation.isPending ? '등록 중...' : '곡 등록'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.22em] text-[#9a6b2f]">Setlist</p><h2 className="mt-2 text-2xl font-semibold">{performance?.title ?? '공연을 선택하세요'}</h2></div><span className="rounded-full bg-[#f3ecdf] px-3 py-1 text-xs font-semibold text-[#7f5723] ring-1 ring-[#e1d2bb]">{songs.length}곡</span></div>
            <div className="mt-4 space-y-3">
              {songs.length ? songs.map((song) => (
                <button key={song.performanceSongId} type="button" onClick={() => setSelectedSongId(song.performanceSongId)} className={['grid w-full items-center gap-3 rounded-[22px] border px-4 py-4 text-left transition md:grid-cols-[minmax(0,1fr)_120px_88px]', selectedSongId === song.performanceSongId ? 'border-[#14323f] bg-[#f8f4ec]' : 'border-[#e8dfcf] bg-white hover:border-[#d6c5a6]'].join(' ')}>
                  <div><p className="font-semibold text-slate-900">{song.songTitle}</p><p className="mt-1 text-sm text-slate-500">{song.singer}</p></div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusMeta[song.selectionStatus]}`}>{song.selectionStatus}</span>
                  <span className="text-sm text-slate-500">#{song.orderNo}</span>
                </button>
              )) : <div className="rounded-[22px] border border-dashed border-[#d7cfbf] bg-[#faf7f1] px-4 py-8 text-sm text-slate-500">등록된 곡이 없습니다.</div>}
            </div>
          </Card>

          <Card>
            <div><p className="text-xs uppercase tracking-[0.22em] text-[#9a6b2f]">Session Columns</p><h2 className="mt-2 text-2xl font-semibold">공연 공통 세션</h2></div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {columns.map((column) => (
                <div key={column.performanceSessionColumnId} className="rounded-[22px] border border-[#e8dfcf] bg-[#fcfaf4] px-4 py-4">
                  <p className="font-semibold text-slate-900">{column.sessionName}</p>
                  <p className="mt-1 text-xs text-slate-500">{column.sessionSource === 'DEFAULT' ? '기본 컬럼' : '사용자 컬럼'}{column.isRequired ? ' · 필수' : ' · 선택'}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.22em] text-[#9a6b2f]">Song Detail</p><h2 className="mt-2 text-2xl font-semibold">{songDetail?.songTitle ?? '곡을 선택하세요'}</h2></div>{songDetail ? <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusMeta[songDetail.selectionStatus]}`}>{songDetail.selectionStatus}</span> : null}</div>
            {!songDetail ? <div className="mt-4 rounded-[22px] border border-dashed border-[#d7cfbf] bg-[#faf7f1] px-4 py-8 text-sm text-slate-500">가운데 세트리스트에서 곡을 선택하세요.</div> : (
              <div className="mt-4 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="곡 제목"><Input value={editSongForm.songTitle} onChange={(event) => setEditSongForm((current) => ({ ...current, songTitle: event.target.value }))} /></FormField>
                  <FormField label="가수명"><Input value={editSongForm.singer} onChange={(event) => setEditSongForm((current) => ({ ...current, singer: event.target.value }))} /></FormField>
                  <FormField label="순서"><Input type="number" value={editSongForm.orderNo} onChange={(event) => setEditSongForm((current) => ({ ...current, orderNo: event.target.value }))} /></FormField>
                  <FormField label="채팅방"><div className="flex h-12 items-center rounded-2xl border border-[#e8dfcf] bg-[#faf7f1] px-4 text-sm text-slate-700">{songDetail.chatRoomCreated ? '생성됨' : '미생성'}</div></FormField>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  {(['NOT_BAD', 'CONFIRMED', 'OUT'] as SelectionStatus[]).map((status) => (
                    <Button key={status} variant={songDetail.selectionStatus === status ? 'secondary' : 'ghost'} disabled={updateSongStatusMutation.isPending || !selectedPerformanceId || !selectedSongId} onClick={() => selectedPerformanceId && selectedSongId && updateSongStatusMutation.mutate({ performanceId: selectedPerformanceId, songId: selectedSongId, selectionStatus: status })}>
                      {status}
                    </Button>
                  ))}
                </div>
                <Button className="w-full bg-[linear-gradient(135deg,#14323f_0%,#1d5b67_52%,#d79f52_100%)]" disabled={updateSongMutation.isPending || !selectedPerformanceId || !selectedSongId} onClick={() => selectedPerformanceId && selectedSongId && updateSongMutation.mutate({ performanceId: selectedPerformanceId, songId: selectedSongId, payload: { songTitle: editSongForm.songTitle.trim(), singer: editSongForm.singer.trim(), isSheet: editSongForm.isSheet, orderNo: Number(editSongForm.orderNo || 0) } })}>
                  {updateSongMutation.isPending ? '저장 중...' : '곡 정보 저장'}
                </Button>
              </div>
            )}
          </Card>

          {songDetail ? (
            <Card>
              <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.22em] text-[#9a6b2f]">Assignments</p><h2 className="mt-2 text-2xl font-semibold">세션 담당자</h2></div><span className="rounded-full bg-[#f3ecdf] px-3 py-1 text-xs font-semibold text-[#7f5723] ring-1 ring-[#e1d2bb]">{songDetail.sessions.length} cells</span></div>
              <div className="mt-4 space-y-3">
                {songDetail.sessions.map((session) => (
                  <div key={`${session.performanceSessionColumnId}-${session.sessionName}`} className="grid gap-3 rounded-[22px] border border-[#e8dfcf] bg-[#fcfaf4] p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div><p className="font-semibold text-slate-900">{session.sessionName}</p><p className="mt-1 text-xs text-slate-500">{session.isRequired ? '필수 세션' : '선택 세션'}</p></div>
                    <select className="h-12 rounded-2xl border border-[#d8d0c1] bg-white px-4 text-sm" defaultValue={session.assignedUserId ?? ''} onChange={(event) => selectedPerformanceId && selectedSongId && updateAssignmentsMutation.mutate({ performanceId: selectedPerformanceId, songId: selectedSongId, sessions: songDetail.sessions.filter((item) => item.performanceSessionColumnId !== null).map((item) => ({ performanceSessionColumnId: item.performanceSessionColumnId as number, assignedUserId: item.performanceSessionColumnId === session.performanceSessionColumnId ? (event.target.value ? Number(event.target.value) : null) : item.assignedUserId })) })}>
                      <option value="">미배정</option>
                      {users.map((user) => <option key={user.userId} value={user.userId}>{user.name} #{user.userId}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </section>
  );
}
