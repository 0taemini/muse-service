import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminSmsApi } from '@features/admin/api/admin-sms-api';
import { adminUserApi, type AllUser } from '@features/admin/api/admin-user-api';
import { toApiMessage } from '@features/auth/api/auth-api';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';
import { StatePanel } from '@shared/components/ui/state-panel';

export function AdminSmsPage() {
  const [selectedCohorts, setSelectedCohorts] = useState<number[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const usersQuery = useQuery({ queryKey: ['admin', 'all-users'], queryFn: adminUserApi.getAllUsers });
  const sendMutation = useMutation({ mutationFn: adminSmsApi.send });
  const activeUsers = (usersQuery.data?.data ?? []).filter(
    (user) => user.status === 'ACTIVE' && Boolean(user.phone),
  );
  const cohorts = useMemo(
    () => [...new Set(activeUsers.map((user) => user.cohort))].sort((left, right) => right - left),
    [activeUsers],
  );
  const selectedUsers = useMemo(() => {
    const ids = new Set(selectedIds);
    activeUsers.forEach((user) => {
      if (selectedCohorts.includes(user.cohort)) ids.add(user.allUserId);
    });
    return activeUsers.filter((user) => ids.has(user.allUserId));
  }, [activeUsers, selectedCohorts, selectedIds]);
  const preview = selectedUsers[0] ? message.replaceAll('[이름]', selectedUsers[0].name) : message;

  const toggleCohort = (cohort: number) => {
    setSelectedCohorts((current) => current.includes(cohort) ? current.filter((value) => value !== cohort) : [...current, cohort]);
  };

  const toggleUser = (allUserId: number) => {
    setSelectedIds((current) => current.includes(allUserId) ? current.filter((id) => id !== allUserId) : [...current, allUserId]);
  };

  const submit = () => {
    if (!selectedUsers.length || !message.trim() || sendMutation.isPending) return;
    sendMutation.mutate({
      cohorts: selectedCohorts,
      allUserIds: selectedIds,
      message: message.trim(),
    });
  };

  return (
    <section className="mx-auto flex w-full max-w-[1120px] flex-col gap-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">단체 문자</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">전체 명부의 활성 회원을 기수 또는 개별로 선택해 문자를 보냅니다.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/admin/users" className="rounded-[8px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">가입 회원</Link>
        <Link to="/admin/all-users" className="rounded-[8px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">전체 명부</Link>
        <Link to="/admin/sms" className="rounded-[8px] bg-[#241b42] px-4 py-2 text-sm font-semibold text-white">단체 문자</Link>
      </div>

      {usersQuery.isError ? <StatePanel tone="danger" title="명부를 불러오지 못했습니다." description={toApiMessage(usersQuery.error)} /> : null}
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">발송 대상</h2>
            <p className="mt-1 text-sm text-slate-500">삭제 회원과 전화번호 미등록 회원은 자동 제외됩니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {cohorts.map((cohort) => (
              <label key={cohort} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={selectedCohorts.includes(cohort)} onChange={() => toggleCohort(cohort)} />
                {cohort}기
              </label>
            ))}
          </div>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {activeUsers.map((user: AllUser) => (
              <label key={user.allUserId} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 px-3 py-3 text-sm hover:bg-slate-50">
                <span><input className="mr-3" type="checkbox" checked={selectedIds.includes(user.allUserId)} onChange={() => toggleUser(user.allUserId)} />{user.name} <span className="text-slate-400">{user.cohort}기</span></span>
                <span className="text-xs text-slate-400">{user.phone}</span>
              </label>
            ))}
          </div>
          <p className="text-sm font-semibold text-[#5a43ba]">최종 발송 대상 {selectedUsers.length}명</p>
        </Card>

        <Card className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">문자 내용</h2>
            <p className="mt-1 text-sm text-slate-500">`[이름]`을 입력하면 대상자의 이름으로 바뀝니다.</p>
          </div>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={2000}
            placeholder="안녕하세요 [이름] 선배님.\n뮤즈에서 안내드립니다."
            className="min-h-48 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-[#5a43ba] focus:ring-4 focus:ring-[#ddd4ff]"
          />
          <p className="text-right text-xs text-slate-400">{message.length} / 2000</p>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-400">미리보기 ({selectedUsers[0]?.name ?? '이름'})</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{preview || '문자 내용을 입력해 주세요.'}</p>
          </div>
          {sendMutation.isError ? <p className="text-sm font-semibold text-rose-600">{toApiMessage(sendMutation.error)}</p> : null}
          {sendMutation.isSuccess ? <p className="text-sm font-semibold text-emerald-700">{sendMutation.data.data.recipientCount}명에게 발송했습니다.</p> : null}
          <Button className="w-full" disabled={!selectedUsers.length || !message.trim() || sendMutation.isPending} onClick={submit}>
            {sendMutation.isPending ? '발송 중...' : `${selectedUsers.length}명에게 문자 보내기`}
          </Button>
        </Card>
      </div>
    </section>
  );
}