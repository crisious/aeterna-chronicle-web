/**
 * P28-09: E2E 플레이테스트 — 소셜 시스템
 * P28-12: E2E 테스트 — 챕터 5~8 + 소셜
 *
 * 테스트:
 * 1. 파티 생성 + 초대 + 수락
 * 2. 파티 전투
 * 3. 거래 (1:1)
 * 4. 경매장 등록/입찰/낙찰
 * 5. 길드 생성/가입/탈퇴
 * 6. 채팅 메시지 송수신
 * 7. 친구 추가/삭제
 * 8. 우편 송수신
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_BASE = process.env.TEST_API_URL || 'http://localhost:3000/api';

async function api(method: string, path: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json() };
}

// ─── 유틸: 테스트 유저 생성 ──────────────────────────────────────

async function createTestUser(suffix: string) {
  const username = `social_test_${suffix}_${Date.now()}`;
  const reg = await api('POST', '/auth/register', { username, password: 'Test1234!', email: `${username}@test.com` });
  const char = await api('POST', '/character/create', { name: `Char_${suffix}`, classId: 'ether_knight' }, reg.data.token);
  return { token: reg.data.token, characterId: char.data.characterId, username };
}

// ─── 테스트 ──────────────────────────────────────────────────────

describe('E2E: 소셜 시스템 (P28-09)', () => {
  let userA: { token: string; characterId: string; username: string };
  let userB: { token: string; characterId: string; username: string };

  beforeAll(async () => {
    userA = await createTestUser('a');
    userB = await createTestUser('b');
  });

  afterAll(async () => {
    await api('DELETE', '/auth/account', undefined, userA.token);
    await api('DELETE', '/auth/account', undefined, userB.token);
  });

  // ── 1. 파티 ─────────────────────────────────────────────────

  it('파티 생성 + 초대 + 수락', async () => {
    const create = await api('POST', '/party/create', { characterId: userA.characterId, name: 'TestParty' }, userA.token);
    expect(create.status).toBe(201);
    const partyId = create.data.partyId;

    const invite = await api('POST', '/party/invite', { partyId, targetCharacterId: userB.characterId }, userA.token);
    expect(invite.status).toBe(200);

    const accept = await api('POST', '/party/accept', { partyId, characterId: userB.characterId }, userB.token);
    expect(accept.status).toBe(200);

    const info = await api('GET', `/party/${partyId}`, undefined, userA.token);
    expect(info.data.members.length).toBe(2);
  });

  // ── 2. 파티 전투 ────────────────────────────────────────────

  it('파티 전투 수행', async () => {
    const battle = await api('POST', '/combat/start', {
      characterId: userA.characterId,
      encounterId: 'party_test_encounter',
      partyMode: true,
    }, userA.token);

    expect([200, 201]).toContain(battle.status);
    if (battle.data.battleId) {
      const resolve = await api('POST', '/combat/auto-resolve', {
        characterId: userA.characterId,
        battleId: battle.data.battleId,
      }, userA.token);
      expect([200, 201]).toContain(resolve.status);
    }
  });

  // ── 3. 거래 ─────────────────────────────────────────────────

  it('1:1 거래 요청 + 수락', async () => {
    const req = await api('POST', '/trade/request', {
      fromCharacterId: userA.characterId,
      toCharacterId: userB.characterId,
    }, userA.token);
    expect([200, 201]).toContain(req.status);

    if (req.data.tradeId) {
      const accept = await api('POST', '/trade/accept', { tradeId: req.data.tradeId }, userB.token);
      expect([200, 201]).toContain(accept.status);

      // 골드 제안
      const offer = await api('POST', '/trade/offer', {
        tradeId: req.data.tradeId,
        characterId: userA.characterId,
        gold: 10,
      }, userA.token);
      expect(offer.status).toBe(200);

      // 확정
      const confirm = await api('POST', '/trade/confirm', { tradeId: req.data.tradeId, characterId: userA.characterId }, userA.token);
      expect([200, 201]).toContain(confirm.status);
    }
  });

  // ── 4. 경매장 ───────────────────────────────────────────────

  it('경매장 아이템 등록/입찰', async () => {
    const list = await api('POST', '/auction/list', {
      characterId: userA.characterId,
      itemId: 'test_item_001',
      startPrice: 100,
      buyoutPrice: 500,
      durationHours: 24,
    }, userA.token);
    expect([200, 201]).toContain(list.status);

    if (list.data.auctionId) {
      const bid = await api('POST', '/auction/bid', {
        auctionId: list.data.auctionId,
        characterId: userB.characterId,
        amount: 200,
      }, userB.token);
      expect([200, 201]).toContain(bid.status);
    }

    // 경매장 검색
    const search = await api('GET', '/auction/search?keyword=test', undefined, userA.token);
    expect(search.status).toBe(200);
  });

  // ── 5. 길드 ─────────────────────────────────────────────────

  it('길드 생성/가입/탈퇴', async () => {
    const create = await api('POST', '/guild/create', {
      characterId: userA.characterId,
      name: `TestGuild_${Date.now() % 10000}`,
      description: 'E2E 테스트 길드',
    }, userA.token);
    expect([200, 201]).toContain(create.status);
    const guildId = create.data.guildId;

    if (guildId) {
      const join = await api('POST', '/guild/join', { guildId, characterId: userB.characterId }, userB.token);
      expect([200, 201]).toContain(join.status);

      const info = await api('GET', `/guild/${guildId}`, undefined, userA.token);
      expect(info.data.members?.length).toBeGreaterThanOrEqual(1);

      const leave = await api('POST', '/guild/leave', { guildId, characterId: userB.characterId }, userB.token);
      expect(leave.status).toBe(200);
    }
  });

  // ── 6. 채팅 ─────────────────────────────────────────────────

  it('채팅 메시지 송수신', async () => {
    const send = await api('POST', '/chat/send', {
      characterId: userA.characterId,
      channel: 'general',
      message: '안녕하세요! E2E 테스트입니다.',
    }, userA.token);
    expect(send.status).toBe(200);

    const history = await api('GET', '/chat/history?channel=general&limit=5', undefined, userB.token);
    expect(history.status).toBe(200);
    expect(history.data.messages?.length).toBeGreaterThan(0);

    // 귓속말
    const whisper = await api('POST', '/chat/whisper', {
      fromCharacterId: userA.characterId,
      toCharacterId: userB.characterId,
      message: '귓속말 테스트',
    }, userA.token);
    expect([200, 201]).toContain(whisper.status);
  });

  // ── 7. 친구 ─────────────────────────────────────────────────

  it('친구 추가/삭제', async () => {
    const add = await api('POST', '/social/friend/add', {
      characterId: userA.characterId,
      targetCharacterId: userB.characterId,
    }, userA.token);
    expect([200, 201]).toContain(add.status);

    const list = await api('GET', `/social/friend/list?characterId=${userA.characterId}`, undefined, userA.token);
    expect(list.status).toBe(200);

    const remove = await api('POST', '/social/friend/remove', {
      characterId: userA.characterId,
      targetCharacterId: userB.characterId,
    }, userA.token);
    expect(remove.status).toBe(200);
  });

  // ── 8. 우편 ─────────────────────────────────────────────────

  it('우편 송수신', async () => {
    const send = await api('POST', '/mail/send', {
      fromCharacterId: userA.characterId,
      toCharacterId: userB.characterId,
      subject: '테스트 우편',
      body: 'E2E 우편 테스트입니다.',
      gold: 5,
    }, userA.token);
    expect([200, 201]).toContain(send.status);

    const inbox = await api('GET', `/mail/inbox?characterId=${userB.characterId}`, undefined, userB.token);
    expect(inbox.status).toBe(200);
    expect(inbox.data.mails?.length).toBeGreaterThan(0);
  });
});
