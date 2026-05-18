import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toApiMessage } from '@features/auth/api/auth-api';
import { useAuthStore } from '@features/auth/store/auth-store';
import {
  photoApi,
  type AlbumCategory,
  type PhotoAlbum,
  type PhotoImage,
  variantUrl,
} from '@features/photo/api/photo-api';
import { Button } from '@shared/components/ui/button';
import { FilePicker } from '@shared/components/ui/file-picker';
import { FormField } from '@shared/components/ui/form-field';
import { Input } from '@shared/components/ui/input';
import { Modal } from '@shared/components/ui/modal';
import { Select } from '@shared/components/ui/select';
import { StatePanel } from '@shared/components/ui/state-panel';
import { cn } from '@shared/lib/cn';

type AlbumForm = {
  title: string;
  description: string;
  albumCategory: AlbumCategory;
};

const categoryLabels: Record<AlbumCategory | 'ALL', string> = {
  ALL: '전체',
  PERFORMANCE: '공연',
  ACTIVITY: '활동',
  ETC: '기타',
};

const emptyAlbumForm: AlbumForm = {
  title: '',
  description: '',
  albumCategory: 'PERFORMANCE',
};

export function PhotoAlbumsPage() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = Boolean(accessToken);
  const [category, setCategory] = useState<AlbumCategory | 'ALL'>('ALL');
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [isAlbumFormOpen, setIsAlbumFormOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<PhotoAlbum | null>(null);
  const [albumForm, setAlbumForm] = useState<AlbumForm>(emptyAlbumForm);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [detailImage, setDetailImage] = useState<PhotoImage | null>(null);

  const albumsQuery = useQuery({
    queryKey: ['photo-albums', category],
    queryFn: () => photoApi.getAlbums(category === 'ALL' ? undefined : category),
  });

  const albums = albumsQuery.data?.data ?? [];
  const selectedAlbum = useMemo(
    () => albums.find((album) => album.albumId === selectedAlbumId) ?? albums[0] ?? null,
    [albums, selectedAlbumId],
  );

  const albumDetailQuery = useQuery({
    queryKey: ['photo-album-detail', selectedAlbum?.albumId],
    queryFn: () => photoApi.getAlbum(selectedAlbum!.albumId),
    enabled: Boolean(selectedAlbum),
  });

  const createAlbumMutation = useMutation({
    mutationFn: () =>
      photoApi.createAlbum({
        title: albumForm.title.trim(),
        description: albumForm.description.trim() || null,
        albumCategory: albumForm.albumCategory,
        displayOrder: null,
      }),
    onSuccess: async (response) => {
      setSelectedAlbumId(response.data.albumId);
      setIsAlbumFormOpen(false);
      setAlbumForm(emptyAlbumForm);
      await queryClient.invalidateQueries({ queryKey: ['photo-albums'] });
    },
  });

  const updateAlbumMutation = useMutation({
    mutationFn: () => {
      if (!editingAlbum) {
        throw new Error('수정할 앨범을 선택해주세요.');
      }

      return photoApi.updateAlbum(editingAlbum.albumId, {
        title: albumForm.title.trim(),
        description: albumForm.description.trim() || null,
        albumCategory: albumForm.albumCategory,
        displayOrder: editingAlbum.displayOrder,
      });
    },
    onSuccess: async (response) => {
      setSelectedAlbumId(response.data.albumId);
      setEditingAlbum(null);
      setIsAlbumFormOpen(false);
      setAlbumForm(emptyAlbumForm);
      await queryClient.invalidateQueries({ queryKey: ['photo-albums'] });
      await queryClient.invalidateQueries({ queryKey: ['photo-album-detail', response.data.albumId] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAlbum || !uploadFile) {
        throw new Error('앨범과 사진을 선택해주세요.');
      }

      const upload = await photoApi.createUpload({
        imageType: 'ALBUM',
        albumId: selectedAlbum.albumId,
        title: uploadTitle.trim() || null,
        description: uploadDescription.trim() || null,
        imageDate: null,
        displayOrder: null,
        fileName: uploadFile.name,
        contentType: uploadFile.type,
        fileSizeBytes: uploadFile.size,
      });

      await photoApi.uploadFileToS3(upload.data.uploadUrl, uploadFile);
      return upload.data;
    },
    onSuccess: async () => {
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      await queryClient.invalidateQueries({ queryKey: ['photo-album-detail', selectedAlbum?.albumId] });
    },
  });

  const albumImages = albumDetailQuery.data?.data.images ?? [];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[2.15rem] font-semibold tracking-tight text-[#241b42] md:text-[3rem]">사진 앨범</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[#6f678b]">
            공연과 활동 사진을 앨범 단위로 모아보는 공간입니다.
          </p>
        </div>
        {isAuthenticated ? (
          <Button className="w-full md:w-auto" onClick={() => setIsAlbumFormOpen(true)}>
            앨범 만들기
          </Button>
        ) : null}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {(['ALL', 'PERFORMANCE', 'ACTIVITY', 'ETC'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setCategory(item);
              setSelectedAlbumId(null);
            }}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition',
              category === item ? 'border-[#5a43ba] bg-[#f3efff] text-[#4d36a2]' : 'border-slate-200 bg-white text-slate-500',
            )}
          >
            {categoryLabels[item]}
          </button>
        ))}
      </div>

      {albumsQuery.isError ? (
        <StatePanel tone="danger" title="앨범을 불러오지 못했습니다." description={toApiMessage(albumsQuery.error)} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
          <aside className="rounded-[8px] border border-[rgba(95,75,182,0.1)] bg-white p-3 shadow-[0_12px_28px_rgba(52,35,110,0.05)]">
            {albumsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-[8px] bg-slate-100" />
                ))}
              </div>
            ) : albums.length ? (
              <div className="space-y-2">
                {albums.map((album) => (
                  <button
                    key={album.albumId}
                    type="button"
                    onClick={() => setSelectedAlbumId(album.albumId)}
                    className={cn(
                      'w-full rounded-[8px] border p-4 text-left transition',
                      selectedAlbum?.albumId === album.albumId
                        ? 'border-[#5a43ba] bg-[#f7f4ff]'
                        : 'border-slate-200 bg-white hover:bg-slate-50',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-slate-950">{album.title}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
                        {categoryLabels[album.albumCategory]}
                      </span>
                    </div>
                    {album.description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{album.description}</p> : null}
                  </button>
                ))}
              </div>
            ) : (
              <StatePanel title="앨범이 없습니다." description="아직 등록된 사진 앨범이 없습니다." />
            )}
          </aside>

          <section className="rounded-[8px] border border-[rgba(95,75,182,0.1)] bg-white p-4 shadow-[0_12px_28px_rgba(52,35,110,0.05)] md:p-5">
            {selectedAlbum ? (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold text-[#241b42]">{selectedAlbum.title}</h2>
                      <span className="rounded-full bg-[#f3efff] px-3 py-1 text-xs font-bold text-[#4d36a2]">
                        {categoryLabels[selectedAlbum.albumCategory]}
                      </span>
                    </div>
                    {selectedAlbum.description ? <p className="mt-2 text-sm leading-7 text-[#6f678b]">{selectedAlbum.description}</p> : null}
                  </div>
                  {isAuthenticated ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingAlbum(selectedAlbum);
                        setAlbumForm({
                          title: selectedAlbum.title,
                          description: selectedAlbum.description ?? '',
                          albumCategory: selectedAlbum.albumCategory,
                        });
                        setIsAlbumFormOpen(true);
                      }}
                    >
                      앨범 수정
                    </Button>
                  ) : null}
                </div>

                {isAuthenticated ? (
                  <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-900">앨범에 사진 추가</h3>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <FormField label="사진">
                        <FilePicker file={uploadFile} accept="image/jpeg,image/png,image/webp" onFileChange={setUploadFile} />
                      </FormField>
                      <FormField label="제목">
                        <Input value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} placeholder="선택 입력" />
                      </FormField>
                      <FormField label="설명">
                        <Input value={uploadDescription} onChange={(event) => setUploadDescription(event.target.value)} placeholder="선택 입력" />
                      </FormField>
                    </div>
                    {uploadMutation.isError ? <p className="mt-3 text-sm font-semibold text-rose-600">{toApiMessage(uploadMutation.error)}</p> : null}
                    {uploadMutation.isSuccess ? <p className="mt-3 text-sm font-semibold text-emerald-700">업로드했습니다. 준비가 끝나면 앨범에 표시됩니다.</p> : null}
                    <div className="mt-4 flex justify-end">
                      <Button disabled={!uploadFile || uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>
                        {uploadMutation.isPending ? '업로드 중...' : '사진 올리기'}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {albumDetailQuery.isLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="aspect-[4/3] animate-pulse rounded-[8px] bg-slate-100" />
                    ))}
                  </div>
                ) : albumDetailQuery.isError ? (
                  <StatePanel tone="danger" title="사진을 불러오지 못했습니다." description={toApiMessage(albumDetailQuery.error)} />
                ) : albumImages.length ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {albumImages.map((image) => {
                      const imageUrl = variantUrl(image, ['THUMB_480', 'THUMB_320']);

                      return (
                        <button key={image.imageId} type="button" className="overflow-hidden rounded-[8px] border border-slate-200 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-lg" onClick={() => setDetailImage(image)}>
                          {imageUrl ? (
                            <img src={imageUrl} alt={image.title ?? selectedAlbum.title} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-100 text-sm font-semibold text-slate-400">
                              처리 중
                            </div>
                          )}
                          <div className="p-3">
                            <p className="font-semibold text-slate-950">{image.title || '제목 없는 사진'}</p>
                            {image.description ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{image.description}</p> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <StatePanel title="사진이 없습니다." description="이 앨범에는 아직 사진이 없습니다." />
                )}
              </div>
            ) : (
              <StatePanel title="앨범을 선택해주세요." description="왼쪽 목록에서 앨범을 선택하면 사진을 볼 수 있습니다." />
            )}
          </section>
        </div>
      )}

      <Modal
        open={isAlbumFormOpen}
        title={editingAlbum ? '앨범 수정' : '앨범 만들기'}
        onClose={() => {
          setIsAlbumFormOpen(false);
          setEditingAlbum(null);
          setAlbumForm(emptyAlbumForm);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsAlbumFormOpen(false);
                setEditingAlbum(null);
                setAlbumForm(emptyAlbumForm);
              }}
            >
              취소
            </Button>
            <Button
              disabled={!albumForm.title.trim() || createAlbumMutation.isPending || updateAlbumMutation.isPending}
              onClick={() => {
                if (editingAlbum) {
                  updateAlbumMutation.mutate();
                  return;
                }
                createAlbumMutation.mutate();
              }}
            >
              {createAlbumMutation.isPending || updateAlbumMutation.isPending
                ? '저장 중...'
                : editingAlbum
                  ? '수정하기'
                  : '생성하기'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <FormField label="앨범 종류">
            <Select value={albumForm.albumCategory} onChange={(event) => setAlbumForm((current) => ({ ...current, albumCategory: event.target.value as AlbumCategory }))}>
              <option value="PERFORMANCE">공연</option>
              <option value="ACTIVITY">활동</option>
              <option value="ETC">기타</option>
            </Select>
          </FormField>
          <FormField label="제목">
            <Input value={albumForm.title} onChange={(event) => setAlbumForm((current) => ({ ...current, title: event.target.value }))} placeholder="예: 여름공연" />
          </FormField>
          <FormField label="설명">
            <textarea
              value={albumForm.description}
              onChange={(event) => setAlbumForm((current) => ({ ...current, description: event.target.value }))}
              className="min-h-28 w-full resize-y rounded-2xl border border-slate-300/90 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#14323f] focus:ring-4 focus:ring-[#d8e5e9]"
              placeholder="선택 입력"
            />
          </FormField>
          {createAlbumMutation.isError ? <p className="text-sm font-semibold text-rose-600">{toApiMessage(createAlbumMutation.error)}</p> : null}
          {updateAlbumMutation.isError ? <p className="text-sm font-semibold text-rose-600">{toApiMessage(updateAlbumMutation.error)}</p> : null}
        </div>
      </Modal>

      <Modal open={detailImage !== null} title={detailImage?.title || selectedAlbum?.title || '사진'} onClose={() => setDetailImage(null)} size="xl">
        {detailImage ? (
          <figure>
            {variantUrl(detailImage, ['DETAIL_1200', 'THUMB_480', 'THUMB_320']) ? (
              <img src={variantUrl(detailImage, ['DETAIL_1200', 'THUMB_480', 'THUMB_320'])} alt={detailImage.title ?? '앨범 사진'} className="max-h-[70vh] w-full rounded-[8px] object-contain" />
            ) : (
              <div className="flex h-72 w-full items-center justify-center rounded-[8px] bg-slate-100 text-sm font-semibold text-slate-400">
                사진을 준비하고 있습니다.
              </div>
            )}
            {detailImage.description ? <figcaption className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{detailImage.description}</figcaption> : null}
          </figure>
        ) : null}
      </Modal>
    </section>
  );
}
