import { http } from '@shared/api/http';
import type { ApiResponse } from '@shared/types/api';

export type ImageType = 'POSTER' | 'MEMORY' | 'ALBUM';
export type ImageStatus = 'PROCESSING' | 'READY' | 'FAILED';
export type AlbumCategory = 'PERFORMANCE' | 'ACTIVITY' | 'ETC';
export type VariantType = 'THUMB_320' | 'THUMB_480' | 'DETAIL_1200' | 'POSTER_1600';

export interface ImageVariant {
  variantType: VariantType;
  s3Key: string;
  url: string;
  width: number | null;
  height: number | null;
  contentType: string;
}

export interface PhotoImage {
  imageId: number;
  imageType: ImageType;
  albumId: number | null;
  title: string | null;
  description: string | null;
  imageDate: string | null;
  displayOrder: number;
  status: ImageStatus;
  originalKey: string;
  createdByUserId: number;
  createdByNickname: string;
  createdAt: string;
  updatedAt: string;
  variants: ImageVariant[];
}

export interface PhotoAlbum {
  albumId: number;
  albumCategory: AlbumCategory;
  title: string;
  description: string | null;
  displayOrder: number;
  createdByUserId: number;
  createdByNickname: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoAlbumDetail {
  album: PhotoAlbum;
  images: PhotoImage[];
}

export interface PhotoAlbumPayload {
  albumCategory: AlbumCategory;
  title: string;
  description: string | null;
  displayOrder: number | null;
}

export interface ImageUploadPayload {
  imageType: ImageType;
  albumId: number | null;
  title: string | null;
  description: string | null;
  imageDate: string | null;
  displayOrder: number | null;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
}

export interface ImageUploadResponse {
  imageId: number;
  uploadUrl: string;
  originalKey: string;
  expiresAt: string;
}

export interface ImageUpdatePayload {
  title: string | null;
  description: string | null;
  imageDate: string | null;
  displayOrder: number | null;
}

export const photoApi = {
  async getAlbums(category?: AlbumCategory) {
    const response = await http.get<ApiResponse<PhotoAlbum[]>>('/api/v1/photo-albums', {
      params: category ? { category } : undefined,
    });
    return response.data;
  },

  async getAlbum(albumId: number) {
    const response = await http.get<ApiResponse<PhotoAlbumDetail>>(`/api/v1/photo-albums/${albumId}`);
    return response.data;
  },

  async createAlbum(payload: PhotoAlbumPayload) {
    const response = await http.post<ApiResponse<PhotoAlbum>>('/api/v1/photo-albums', payload);
    return response.data;
  },

  async updateAlbum(albumId: number, payload: PhotoAlbumPayload) {
    const response = await http.patch<ApiResponse<PhotoAlbum>>(`/api/v1/photo-albums/${albumId}`, payload);
    return response.data;
  },

  async getImages(type: ImageType) {
    const response = await http.get<ApiResponse<PhotoImage[]>>('/api/v1/images', { params: { type } });
    return response.data;
  },

  async updateImage(imageId: number, payload: ImageUpdatePayload) {
    const response = await http.patch<ApiResponse<PhotoImage>>(`/api/v1/images/${imageId}`, payload);
    return response.data;
  },

  async deleteImage(imageId: number) {
    const response = await http.delete<ApiResponse<null>>(`/api/v1/images/${imageId}`);
    return response.data;
  },

  async createUpload(payload: ImageUploadPayload) {
    const response = await http.post<ApiResponse<ImageUploadResponse>>('/api/v1/images/upload-requests', payload);
    return response.data;
  },

  async getMemories(params: { date?: string; startDate?: string; endDate?: string }) {
    const response = await http.get<ApiResponse<PhotoImage[]>>('/api/v1/images/memories', { params });
    return response.data;
  },

  async uploadFileToS3(uploadUrl: string, file: File) {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error('S3 업로드에 실패했습니다.');
    }
  },
};

export function variantUrl(image: PhotoImage, preferred: VariantType[]) {
  for (const type of preferred) {
    const variant = image.variants.find((item) => item.variantType === type);
    if (variant?.url) {
      return variant.url;
    }
  }

  return image.variants[0]?.url ?? '';
}
