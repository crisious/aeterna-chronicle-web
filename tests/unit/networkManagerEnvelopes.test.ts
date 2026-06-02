import { afterEach, describe, expect, test, vi } from 'vitest';

import { networkManager } from '../../client/src/network/NetworkManager';

/**
 * 회귀 가드 — 클라↔서버 응답 봉투 미해제 버그.
 *
 * 서버는 일부 라우트를 봉투로 감싼다:
 *  - GET /api/world/zones → { ok, zones }
 *  - GET /api/quests      → { quests, pagination }
 * 봉투를 풀지 않으면 getZones/getQuests 가 배열이 아닌 객체를 반환해
 * 호출부의 .find()/.map() 이 깨지거나(월드맵 크래시) 항상 빈 목록(퀘스트 공백)이 된다.
 */
describe('NetworkManager — 서버 응답 봉투 언래핑', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const mockJson = (body: unknown) => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as unknown as Response)));
  };

  test('getZones: { ok, zones } 봉투에서 zones 배열 추출', async () => {
    mockJson({ ok: true, zones: [{ id: 'z1' }, { id: 'z2' }] });
    const zones = await networkManager.getZones();
    expect(Array.isArray(zones)).toBe(true);
    expect(zones).toHaveLength(2);
  });

  test('getZones: zones 누락 봉투에도 빈 배열(크래시 금지)', async () => {
    mockJson({ ok: true });
    const zones = await networkManager.getZones();
    expect(zones).toEqual([]);
  });

  test('getQuests: { quests, pagination } 봉투에서 quests 배열 추출', async () => {
    mockJson({ quests: [{ id: 'q1' }, { id: 'q2' }], pagination: { page: 1 } });
    const quests = await networkManager.getQuests('char-1');
    expect(Array.isArray(quests)).toBe(true);
    expect(quests).toHaveLength(2);
  });

  test('getQuests: quests 누락 봉투에도 빈 배열', async () => {
    mockJson({ pagination: { page: 1 } });
    const quests = await networkManager.getQuests('char-1');
    expect(quests).toEqual([]);
  });
});
