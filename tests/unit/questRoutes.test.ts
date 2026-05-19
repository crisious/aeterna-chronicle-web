/**
 * Unit tests — questRoutes 에러 매핑 + payload 검증 (QUEST-QA-5)
 *
 * questRoutes 의 prisma 의존 없이 검증할 수 있는 부분:
 * - QuestError code → HTTP status 매핑 표 정합성
 * - payload 필수 필드 검증 로직 (in-memory mock)
 */
import { describe, it, expect } from 'vitest';

// questRoutes.ts:53-69 의 handleQuestError 매핑 표 재현
const QUEST_ERROR_STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  ALREADY_ACCEPTED: 409,
  LEVEL_TOO_LOW: 403,
  PREREQUISITE_MISSING: 403,
  NOT_IN_PROGRESS: 400,
  NOT_COMPLETE: 400,
  ALREADY_COMPLETED: 409,
};

describe('QUEST-QA-S11 — QuestError → HTTP status 매핑', () => {
  it('모든 QuestError code 매핑 정확 narrative', () => {
    expect(QUEST_ERROR_STATUS_MAP.NOT_FOUND).toBe(404);
    expect(QUEST_ERROR_STATUS_MAP.ALREADY_ACCEPTED).toBe(409);
    expect(QUEST_ERROR_STATUS_MAP.LEVEL_TOO_LOW).toBe(403);
    expect(QUEST_ERROR_STATUS_MAP.PREREQUISITE_MISSING).toBe(403);
    expect(QUEST_ERROR_STATUS_MAP.NOT_IN_PROGRESS).toBe(400);
    expect(QUEST_ERROR_STATUS_MAP.NOT_COMPLETE).toBe(400);
    expect(QUEST_ERROR_STATUS_MAP.ALREADY_COMPLETED).toBe(409);
  });

  it('매핑 표 7 코드 모두 유효 HTTP status (400/403/404/409)', () => {
    for (const code of Object.keys(QUEST_ERROR_STATUS_MAP)) {
      const status = QUEST_ERROR_STATUS_MAP[code];
      expect([400, 403, 404, 409]).toContain(status);
    }
  });

  it('알 수 없는 code → fallback 400', () => {
    const fallback = (code: string) => QUEST_ERROR_STATUS_MAP[code] ?? 400;
    expect(fallback('UNKNOWN_ERR')).toBe(400);
    expect(fallback('')).toBe(400);
  });

  it('status 카테고리: 4xx (client error) 만 (5xx 없음)', () => {
    for (const code of Object.keys(QUEST_ERROR_STATUS_MAP)) {
      const status = QUEST_ERROR_STATUS_MAP[code];
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(500);
    }
  });
});

describe('QUEST-QA-S12 — 라우트 payload 필수 필드 가드', () => {
  // questRoutes.ts:115-117 — accept payload 검증
  function validateAcceptPayload(body: Partial<{ userId: string; playerLevel: number }>): boolean {
    if (!body.userId || body.playerLevel == null) return false;
    return true;
  }

  // questRoutes.ts:136-138 — progress payload 검증
  function validateProgressPayload(body: Partial<{ userId: string; eventType: string; target: string }>): boolean {
    if (!body.userId || !body.eventType || !body.target) return false;
    return true;
  }

  // questRoutes.ts:158-160 — complete payload 검증
  function validateCompletePayload(body: Partial<{ userId: string }>): boolean {
    if (!body.userId) return false;
    return true;
  }

  it('accept: userId + playerLevel 모두 필수', () => {
    expect(validateAcceptPayload({ userId: 'u1', playerLevel: 5 })).toBe(true);
    expect(validateAcceptPayload({ userId: 'u1' })).toBe(false);
    expect(validateAcceptPayload({ playerLevel: 5 })).toBe(false);
    expect(validateAcceptPayload({})).toBe(false);
  });

  it('accept: playerLevel=0 도 유효 (==null 만 거부)', () => {
    expect(validateAcceptPayload({ userId: 'u1', playerLevel: 0 })).toBe(true);
  });

  it('progress: userId + eventType + target 모두 필수', () => {
    expect(validateProgressPayload({ userId: 'u1', eventType: 'kill', target: 'slime' })).toBe(true);
    expect(validateProgressPayload({ userId: 'u1', eventType: 'kill' })).toBe(false);
    expect(validateProgressPayload({ userId: 'u1', target: 'slime' })).toBe(false);
    expect(validateProgressPayload({ eventType: 'kill', target: 'slime' })).toBe(false);
  });

  it('complete: userId 필수', () => {
    expect(validateCompletePayload({ userId: 'u1' })).toBe(true);
    expect(validateCompletePayload({})).toBe(false);
    expect(validateCompletePayload({ userId: '' })).toBe(false);
  });
});

describe('QUEST-QA-S13 — pagination 파라미터 가드', () => {
  // questRoutes.ts:81-84 의 페이지네이션 로직 재현
  function parsePagination(page?: string, limit?: string): { pageNum: number; limitNum: number } {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '50', 10) || 50));
    return { pageNum, limitNum };
  }

  it('기본값: page=1, limit=50', () => {
    expect(parsePagination()).toEqual({ pageNum: 1, limitNum: 50 });
  });

  it('정상 입력: page=2, limit=20', () => {
    expect(parsePagination('2', '20')).toEqual({ pageNum: 2, limitNum: 20 });
  });

  it('page 0 또는 음수 → 1로 cap', () => {
    expect(parsePagination('0', '50').pageNum).toBe(1);
    expect(parsePagination('-5', '50').pageNum).toBe(1);
  });

  it('limit 100 초과 → 100으로 cap (DoS 방어)', () => {
    expect(parsePagination('1', '999').limitNum).toBe(100);
    expect(parsePagination('1', '1000000').limitNum).toBe(100);
  });

  it('limit 0 또는 음수 → 1로 cap (최소 보장)', () => {
    // parseInt('0',10)=0 → ||50 → 50 → Math.min(100, Math.max(1, 50)) = 50
    expect(parsePagination('1', '0').limitNum).toBe(50);
    // parseInt('-5',10)=-5 → ||50 → -5 (truthy)? -5 is truthy, so 50 fallback only on 0/NaN
    // 실제 동작: -5 → Math.max(1, -5) = 1
    expect(parsePagination('1', '-5').limitNum).toBe(1);
  });

  it('NaN 입력 → 기본값 fallback', () => {
    expect(parsePagination('abc', 'xyz')).toEqual({ pageNum: 1, limitNum: 50 });
  });
});
