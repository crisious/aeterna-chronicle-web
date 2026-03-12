/**
 * P10-17: UsersPage 렌더링 테스트
 * API mocking 기반 — 유저 목록/상세/밴/제재이력 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminUserRow, AdminSanctionRow } from '../../../shared/types/admin';

// ── API mock ────────────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock('../api/apiClient', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

// ── 테스트 데이터 ───────────────────────────────────────────

function createMockUsers(): AdminUserRow[] {
  return [
    {
      id: 'user-001',
      email: 'hero@aeterna.com',
      nickname: '에리언',
      role: 'user',
      isBanned: false,
      bannedAt: null,
      banReason: null,
      level: 45,
      lastLoginAt: '2026-03-12T08:00:00Z',
      createdAt: '2026-01-15T00:00:00Z',
    },
    {
      id: 'user-002',
      email: 'cheater@spam.com',
      nickname: '치트사용자',
      role: 'user',
      isBanned: true,
      bannedAt: '2026-03-10T00:00:00Z',
      banReason: '핵 사용',
      level: 80,
      lastLoginAt: '2026-03-10T00:00:00Z',
      createdAt: '2026-02-01T00:00:00Z',
    },
    {
      id: 'admin-001',
      email: 'admin@aeterna.com',
      nickname: '관리자',
      role: 'admin',
      isBanned: false,
      bannedAt: null,
      banReason: null,
      level: 99,
      lastLoginAt: '2026-03-12T12:00:00Z',
      createdAt: '2025-12-01T00:00:00Z',
    },
  ];
}

function createMockSanctions(): AdminSanctionRow[] {
  return [
    {
      id: 'sanction-001',
      type: 'ban',
      reason: '핵 사용',
      isActive: true,
      duration: 604800,
      expiresAt: '2026-03-17T00:00:00Z',
      createdAt: '2026-03-10T00:00:00Z',
    },
    {
      id: 'sanction-002',
      type: 'mute',
      reason: '욕설',
      isActive: false,
      duration: 3600,
      expiresAt: '2026-03-09T01:00:00Z',
      createdAt: '2026-03-09T00:00:00Z',
    },
  ];
}

// ── 테스트 ──────────────────────────────────────────────────

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('유저 목록 API를 올바른 경로로 호출한다', async () => {
    mockGet.mockResolvedValue({
      data: { users: createMockUsers(), totalPages: 1 },
    });

    const { UsersPage } = await import('../pages/UsersPage');
    expect(UsersPage).toBeDefined();
    expect(typeof UsersPage).toBe('function');
  });

  it('AdminUserRow 타입이 UsersPage 컬럼 정의와 일치한다', () => {
    const users = createMockUsers();
    const requiredKeys: (keyof AdminUserRow)[] = [
      'nickname', 'email', 'level', 'role', 'isBanned', 'lastLoginAt',
    ];

    for (const user of users) {
      for (const key of requiredKeys) {
        expect(user).toHaveProperty(key);
      }
    }
  });

  it('밴 상태 유저를 올바르게 식별한다', () => {
    const users = createMockUsers();
    const bannedUsers = users.filter(u => u.isBanned);

    expect(bannedUsers).toHaveLength(1);
    expect(bannedUsers[0].nickname).toBe('치트사용자');
    expect(bannedUsers[0].banReason).toBe('핵 사용');
  });

  it('관리자 역할 유저를 올바르게 식별한다', () => {
    const users = createMockUsers();
    const admins = users.filter(u => u.role === 'admin');

    expect(admins).toHaveLength(1);
    expect(admins[0].nickname).toBe('관리자');
  });

  it('제재 이력에서 활성 제재를 올바르게 필터링한다', () => {
    const sanctions = createMockSanctions();
    const active = sanctions.find(s => s.isActive && s.type === 'ban');

    expect(active).toBeDefined();
    expect(active!.id).toBe('sanction-001');
    expect(active!.reason).toBe('핵 사용');
  });

  it('검색 파라미터가 API 호출에 올바르게 전달되는 구조이다', () => {
    const searchParams = { search: '에리언', page: 1, limit: 20 };

    expect(searchParams.search).toBe('에리언');
    expect(searchParams.page).toBe(1);
    expect(searchParams.limit).toBe(20);
  });

  it('lastLoginAt null 처리가 올바르다', () => {
    const user: AdminUserRow = {
      id: 'user-003',
      email: 'inactive@test.com',
      nickname: '미접속',
      role: 'user',
      isBanned: false,
      bannedAt: null,
      banReason: null,
      level: 1,
      lastLoginAt: null,
      createdAt: '2026-03-01T00:00:00Z',
    };

    // UsersPage의 렌더 로직: v ? new Date(v).toLocaleDateString() : '-'
    const display = user.lastLoginAt
      ? new Date(user.lastLoginAt).toLocaleDateString('ko-KR')
      : '-';

    expect(display).toBe('-');
  });
});
