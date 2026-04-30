import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { User, UserRole, UserStatus } from '@entities/user/model/user.types';
import { adminUserApi } from '@features/admin/api/admin-user-api';
import { toApiMessage } from '@features/auth/api/auth-api';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';
import { InlineNotice } from '@shared/components/ui/inline-notice';
import { SkeletonList } from '@shared/components/ui/skeleton';
import { StatePanel } from '@shared/components/ui/state-panel';
import { cn } from '@shared/lib/cn';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'USER', label: '일반' },
  { value: 'ADMIN', label: '관리자' },
  { value: 'GUEST', label: '게스트' },
];

const statusOptions: { value: UserStatus; label: string }[] = [
  { value: 'ACTIVE', label: '활성' },
  { value: 'DELETED', label: '삭제됨' },
];

const roleLabel = (role: UserRole) => roleOptions.find((option) => option.value === role)?.label ?? role;
const statusLabel = (status: UserStatus) => statusOptions.find((option) => option.value === status)?.label ?? status;
const PAGE_SIZE = 10;

function UserBadge({ value, tone }: { value: string; tone: 'admin' | 'active' | 'deleted' | 'muted' }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold',
        tone === 'admin' && 'bg-[#241b42] text-white',
        tone === 'active' && 'bg-[#e9f8ef] text-[#137a3b]',
        tone === 'deleted' && 'bg-rose-600 text-white shadow-[0_10px_22px_rgba(225,29,72,0.22)]',
        tone === 'muted' && 'bg-slate-100 text-slate-600',
      )}
    >
      {value}
    </span>
  );
}

function AdminUserCard({
  user,
  isPending,
  onRoleChange,
  onStatusChange,
  onDelete,
}: {
  user: User;
  isPending: boolean;
  onRoleChange: (userId: number, role: UserRole) => void;
  onStatusChange: (userId: number, status: UserStatus) => void;
  onDelete: (userId: number) => void;
}) {
  return (
    <article className="grid gap-4 rounded-[8px] border border-[rgba(95,75,182,0.12)] bg-white p-4 shadow-[0_12px_28px_rgba(41,28,93,0.06)] md:grid-cols-[1.2fr_0.8fr_0.8fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold text-slate-950">{user.name}</h3>
          <UserBadge value={roleLabel(user.role)} tone={user.role === 'ADMIN' ? 'admin' : 'muted'} />
          <UserBadge value={statusLabel(user.status)} tone={user.status === 'ACTIVE' ? 'active' : 'deleted'} />
        </div>
        <p className="mt-2 truncate text-sm text-slate-500">{user.email}</p>
        <p className="mt-1 text-sm text-slate-500">
          {user.cohort}기 · {user.nickname}
        </p>
      </div>

      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        권한
        <select
          value={user.role}
          disabled={isPending}
          onChange={(event) => onRoleChange(user.userId, event.target.value as UserRole)}
          className="min-h-11 rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[#5a43ba] focus:ring-4 focus:ring-[#ddd4ff]"
        >
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        상태
        <select
          value={user.status}
          disabled={isPending}
          onChange={(event) => onStatusChange(user.userId, event.target.value as UserStatus)}
          className="min-h-11 rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[#5a43ba] focus:ring-4 focus:ring-[#ddd4ff]"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="text-sm text-slate-500 md:text-right">
        <p>ID {user.userId}</p>
        <p>{new Date(user.createdAt).toLocaleDateString('ko-KR')}</p>
        <button
          type="button"
          disabled={isPending || user.status === 'DELETED'}
          onClick={() => onDelete(user.userId)}
          className="mt-2 rounded-[8px] px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          삭제
        </button>
      </div>
    </article>
  );
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [message, setMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminUserApi.getUsers,
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: UserRole }) => adminUserApi.updateRole(userId, role),
    onSuccess: (response) => {
      setMessage(response.message);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: UserStatus }) =>
      adminUserApi.updateStatus(userId, status),
    onSuccess: (response) => {
      setMessage(response.message);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => adminUserApi.deleteUser(userId),
    onSuccess: (response) => {
      setMessage(response.message);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  const users = usersQuery.data?.data ?? [];
  const filteredUsers = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.nickname, user.email, String(user.cohort)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedKeyword)),
    );
  }, [keyword, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredUsers]);
  const pageStart = filteredUsers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, filteredUsers.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const adminCount = users.filter((user) => user.role === 'ADMIN').length;
  const activeCount = users.filter((user) => user.status === 'ACTIVE').length;
  const isMutating = roleMutation.isPending || statusMutation.isPending || deleteMutation.isPending;

  return (
    <section className="mx-auto flex w-full max-w-[1120px] flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="section-kicker">Admin</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">사용자 관리</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
            뮤즈 서비스에 가입된 사용자의 계정 상태와 관리자 권한을 변경합니다.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-[8px] border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold text-slate-500">전체</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{users.length}</p>
          </div>
          <div className="rounded-[8px] border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold text-slate-500">활성</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{activeCount}</p>
          </div>
          <div className="rounded-[8px] border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold text-slate-500">관리자</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{adminCount}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/admin/users" className="rounded-[8px] bg-[#241b42] px-4 py-2 text-sm font-semibold text-white">
          가입 회원
        </Link>
        <Link
          to="/admin/all-users"
          className="rounded-[8px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          전체 명부
        </Link>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="이름, 닉네임, email, 기수 검색"
            className="min-h-12 w-full rounded-[8px] border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#5a43ba] focus:ring-4 focus:ring-[#ddd4ff] md:max-w-[360px]"
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => usersQuery.refetch()}
            disabled={usersQuery.isFetching}
            className="rounded-[8px]"
          >
            {usersQuery.isFetching ? '새로고침 중' : '새로고침'}
          </Button>
        </div>

        {message ? (
          <InlineNotice tone={roleMutation.isError || statusMutation.isError || deleteMutation.isError ? 'error' : 'success'}>
            {message}
          </InlineNotice>
        ) : null}

        {usersQuery.isError ? (
          <StatePanel
            title="사용자 목록을 불러오지 못했습니다"
            description={toApiMessage(usersQuery.error)}
            tone="danger"
          />
        ) : null}

        {!usersQuery.isLoading && !usersQuery.isError && filteredUsers.length === 0 ? (
          <StatePanel title="검색 결과가 없습니다" description="다른 검색어로 다시 확인해 주세요." tone="accent" />
        ) : null}

        <div className="grid gap-3">
          {usersQuery.isLoading ? (
            <SkeletonList count={PAGE_SIZE} />
          ) : (
            paginatedUsers.map((user) => (
              <AdminUserCard
                key={user.userId}
                user={user}
                isPending={isMutating}
                onRoleChange={(userId, role) => roleMutation.mutate({ userId, role })}
                onStatusChange={(userId, status) => statusMutation.mutate({ userId, status })}
                onDelete={(userId) => deleteMutation.mutate(userId)}
              />
            ))
          )}
        </div>

        {!usersQuery.isLoading && !usersQuery.isError && filteredUsers.length > 0 ? (
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {pageStart}-{pageEnd} / {filteredUsers.length}명
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="rounded-[8px]"
              >
                이전
              </Button>
              <span className="min-w-16 text-center font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                className="rounded-[8px]"
              >
                다음
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
