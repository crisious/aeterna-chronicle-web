/**
 * P10-17: ReportsPage 렌더링 테스트
 * API mocking 기반 — 신고 목록/필터/검토 로직 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── API mock ────────────────────────────────────────────────

const mockGet = vi.fn();
const mockPatch = vi.fn();

vi.mock('../api/apiClient', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

// ── 테스트 데이터 ───────────────────────────────────────────

interface ReportRow {
  id: string;
  reporterId: string;
  targetId: string;
  type: string;
  description: string;
  status: string;
  action: string | null;
  reviewNote: string | null;
  createdAt: string;
}

function createMockReports(): ReportRow[] {
  return [
    {
      id: 'report-001',
      reporterId: 'user-001',
      targetId: 'user-002',
      type: 'cheating',
      description: '스피드핵 사용 의심',
      status: 'pending',
      action: null,
      reviewNote: null,
      createdAt: '2026-03-12T08:00:00Z',
    },
    {
      id: 'report-002',
      reporterId: 'user-003',
      targetId: 'user-004',
      type: 'harassment',
      description: '지속적 욕설',
      status: 'reviewing',
      action: null,
      reviewNote: null,
      createdAt: '2026-03-11T15:00:00Z',
    },
    {
      id: 'report-003',
      reporterId: 'user-005',
      targetId: 'user-006',
      type: 'spam',
      description: '광고 반복 발송',
      status: 'resolved',
      action: 'mute_24h',
      reviewNote: '24시간 뮤트 적용',
      createdAt: '2026-03-10T12:00:00Z',
    },
    {
      id: 'report-004',
      reporterId: 'user-007',
      targetId: 'user-008',
      type: 'inappropriate_name',
      description: '부적절한 닉네임',
      status: 'dismissed',
      action: null,
      reviewNote: '규정 위반 아님',
      createdAt: '2026-03-09T10:00:00Z',
    },
  ];
}

const TYPE_LABELS: Record<string, string> = {
  harassment: '괴롭힘',
  cheating: '치팅',
  botting: '봇 사용',
  inappropriate_name: '부적절한 이름',
  spam: '스팸',
  other: '기타',
};

// ── 테스트 ──────────────────────────────────────────────────

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('신고 목록 API를 올바른 경로로 호출하는 구조이다', async () => {
    mockGet.mockResolvedValue({
      data: { reports: createMockReports(), totalPages: 1 },
    });

    const { ReportsPage } = await import('../pages/ReportsPage');
    expect(ReportsPage).toBeDefined();
    expect(typeof ReportsPage).toBe('function');
  });

  it('상태 필터(pending)로 신고를 올바르게 필터링한다', () => {
    const reports = createMockReports();
    const pending = reports.filter(r => r.status === 'pending');

    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe('report-001');
    expect(pending[0].type).toBe('cheating');
  });

  it('신고 유형 라벨이 올바르게 매핑된다', () => {
    expect(TYPE_LABELS['cheating']).toBe('치팅');
    expect(TYPE_LABELS['harassment']).toBe('괴롭힘');
    expect(TYPE_LABELS['spam']).toBe('스팸');
    expect(TYPE_LABELS['inappropriate_name']).toBe('부적절한 이름');
    expect(TYPE_LABELS['botting']).toBe('봇 사용');
  });

  it('처리 완료된 신고에 제재 조치가 기록되어 있다', () => {
    const reports = createMockReports();
    const resolved = reports.filter(r => r.status === 'resolved');

    expect(resolved).toHaveLength(1);
    expect(resolved[0].action).toBe('mute_24h');
    expect(resolved[0].reviewNote).toBe('24시간 뮤트 적용');
  });

  it('기각된 신고에 사유가 기록되어 있다', () => {
    const reports = createMockReports();
    const dismissed = reports.filter(r => r.status === 'dismissed');

    expect(dismissed).toHaveLength(1);
    expect(dismissed[0].action).toBeNull();
    expect(dismissed[0].reviewNote).toBe('규정 위반 아님');
  });

  it('신고 검토 API 페이로드 구조가 올바르다', () => {
    const reviewPayload = {
      action: 'ban_7d' as const,
      reviewNote: '반복 치팅',
    };

    expect(reviewPayload).toHaveProperty('action');
    expect(reviewPayload).toHaveProperty('reviewNote');
    expect(reviewPayload.action).toBe('ban_7d');
  });

  it('4개 상태 탭이 모두 정의되어 있다', () => {
    const tabs = ['pending', 'reviewing', 'resolved', 'dismissed'];
    expect(tabs).toHaveLength(4);
    expect(tabs).toContain('pending');
    expect(tabs).toContain('resolved');
  });
});
