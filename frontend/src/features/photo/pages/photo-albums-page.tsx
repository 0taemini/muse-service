import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
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

type ImageForm = {
  title: string;
  description: string;
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

const emptyImageForm: ImageForm = {
  title: '',
  description: '',
};

export function PhotoAlbumsPage() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = Boolean(accessToken);
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState<AlbumCategory | 'ALL'>('ALL');
  const selectedAlbumIdParam = Number(searchParams.get('albumId'));
  const selectedAlbumId = Number.isInteger(selectedAlbumIdParam) && selectedAlbumIdParam > 0 ? selectedAlbumIdParam : null;
  const [isAlbumFormOpen, setIsAlbumFormOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<PhotoAlbum | null>(null);
  const [albumForm, setAlbumForm] = useState<AlbumForm>(emptyAlbumForm);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [detailImage, setDetailImage] = useState<PhotoImage | null>(null);
  const [editingImage, setEditingImage] = useState<PhotoImage | null>(null);
  const [deletingImage, setDeletingImage] = useState<PhotoImage | null>(null);
  const [imageForm, setImageForm] = useState<ImageForm>(emptyImageForm);
  const detailImageHistoryRef = useRef(false);

  const albumsQuery = useQuery({
    queryKey: ['photo-albums', category],
    queryFn: () => photoApi.getAlbums(category === 'ALL' ? undefined : category),
  });

  const albums = albumsQuery.data?.data ?? [];
  const selectedAlbum = useMemo(
    () => albums.find((album) => album.albumId === selectedAlbumId) ?? null,
    [albums, selectedAlbumId],
  );

  const albumPreviewQueries = useQueries({
    queries: albums.map((album) => ({
      queryKey: ['photo-album-detail', album.albumId],
      queryFn: () => photoApi.getAlbum(album.albumId),
    })),
  });

  const albumPreviewById = useMemo(
    () =>
      Object.fromEntries(
        albums.map((album, index) => [album.albumId, albumPreviewQueries[index]?.data?.data.images ?? []]),
      ) as Record<number, PhotoImage[]>,
    [albumPreviewQueries, albums],
  );

  const openAlbum = (albumId: number) => {
    setSearchParams({ albumId: String(albumId) });
  };

  const showAlbumList = () => {
    setSearchParams({});
  };

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
      openAlbum(response.data.albumId);
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
      openAlbum(response.data.albumId);
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

  const updateImageMutation = useMutation({
    mutationFn: () => {
      if (!editingImage) {
        throw new Error('수정할 사진을 선택해 주세요.');
      }

      return photoApi.updateImage(editingImage.imageId, {
        title: imageForm.title.trim() || null,
        description: imageForm.description.trim() || null,
        imageDate: editingImage.imageDate,
        displayOrder: editingImage.displayOrder,
      });
    },
    onSuccess: async (response) => {
      setDetailImage((current) => (current?.imageId === response.data.imageId ? response.data : current));
      setEditingImage(null);
      setImageForm(emptyImageForm);
      await queryClient.invalidateQueries({ queryKey: ['photo-album-detail', selectedAlbum?.albumId] });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: number) => photoApi.deleteImage(imageId),
    onSuccess: async (_, imageId) => {
      if (detailImage?.imageId === imageId) {
        closeDetailImage();
      }

      setDeletingImage(null);
      await queryClient.invalidateQueries({ queryKey: ['photo-album-detail', selectedAlbum?.albumId] });
    },
  });

  const albumImages = albumDetailQuery.data?.data.images ?? [];

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!detailImage || !detailImageHistoryRef.current) {
        return;
      }

      if (!event.state?.photoAlbumDetailImageOpen) {
        detailImageHistoryRef.current = false;
        setDetailImage(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [detailImage]);

  const openDetailImage = (image: PhotoImage) => {
    if (!detailImage) {
      window.history.pushState(
        {
          ...window.history.state,
          photoAlbumDetailImageOpen: true,
        },
        '',
      );
      detailImageHistoryRef.current = true;
    }

    setDetailImage(image);
  };

  const closeDetailImage = () => {
    if (detailImageHistoryRef.current && window.history.state?.photoAlbumDetailImageOpen) {
      window.history.back();
      return;
    }

    detailImageHistoryRef.current = false;
    setDetailImage(null);
  };

  const openEditImage = (image: PhotoImage) => {
    setEditingImage(image);
    setImageForm({
      title: image.title ?? '',
      description: image.description ?? '',
    });
  };

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
              showAlbumList();
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
      ) : selectedAlbum ? (
        <section className="rounded-[28px] border border-[rgba(95,75,182,0.1)] bg-white p-4 shadow-[0_12px_28px_rgba(52,35,110,0.05)] md:p-6">
          <div className="space-y-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <Button variant="ghost" size="sm" onClick={showAlbumList}>
                  전체 앨범
                </Button>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold text-[#241b42] md:text-3xl">{selectedAlbum.title}</h2>
                  <span className="rounded-full bg-[#f3efff] px-3 py-1 text-xs font-bold text-[#4d36a2]">
                    {categoryLabels[selectedAlbum.albumCategory]}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                    사진 {albumImages.length}장
                  </span>
                </div>
                {selectedAlbum.description ? <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6f678b]">{selectedAlbum.description}</p> : null}
              </div>
              {isAuthenticated ? (
                <div className="flex gap-2">
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
                </div>
              ) : null}
            </div>

            {isAuthenticated ? (
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
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
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div key={index} className="aspect-square animate-pulse rounded-[8px] bg-slate-100" />
                ))}
              </div>
            ) : albumDetailQuery.isError ? (
              <StatePanel tone="danger" title="사진을 불러오지 못했습니다." description={toApiMessage(albumDetailQuery.error)} />
            ) : albumImages.length ? (
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                {albumImages.map((image) => {
                  const imageUrl = variantUrl(image, ['THUMB_480', 'THUMB_320']);

                  return (
                    <button
                      key={image.imageId}
                      type="button"
                      className="group relative overflow-hidden rounded-[8px] bg-slate-100"
                      onClick={() => openDetailImage(image)}
                    >
                      {imageUrl ? (
                        <img src={imageUrl} alt={image.title ?? selectedAlbum.title} className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center text-sm font-semibold text-slate-400">
                          처리 중
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <StatePanel title="사진이 없습니다." description="이 앨범에는 아직 사진이 없습니다." />
            )}
          </div>
        </section>
      ) : albumsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_28px_rgba(52,35,110,0.05)]">
              <div className="aspect-square animate-pulse bg-slate-100" />
              <div className="space-y-2 p-4">
                <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : albums.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => {
            const images = albumPreviewById[album.albumId] ?? [];
            const coverImage = images[0];
            const coverUrl = coverImage ? variantUrl(coverImage, ['THUMB_480', 'THUMB_320']) : '';

            return (
              <button
                key={album.albumId}
                type="button"
                className="group overflow-hidden rounded-[24px] border border-[rgba(95,75,182,0.1)] bg-white text-left shadow-[0_12px_28px_rgba(52,35,110,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(52,35,110,0.1)]"
                onClick={() => openAlbum(album.albumId)}
              >
                <div className="relative aspect-square overflow-hidden bg-slate-100">
                  {coverUrl ? (
                    <img src={coverUrl} alt={album.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-400">
                      사진 없음
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-xs font-bold text-[#4d36a2] shadow-sm">
                    {categoryLabels[album.albumCategory]}
                  </span>
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-slate-950">{album.title}</h2>
                    <span className="shrink-0 text-xs font-semibold text-slate-500">사진 {images.length}장</span>
                  </div>
                  {album.description ? <p className="line-clamp-2 text-sm leading-6 text-slate-500">{album.description}</p> : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <StatePanel title="앨범이 없습니다." description="아직 등록된 사진 앨범이 없습니다." />
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

      <Modal
        open={detailImage !== null}
        title={detailImage?.title || selectedAlbum?.title || '사진'}
        onClose={closeDetailImage}
        size="xl"
        headerActions={
          detailImage && isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => openEditImage(detailImage)}>
                수정
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:text-rose-700"
                onClick={() => setDeletingImage(detailImage)}
              >
                삭제
              </Button>
            </>
          ) : null
        }
      >
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

      <Modal
        open={editingImage !== null}
        title="사진 수정"
        onClose={() => {
          setEditingImage(null);
          setImageForm(emptyImageForm);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setEditingImage(null);
                setImageForm(emptyImageForm);
              }}
            >
              취소
            </Button>
            <Button disabled={updateImageMutation.isPending} onClick={() => updateImageMutation.mutate()}>
              {updateImageMutation.isPending ? '수정 중...' : '수정하기'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <FormField label="제목">
            <Input value={imageForm.title} onChange={(event) => setImageForm((current) => ({ ...current, title: event.target.value }))} />
          </FormField>
          <FormField label="설명">
            <textarea
              value={imageForm.description}
              onChange={(event) => setImageForm((current) => ({ ...current, description: event.target.value }))}
              className="min-h-28 w-full resize-y rounded-2xl border border-slate-300/90 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#14323f] focus:ring-4 focus:ring-[#d8e5e9]"
            />
          </FormField>
          {updateImageMutation.isError ? <p className="text-sm font-semibold text-rose-600">{toApiMessage(updateImageMutation.error)}</p> : null}
        </div>
      </Modal>

      <Modal
        open={deletingImage !== null}
        title="사진 삭제"
        description={deletingImage ? `"${deletingImage.title || '제목 없는 사진'}" 사진을 삭제할까요?` : undefined}
        onClose={() => setDeletingImage(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeletingImage(null)}>
              취소
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              disabled={!deletingImage || deleteImageMutation.isPending}
              onClick={() => {
                if (deletingImage) {
                  deleteImageMutation.mutate(deletingImage.imageId);
                }
              }}
            >
              {deleteImageMutation.isPending ? '삭제 중...' : '삭제하기'}
            </Button>
          </div>
        }
      >
        {deleteImageMutation.isError ? <p className="text-sm font-semibold text-rose-600">{toApiMessage(deleteImageMutation.error)}</p> : null}
      </Modal>
    </section>
  );
}
