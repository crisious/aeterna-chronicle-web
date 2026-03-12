/**
 * shared/types/api.ts — 공통 REST API 요청/응답 타입
 * P10-06: 서버 + 클라이언트 + 어드민 대시보드가 공통으로 사용하는 DTO
 */

// ─── 공통 페이지네이션 ──────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── 공통 API 응답 래퍼 ─────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── 헬스 체크 ──────────────────────────────────────────────

export interface HealthCheckResponse {
  status: 'ok';
  game: string;
  phase: number;
  apm?: Record<string, unknown>;
}
