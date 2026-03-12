/**
 * shared/types/admin.ts — 어드민 전용 DTO
 * P10-03 + P10-06: 서버 응답과 admin-dashboard 기대 필드를 일치시키는 공유 타입
 */

// ─── 유저 관리 DTO ──────────────────────────────────────────

/** 어드민 유저 목록 행 (서버 응답 + 클라이언트 기대 통합) */
export interface AdminUserRow {
  id: string;
  email: string;
  nickname: string;
  role: string;
  isBanned: boolean;
  bannedAt: string | null;
  banReason: string | null;
  level: number;
  lastLoginAt: string | null;
  createdAt: string;
}

/** 어드민 유저 목록 응답 */
export interface AdminUsersResponse {
  users: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** 어드민 유저 상세 응답 */
export interface AdminUserDetail extends AdminUserRow {
  updatedAt: string;
  characters: Array<{
    id: string;
    name: string;
    classId: string;
    level: number;
  }>;
}

// ─── 대시보드 통계 DTO ──────────────────────────────────────

export interface AdminStatsResponse {
  dau: number;
  mau: number;
  totalUsers: number;
  bannedUsers: number;
  monthlyRevenue: number;
  concurrentUsers: number;
  timestamp: string;
}

// ─── 서버 헬스 DTO ──────────────────────────────────────────

export interface AdminServerHealthResponse {
  status: string;
  uptime: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  system: {
    platform: string;
    cpus: number;
    loadAvg: number[];
    freeMem: number;
    totalMem: number;
  };
  db: string;
  timestamp: string;
}

// ─── 공지사항 DTO ───────────────────────────────────────────

export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  type: string;
  startAt: string | null;
  endAt: string | null;
  createdBy: string;
  createdAt: string;
}

// ─── 제재 DTO ───────────────────────────────────────────────

export interface AdminSanctionRow {
  id: string;
  type: string;
  reason: string;
  isActive: boolean;
  duration: number | null;
  expiresAt: string | null;
  createdAt: string;
}
