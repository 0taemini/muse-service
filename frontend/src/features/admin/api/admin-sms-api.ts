import { http } from '@shared/api/http';
import type { ApiResponse } from '@shared/types/api';

export interface BulkSmsSendPayload {
  cohorts: number[];
  allUserIds: number[];
  message: string;
}

export interface BulkSmsSendResponse {
  recipientCount: number;
}

export const adminSmsApi = {
  send: async (payload: BulkSmsSendPayload) => {
    const response = await http.post<ApiResponse<BulkSmsSendResponse>>('/api/v1/admin/sms', payload);
    return response.data;
  },
};