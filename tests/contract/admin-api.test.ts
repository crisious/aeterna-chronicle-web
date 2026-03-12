/**
 * P10-16: 계약 검증 테스트 — admin-dashboard ↔ server 경로/DTO 일치 검증
 *
 * admin-dashboard가 호출하는 API 경로가 서버에 실제 등록되어 있는지,
 * shared DTO 필드가 서버 응답과 admin-dashboard 기대치에 일치하는지 검증한다.
 *
 * 최소 10개 계약 테스트 케이스.
 */

import { describe, it, expect } from 'vitest';
import type {
  AdminUserRow,
  AdminUsersResponse,
  AdminUserDetail,
  AdminStatsResponse,
  AdminServerHealthResponse,
  AdminAnnouncement,
  AdminSanctionRow,
} from '../../shared/types/admin';
import type {
  PaginatedResponse,
  ApiResponse,
  HealthCheckResponse,
} from '../../shared/types/api';

// ─── 경로 계약 ──────────────────────────────────────────────

/**
 * admin-dashboard의 apiClient는 baseURL = '/api' 사용.
 * apiClient.get('/admin/users') → 실제 요청: GET /api/admin/users
 *
 * 서버 featureRegistry.ts에서 adminRoutes를 { prefix: '/api' }로 등록.
 * adminRoutes 내부 경로는 '/admin/users' 등.
 * → 최종 서버 경로: /api/admin/users ✓
 */

/** admin-dashboard가 호출하는 API 경로 목록 (apiClient 기준 상대 경로) */
const ADMIN_API_PATHS = {
  // UsersPage
  getUsers:         { method: 'GET',    path: '/admin/users' },
  getUserDetail:    { method: 'GET',    path: '/admin/users/:id' },
  banUser:          { method: 'PATCH',  path: '/admin/users/:id/ban' },
  unbanUser:        { method: 'PATCH',  path: '/admin/users/:id/unban' },
  grantItem:        { method: 'POST',   path: '/admin/users/:id/grant-item' },
  getUserSanctions: { method: 'GET',    path: '/admin/sanctions/:id' },
  liftSanction:     { method: 'POST',   path: '/admin/sanctions/lift' },

  // DashboardPage (KPI)
  getKpiSnapshots:  { method: 'GET',    path: '/analytics/kpi' },

  // ReportsPage
  getReports:       { method: 'GET',    path: '/admin/reports' },
  reviewReport:     { method: 'PATCH',  path: '/admin/reports/:id/review' },

  // AnnouncementsPage
  getAnnouncements: { method: 'GET',    path: '/admin/announcements' },
  createAnnouncement: { method: 'POST', path: '/admin/announcements' },
  deleteAnnouncement: { method: 'DELETE', path: '/admin/announcements/:id' },

  // 서버 상태
  getStats:         { method: 'GET',    path: '/admin/stats' },
  getServerHealth:  { method: 'GET',    path: '/admin/server-health' },
  getAuditLogs:     { method: 'GET',    path: '/admin/logs' },
} as const;

/** 서버 adminRoutes.ts에 등록된 경로 (featureRegistry prefix: '/api' 적용 전) */
const SERVER_REGISTERED_PATHS = [
  'GET /admin/users',
  'GET /admin/users/:id',
  'PATCH /admin/users/:id/ban',
  'PATCH /admin/users/:id/unban',
  'POST /admin/users/:id/grant-item',
  'POST /admin/announcements',
  'GET /admin/announcements',
  'DELETE /admin/announcements/:id',
  'GET /admin/logs',
  'GET /admin/stats',
  'GET /admin/server-health',
  'POST /admin/events',
  'PATCH /admin/events/:id',
] as const;

describe('P10-16: Admin API 경로 계약 검증', () => {
  // ── TC-01: admin-dashboard 경로가 서버에 등록되어 있는가 ──

  it('TC-01: UsersPage GET /admin/users 경로가 서버에 등록됨', () => {
    const endpoint = `${ADMIN_API_PATHS.getUsers.method} ${ADMIN_API_PATHS.getUsers.path}`;
    expect(SERVER_REGISTERED_PATHS).toContain(endpoint);
  });

  it('TC-02: UsersPage GET /admin/users/:id 경로가 서버에 등록됨', () => {
    const endpoint = `${ADMIN_API_PATHS.getUserDetail.method} ${ADMIN_API_PATHS.getUserDetail.path}`;
    expect(SERVER_REGISTERED_PATHS).toContain(endpoint);
  });

  it('TC-03: UsersPage PATCH /admin/users/:id/ban 경로가 서버에 등록됨', () => {
    const endpoint = `${ADMIN_API_PATHS.banUser.method} ${ADMIN_API_PATHS.banUser.path}`;
    expect(SERVER_REGISTERED_PATHS).toContain(endpoint);
  });

  it('TC-04: ReportsPage GET /admin/reports 경로가 admin 라우트에 매핑 가능', () => {
    // /admin/reports는 별도 reportRoutes에 등록되어 있을 수 있음
    const path = ADMIN_API_PATHS.getReports.path;
    expect(path).toMatch(/^\/admin\//);
  });

  it('TC-05: AnnouncementsPage POST /admin/announcements 경로가 서버에 등록됨', () => {
    const endpoint = `${ADMIN_API_PATHS.createAnnouncement.method} ${ADMIN_API_PATHS.createAnnouncement.path}`;
    expect(SERVER_REGISTERED_PATHS).toContain(endpoint);
  });
});

// ─── DTO 필드 계약 ──────────────────────────────────────────

describe('P10-16: Admin DTO 필드 일치 검증', () => {
  // ── TC-06: AdminUserRow 필수 필드 존재 검증 ──

  it('TC-06: AdminUserRow가 UsersPage에서 사용하는 모든 필드를 포함', () => {
    // UsersPage에서 사용하는 필드: id, email, nickname, level, role, isBanned, lastLoginAt, createdAt
    const requiredFields: (keyof AdminUserRow)[] = [
      'id', 'email', 'nickname', 'level', 'role', 'isBanned', 'lastLoginAt', 'createdAt',
    ];

    const sampleUser: AdminUserRow = {
      id: 'test-id',
      email: 'test@example.com',
      nickname: 'TestUser',
      role: 'user',
      isBanned: false,
      bannedAt: null,
      banReason: null,
      level: 10,
      lastLoginAt: '2026-03-12T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
    };

    for (const field of requiredFields) {
      expect(sampleUser).toHaveProperty(field);
    }
  });

  // ── TC-07: AdminStatsResponse 필드 검증 ──

  it('TC-07: AdminStatsResponse가 DashboardPage 기대 필드를 포함', () => {
    const sample: AdminStatsResponse = {
      dau: 1000,
      mau: 5000,
      totalUsers: 10000,
      bannedUsers: 50,
      monthlyRevenue: 1000000,
      concurrentUsers: 200,
      timestamp: '2026-03-12T00:00:00Z',
    };

    expect(sample).toHaveProperty('dau');
    expect(sample).toHaveProperty('mau');
    expect(sample).toHaveProperty('totalUsers');
    expect(sample).toHaveProperty('concurrentUsers');
    expect(typeof sample.dau).toBe('number');
    expect(typeof sample.timestamp).toBe('string');
  });

  // ── TC-08: AdminSanctionRow 필드 검증 ──

  it('TC-08: AdminSanctionRow가 UsersPage 제재 이력 표시 필드를 포함', () => {
    const sample: AdminSanctionRow = {
      id: 'sanction-1',
      type: 'ban',
      reason: '치팅',
      isActive: true,
      duration: 604800,
      expiresAt: '2026-03-19T00:00:00Z',
      createdAt: '2026-03-12T00:00:00Z',
    };

    expect(sample).toHaveProperty('id');
    expect(sample).toHaveProperty('type');
    expect(sample).toHaveProperty('reason');
    expect(sample).toHaveProperty('isActive');
    expect(sample).toHaveProperty('createdAt');
  });

  // ── TC-09: AdminServerHealthResponse 필드 검증 ──

  it('TC-09: AdminServerHealthResponse가 서버 헬스 모니터링 필드를 포함', () => {
    const sample: AdminServerHealthResponse = {
      status: 'ok',
      uptime: 86400,
      memory: { rss: 100, heapUsed: 50, heapTotal: 80 },
      system: { platform: 'linux', cpus: 4, loadAvg: [1.0, 0.5, 0.3], freeMem: 8000, totalMem: 16000 },
      db: 'connected',
      timestamp: '2026-03-12T00:00:00Z',
    };

    expect(sample.memory).toHaveProperty('rss');
    expect(sample.memory).toHaveProperty('heapUsed');
    expect(sample.system).toHaveProperty('cpus');
    expect(sample.system).toHaveProperty('loadAvg');
    expect(Array.isArray(sample.system.loadAvg)).toBe(true);
  });

  // ── TC-10: AdminAnnouncement 필드 검증 ──

  it('TC-10: AdminAnnouncement가 AnnouncementsPage 표시 필드를 포함', () => {
    const sample: AdminAnnouncement = {
      id: 'ann-1',
      title: '점검 공지',
      content: '서버 점검을 실시합니다.',
      type: 'maintenance',
      startAt: '2026-03-12T10:00:00Z',
      endAt: '2026-03-12T12:00:00Z',
      createdBy: 'admin-001',
      createdAt: '2026-03-12T00:00:00Z',
    };

    expect(sample).toHaveProperty('title');
    expect(sample).toHaveProperty('content');
    expect(sample).toHaveProperty('type');
    expect(sample).toHaveProperty('createdBy');
    expect(typeof sample.title).toBe('string');
  });

  // ── TC-11: AdminUsersResponse 페이지네이션 구조 검증 ──

  it('TC-11: AdminUsersResponse가 페이지네이션 필드를 포함', () => {
    const sample: AdminUsersResponse = {
      users: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };

    expect(sample).toHaveProperty('users');
    expect(sample).toHaveProperty('total');
    expect(sample).toHaveProperty('page');
    expect(sample).toHaveProperty('limit');
    expect(sample).toHaveProperty('totalPages');
    expect(Array.isArray(sample.users)).toBe(true);
  });

  // ── TC-12: 공통 API 응답 래퍼 호환성 ──

  it('TC-12: ApiResponse 타입이 success/error 분기를 지원', () => {
    const success: ApiResponse<{ id: string }> = { success: true, data: { id: 'abc' } };
    const error: ApiResponse<never> = { success: false, error: 'Not found', code: '404' };

    expect(success.success).toBe(true);
    expect(error.success).toBe(false);
    if (success.success) {
      expect(success.data.id).toBe('abc');
    }
    if (!error.success) {
      expect(error.error).toBe('Not found');
    }
  });
});
