import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  adminUserApi,
  type AllUser,
  type AllUserStatus,
  type UpsertAllUserPayload,
} from '@features/admin/api/admin-user-api';
import { toApiMessage } from '@features/auth/api/auth-api';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';
import { InlineNotice } from '@shared/components/ui/inline-notice';
import { Modal } from '@shared/components/ui/modal';
import { SkeletonList } from '@shared/components/ui/skeleton';
import { StatePanel } from '@shared/components/ui/state-panel';

const emptyForm = {
  name: '',
  cohort: '',
  email: '',
  phone: '',
};

const statusLabel: Record<AllUserStatus, string> = {
  ACTIVE: '활성',
  DELETED: '삭제됨',
};

const PAGE_SIZE = 10;

function toPayload(form: typeof emptyForm): UpsertAllUserPayload {
  return {
    name: form.name.trim(),
    cohort: Number(form.cohort),
    email: form.email.trim() || undefined,
    phone: form.phone.trim() || undefined,
  };
}

function AllUserForm({
  form,
  onChange,
  onSubmit,
  id,
}: {
  form: typeof emptyForm;
  onChange: (form: typeof emptyForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  id: string;
}) {
  return (
    <form id={id} className="grid gap-4" onSubmit={onSubmit}>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        이름
        <input
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
          className="min-h-12 rounded-[8px] border border-slate-200 px-4 text-sm font-medium text-slate-900 outline-none focus:border-[#5a43ba] focus:ring-4 focus:ring-[#ddd4ff]"
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        기수
        <input
          value={form.cohort}
          type="number"
          onChange={(event) => onChange({ ...form, cohort: event.target.value })}
          className="min-h-12 rounded-[8px] border border-slate-200 px-4 text-sm font-medium text-slate-900 outline-none focus:border-[#5a43ba] focus:ring-4 focus:ring-[#ddd4ff]"
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        email
        <input
          value={form.email}
          type="email"
          onChange={(event) => onChange({ ...form, email: event.target.value })}
          className="min-h-12 rounded-[8px] border border-slate-200 px-4 text-sm font-medium text-slate-900 outline-none focus:border-[#5a43ba] focus:ring-4 focus:ring-[#ddd4ff]"
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        전화번호
        <input
          value={form.phone}
          onChange={(event) => onChange({ ...form, phone: event.target.value })}
          className="min-h-12 rounded-[8px] border border-slate-200 px-4 text-sm font-medium text-slate-900 outline-none focus:border-[#5a43ba] focus:ring-4 focus:ring-[#ddd4ff]"
        />
      </label>
    </form>
  );
}

function AllUserRow({
  allUser,
  isPending,
  onEdit,
  onRestore,
  onDelete,
}: {
  allUser: AllUser;
  isPending: boolean;
  onEdit: (allUser: AllUser) => void;
  onRestore: (allUserId: number) => void;
  onDelete: (allUserId: number) => void;
}) {
  return (
    <article className="grid gap-4 rounded-[8px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(41,28,93,0.05)] md:grid-cols-[1fr_1fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold text-slate-950">{allUser.name}</h3>
          <span
            className={
              allUser.status === 'DELETED'
                ? 'rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow-[0_10px_22px_rgba(225,29,72,0.22)]'
                : 'rounded-full bg-[#e9f8ef] px-3 py-1 text-xs font-semibold text-[#137a3b]'
            }
          >
            {statusLabel[allUser.status]}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-500">{allUser.cohort}기</p>
      </div>

      <div className="min-w-0 text-sm leading-7 text-slate-500">
        <p className="truncate">{allUser.email || 'email 미등록'}</p>
        <p>{allUser.phone || '전화번호 미등록'}</p>
      </div>

      <div className="flex flex-wrap justify-start gap-2 md:justify-end">
        <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => onEdit(allUser)}>
          수정
        </Button>
        {allUser.status === 'DELETED' ? (
          <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => onRestore(allUser.allUserId)}>
            복구
          </Button>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onDelete(allUser.allUserId)}
            className="min-h-10 rounded-[8px] px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            삭제
          </button>
        )}
      </div>
    </article>
  );
}

export function AdminAllUsersPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [message, setMessage] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [currentPage, setCurrentPage] = useState(1);

  const allUsersQuery = useQuery({
    queryKey: ['admin', 'all-users'],
    queryFn: adminUserApi.getAllUsers,
  });

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateForm(emptyForm);
  };

  const closeEditModal = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const createMutation = useMutation({
    mutationFn: adminUserApi.createAllUser,
    onSuccess: (response) => {
      setMessage(response.message);
      closeCreateModal();
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-users'] });
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ allUserId, payload }: { allUserId: number; payload: UpsertAllUserPayload }) =>
      adminUserApi.updateAllUser(allUserId, payload),
    onSuccess: (response) => {
      setMessage(response.message);
      closeEditModal();
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-users'] });
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ allUserId, status }: { allUserId: number; status: AllUserStatus }) =>
      adminUserApi.updateAllUserStatus(allUserId, status),
    onSuccess: (response) => {
      setMessage(response.message);
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-users'] });
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: adminUserApi.deleteAllUser,
    onSuccess: (response) => {
      setMessage(response.message);
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-users'] });
    },
    onError: (error) => setMessage(toApiMessage(error)),
  });

  const allUsers = allUsersQuery.data?.data ?? [];
  const filteredAllUsers = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return allUsers;
    }
    return allUsers.filter((allUser) =>
      [allUser.name, String(allUser.cohort), allUser.email ?? '', allUser.phone ?? ''].some((value) =>
        value.toLowerCase().includes(normalizedKeyword),
      ),
    );
  }, [allUsers, keyword]);

  const totalPages = Math.max(1, Math.ceil(filteredAllUsers.length / PAGE_SIZE));
  const paginatedAllUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredAllUsers.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredAllUsers]);
  const pageStart = filteredAllUsers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, filteredAllUsers.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const isMutating =
    createMutation.isPending || updateMutation.isPending || statusMutation.isPending || deleteMutation.isPending;

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate(toPayload(createForm));
  };

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId) {
      return;
    }
    updateMutation.mutate({ allUserId: editingId, payload: toPayload(editForm) });
  };

  return (
    <section className="mx-auto flex w-full max-w-[1120px] flex-col gap-5">
      <div>
        <p className="section-kicker">Admin</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">전체 명부 관리</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
          회원가입 가능 대상자인 ALLUSER 명부를 추가, 수정, 논리 삭제합니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/admin/users"
          className="rounded-[8px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          가입 회원
        </Link>
        <Link to="/admin/all-users" className="rounded-[8px] bg-[#241b42] px-4 py-2 text-sm font-semibold text-white">
          전체 명부
        </Link>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="이름, 기수, email, 전화번호 검색"
            className="min-h-12 w-full rounded-[8px] border border-slate-200 px-4 text-sm outline-none focus:border-[#5a43ba] focus:ring-4 focus:ring-[#ddd4ff] md:max-w-[420px]"
          />
          <Button
            type="button"
            disabled={isMutating}
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-[8px]"
          >
            멤버 추가
          </Button>
        </div>

        {message ? (
          <InlineNotice
            tone={createMutation.isError || updateMutation.isError || statusMutation.isError || deleteMutation.isError ? 'error' : 'success'}
          >
            {message}
          </InlineNotice>
        ) : null}

        {allUsersQuery.isError ? (
          <StatePanel title="전체 명부를 불러오지 못했습니다" description={toApiMessage(allUsersQuery.error)} tone="danger" />
        ) : null}

        <div className="grid gap-3">
          {allUsersQuery.isLoading ? (
            <SkeletonList count={PAGE_SIZE} />
          ) : (
            paginatedAllUsers.map((allUser) => (
              <AllUserRow
                key={allUser.allUserId}
                allUser={allUser}
                isPending={isMutating}
                onEdit={(target) => {
                  setEditingId(target.allUserId);
                  setEditForm({
                    name: target.name,
                    cohort: String(target.cohort),
                    email: target.email ?? '',
                    phone: target.phone ?? '',
                  });
                }}
                onRestore={(allUserId) => statusMutation.mutate({ allUserId, status: 'ACTIVE' })}
                onDelete={(allUserId) => deleteMutation.mutate(allUserId)}
              />
            ))
          )}
        </div>

        {!allUsersQuery.isLoading && !allUsersQuery.isError && filteredAllUsers.length > 0 ? (
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {pageStart}-{pageEnd} / {filteredAllUsers.length}명
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

      <Modal
        open={isCreateModalOpen}
        title="멤버 추가"
        description="회원가입 가능 대상자를 전체 명부에 추가합니다."
        onClose={closeCreateModal}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={createMutation.isPending} onClick={closeCreateModal}>
              취소
            </Button>
            <Button type="submit" form="all-user-create-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? '추가 중' : '멤버 추가'}
            </Button>
          </div>
        }
      >
        <AllUserForm id="all-user-create-form" form={createForm} onChange={setCreateForm} onSubmit={handleCreateSubmit} />
      </Modal>

      <Modal
        open={editingId !== null}
        title="명부 수정"
        description="이름, 기수, email, 전화번호를 수정합니다."
        onClose={closeEditModal}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={updateMutation.isPending} onClick={closeEditModal}>
              취소
            </Button>
            <Button type="submit" form="all-user-edit-form" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? '저장 중' : '저장'}
            </Button>
          </div>
        }
      >
        <AllUserForm id="all-user-edit-form" form={editForm} onChange={setEditForm} onSubmit={handleEditSubmit} />
      </Modal>
    </section>
  );
}
