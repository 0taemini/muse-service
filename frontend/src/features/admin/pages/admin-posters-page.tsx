import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toApiMessage } from '@features/auth/api/auth-api';
import { photoApi, type PhotoImage, variantUrl } from '@features/photo/api/photo-api';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';
import { FilePicker } from '@shared/components/ui/file-picker';
import { FormField } from '@shared/components/ui/form-field';
import { Input } from '@shared/components/ui/input';
import { Modal } from '@shared/components/ui/modal';
import { StatePanel } from '@shared/components/ui/state-panel';

type PosterForm = {
  title: string;
  description: string;
  displayOrder: string;
};

const emptyForm: PosterForm = {
  title: '',
  description: '',
  displayOrder: '0',
};

export function AdminPostersPage() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState<PosterForm>(emptyForm);
  const [editingPoster, setEditingPoster] = useState<PhotoImage | null>(null);
  const [deletingPoster, setDeletingPoster] = useState<PhotoImage | null>(null);

  const postersQuery = useQuery({
    queryKey: ['admin', 'posters'],
    queryFn: () => photoApi.getImages('POSTER'),
  });

  const posters = postersQuery.data?.data ?? [];
  const sortedPosters = useMemo(
    () => [...posters].sort((left, right) => left.displayOrder - right.displayOrder || right.imageId - left.imageId),
    [posters],
  );

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error('업로드할 포스터 이미지를 선택해주세요.');
      }

      const upload = await photoApi.createUpload({
        imageType: 'POSTER',
        albumId: null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        imageDate: null,
        displayOrder: Number(form.displayOrder || 0),
        fileName: selectedFile.name,
        contentType: selectedFile.type,
        fileSizeBytes: selectedFile.size,
      });

      await photoApi.uploadFileToS3(upload.data.uploadUrl, selectedFile);
      return upload.data;
    },
    onSuccess: async () => {
      setSelectedFile(null);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'posters'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingPoster) {
        throw new Error('수정할 포스터를 선택해주세요.');
      }

      return photoApi.updateImage(editingPoster.imageId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        imageDate: null,
        displayOrder: Number(form.displayOrder || 0),
      });
    },
    onSuccess: async () => {
      setEditingPoster(null);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'posters'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: number) => photoApi.deleteImage(imageId),
    onSuccess: async () => {
      setDeletingPoster(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'posters'] });
    },
  });

  return (
    <section className="mx-auto flex w-full max-w-[1120px] flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">포스터 관리</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
            메인페이지 포스터 이미지를 등록하고 노출 순서를 관리합니다.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/admin/users"
          className="rounded-[8px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          가입 회원
        </Link>
        <Link
          to="/admin/all-users"
          className="rounded-[8px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          전체 명부
        </Link>
        <Link to="/admin/posters" className="rounded-[8px] bg-[#241b42] px-4 py-2 text-sm font-semibold text-white">
          포스터
        </Link>
      </div>

      <Card className="space-y-5">
        <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-lg font-semibold text-slate-950">포스터 추가</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_120px]">
            <FormField label="포스터 이미지">
              <FilePicker file={selectedFile} accept="image/jpeg,image/png,image/webp" onFileChange={setSelectedFile} />
            </FormField>
            <FormField label="제목">
              <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="예: 2026 여름공연" />
            </FormField>
            <FormField label="순서">
              <Input type="number" value={form.displayOrder} onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))} />
            </FormField>
            <FormField label="설명" className="md:col-span-3">
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="min-h-24 w-full resize-y rounded-2xl border border-slate-300/90 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#14323f] focus:ring-4 focus:ring-[#d8e5e9]"
                placeholder="선택 입력"
              />
            </FormField>
          </div>
          {uploadMutation.isError ? <p className="mt-3 text-sm font-semibold text-rose-600">{toApiMessage(uploadMutation.error)}</p> : null}
          {uploadMutation.isSuccess ? <p className="mt-3 text-sm font-semibold text-emerald-700">업로드했습니다. 준비가 끝나면 목록에 표시됩니다.</p> : null}
          <div className="mt-4 flex justify-end">
            <Button disabled={!selectedFile || !form.title.trim() || uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>
              {uploadMutation.isPending ? '업로드 중...' : '포스터 올리기'}
            </Button>
          </div>
        </div>

        {postersQuery.isError ? (
          <StatePanel tone="danger" title="포스터를 불러오지 못했습니다." description={toApiMessage(postersQuery.error)} />
        ) : postersQuery.isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-[8px] bg-slate-100" />
            ))}
          </div>
        ) : sortedPosters.length ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sortedPosters.map((poster) => {
              const posterUrl = variantUrl(poster, ['POSTER_1600', 'THUMB_480']);

              return (
                <article key={poster.imageId} className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
                  {posterUrl ? (
                    <img src={posterUrl} alt={poster.title ?? '포스터'} className="aspect-[3/4] w-full bg-slate-100 object-contain" loading="lazy" />
                  ) : (
                    <div className="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 text-sm font-semibold text-slate-400">
                      처리 중
                    </div>
                  )}
                  <div className="space-y-3 p-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{poster.title}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">순서 {poster.displayOrder}</p>
                      {poster.description ? <p className="mt-2 text-sm leading-6 text-slate-500">{poster.description}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingPoster(poster);
                          setForm({
                            title: poster.title ?? '',
                            description: poster.description ?? '',
                            displayOrder: String(poster.displayOrder ?? 0),
                          });
                        }}
                      >
                        수정
                      </Button>
                      <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => setDeletingPoster(poster)}>
                        삭제
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <StatePanel title="포스터가 없습니다." description="포스터를 업로드하면 이곳에 표시됩니다." />
        )}
      </Card>

      <Modal
        open={editingPoster !== null}
        title="포스터 수정"
        onClose={() => {
          setEditingPoster(null);
          setForm(emptyForm);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setEditingPoster(null);
                setForm(emptyForm);
              }}
            >
              취소
            </Button>
            <Button disabled={!form.title.trim() || updateMutation.isPending} onClick={() => updateMutation.mutate()}>
              {updateMutation.isPending ? '수정 중...' : '수정하기'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <FormField label="제목">
            <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </FormField>
          <FormField label="순서">
            <Input type="number" value={form.displayOrder} onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))} />
          </FormField>
          <FormField label="설명">
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="min-h-28 w-full resize-y rounded-2xl border border-slate-300/90 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#14323f] focus:ring-4 focus:ring-[#d8e5e9]"
            />
          </FormField>
          {updateMutation.isError ? <p className="text-sm font-semibold text-rose-600">{toApiMessage(updateMutation.error)}</p> : null}
        </div>
      </Modal>

      <Modal
        open={deletingPoster !== null}
        title="포스터 삭제"
        description={deletingPoster ? `"${deletingPoster.title}" 포스터를 삭제할까요?` : undefined}
        onClose={() => setDeletingPoster(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeletingPoster(null)}>
              취소
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              disabled={!deletingPoster || deleteMutation.isPending}
              onClick={() => {
                if (deletingPoster) {
                  deleteMutation.mutate(deletingPoster.imageId);
                }
              }}
            >
              {deleteMutation.isPending ? '삭제 중...' : '삭제하기'}
            </Button>
          </div>
        }
      >
        {deleteMutation.isError ? <p className="text-sm font-semibold text-rose-600">{toApiMessage(deleteMutation.error)}</p> : null}
      </Modal>
    </section>
  );
}
