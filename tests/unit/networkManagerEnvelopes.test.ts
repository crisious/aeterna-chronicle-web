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

  test('getInventory: 서버 중첩({...slot, item:{name,grade}})을 평탄 InventoryItem 으로 정규화(rarity←grade)', async () => {
    mockJson({ success: true, data: [{ id: 's1', itemId: 'i1', quantity: 3, item: { name: '수련용 장검', type: 'weapon', grade: 'rare', stats: { attack: 10 } } }] });
    const inv = await networkManager.getInventory('char-1');
    expect(inv).toHaveLength(1);
    expect(inv[0].name).toBe('수련용 장검');
    expect(inv[0].rarity).toBe('rare');
    expect(inv[0].type).toBe('weapon');
    expect(inv[0].quantity).toBe(3);
    // rarity 는 항상 string → InventoryUI 의 .toUpperCase() 크래시 방지
    expect(typeof inv[0].rarity).toBe('string');
    expect(() => inv[0].rarity.toUpperCase()).not.toThrow();
  });

  test('getInventory: item 이 null 이어도 rarity 는 기본값 string(크래시 금지)', async () => {
    mockJson({ success: true, data: [{ id: 's2', itemId: 'i2', quantity: 1, item: null }] });
    const inv = await networkManager.getInventory('char-1');
    expect(inv[0].rarity).toBe('common');
    expect(() => inv[0].rarity.toUpperCase()).not.toThrow();
  });

  test('acceptQuest: 서버 필수값 playerLevel 을 요청 본문에 포함해 전송', async () => {
    const fetchMock = vi.fn(async () => ({
      status: 201,
      ok: true,
      json: async () => ({ id: 'quest-1' }),
      text: async () => '{}',
    } as unknown as Response));
    vi.stubGlobal('fetch', fetchMock);
    await networkManager.acceptQuest('quest-1', 7);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.playerLevel).toBe(7);
  });

  test('setActiveCharacter/activeCharacterId: 세션 활성 캐릭터 id 보관', () => {
    networkManager.setActiveCharacter('char-xyz');
    expect(networkManager.activeCharacterId).toBe('char-xyz');
    networkManager.setActiveCharacter(null);
    expect(networkManager.activeCharacterId).toBeNull();
  });

  test('combatStart: 서버 계약(partyCharacterIds 배열 + zoneId)으로 전송 (단수 characterId/monsterId 아님)', async () => {
    const fetchMock = vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({ success: true, combatId: 'x' }),
      text: async () => '{}',
    } as unknown as Response));
    vi.stubGlobal('fetch', fetchMock);
    await networkManager.combatStart({ partyCharacterIds: ['c1'], zoneId: 'erebos_outskirts', eraId: 'present' });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(Array.isArray(body.partyCharacterIds)).toBe(true);
    expect(body.partyCharacterIds).toEqual(['c1']);
    expect(body.zoneId).toBe('erebos_outskirts');
    // 구 계약의 단수 필드를 보내지 않는다(서버가 무시해 항상 400 나던 원인)
    expect(body.characterId).toBeUndefined();
    expect(body.monsterId).toBeUndefined();
  });

  test('combatEnd: 서버 end 응답 형태({success, combatId, statistics}) 그대로 반환 (CombatResult 아님)', async () => {
    mockJson({ success: true, combatId: 'cb-1', statistics: { totalTicks: 12, totalDamage: 340 } });
    const res = await networkManager.combatEnd('cb-1');
    expect(res.success).toBe(true);
    expect(res.combatId).toBe('cb-1');
    expect(res.statistics).toEqual({ totalTicks: 12, totalDamage: 340 });
  });
});
