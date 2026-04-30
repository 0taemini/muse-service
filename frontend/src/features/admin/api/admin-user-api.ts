import { http } from '@shared/api/http';
import type { ApiResponse } from '@shared/types/api';
import type { User, UserRole, UserStatus } from '@entities/user/model/user.types';

export type AllUserStatus = 'ACTIVE' | 'DELETED';

export interface AllUser {
  allUserId: number;
  name: string;
  cohort: number;
  email: string | null;
  phone: string | null;
  status: AllUserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertAllUserPayload {
  name: string;
  cohort: number;
  email?: string;
  phone?: string;
}

const unwrap = async <T>(promise: Promise<{ data: ApiResponse<T> }>) => {
  const response = await promise;
  return response.data;
};

export const adminUserApi = {
  getUsers: () => unwrap<User[]>(http.get('/api/v1/admin/users')),
  updateStatus: (userId: number, status: UserStatus) =>
    unwrap<User>(http.patch(`/api/v1/admin/users/${userId}/status`, { status })),
  updateRole: (userId: number, role: UserRole) =>
    unwrap<User>(http.patch(`/api/v1/admin/users/${userId}/role`, { role })),
  deleteUser: (userId: number) => unwrap<void>(http.delete(`/api/v1/admin/users/${userId}`)),
  getAllUsers: () => unwrap<AllUser[]>(http.get('/api/v1/admin/all-users')),
  createAllUser: (payload: UpsertAllUserPayload) => unwrap<AllUser>(http.post('/api/v1/admin/all-users', payload)),
  updateAllUser: (allUserId: number, payload: UpsertAllUserPayload) =>
    unwrap<AllUser>(http.patch(`/api/v1/admin/all-users/${allUserId}`, payload)),
  updateAllUserStatus: (allUserId: number, status: AllUserStatus) =>
    unwrap<AllUser>(http.patch(`/api/v1/admin/all-users/${allUserId}/status`, { status })),
  deleteAllUser: (allUserId: number) => unwrap<void>(http.delete(`/api/v1/admin/all-users/${allUserId}`)),
};
