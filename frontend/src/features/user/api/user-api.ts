import { http } from '@shared/api/http';
import type { ApiResponse } from '@shared/types/api';
import type { User } from '@entities/user/model/user.types';

export interface UpdateProfilePayload {
  email?: string;
  cohort?: number;
  currentPassword?: string;
  password?: string;
}

const unwrap = async <T>(promise: Promise<{ data: ApiResponse<T> }>) => {
  const response = await promise;
  return response.data;
};

export const userApi = {
  getMe: () => unwrap<User>(http.get('/api/v1/users/me')),
  getAll: () => unwrap<User[]>(http.get('/api/v1/users')),
  updateMe: (payload: UpdateProfilePayload) => unwrap<User>(http.patch('/api/v1/users/me', payload)),
};
