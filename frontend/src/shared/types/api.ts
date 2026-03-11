export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  path: string;
  timestamp: string;
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  path: string;
  validationErrors?: Record<string, string> | null;
}