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
  const token = reg.data.token ?? reg.data.accessToken;
  const char = await api('POST', '/characters', { name: `Char_${suffix}`, classId: 'ether_knight' }, token);
  return { token, characterId: char.data?.id ?? char.data?.characterId, username };
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
    const create = await api('POST', '/party/create', { leaderId: userA.characterId }, userA.token);
    expect([200, 201]).toContain(create.status);
    const partyId = create.data?.id ?? create.data?.partyId;

    if (partyId) {
      const invite = await api('POST', '/party/invite', { partyId, inviterId: userA.characterId, targetUserId: userB.characterId }, userA.token);
      expect([200, 201]).toContain(invite.status);

      const inviteId = invite.data?.id ?? invite.data?.inviteId;
      if (inviteId) {
        const accept = await api('POST', '/party/invite/accept', { inviteId, userId: userB.characterId }, userB.token);
        expect([200, 201]).toContain(accept.status);
      }

      const info = await api('GET', `/party/${partyId}`, undefined, userA.token);
      expect(info.status).toBe(200);
    }
  });

  // ── 2. 파티 전투 ────────────────────────────────────────────

  it('파티 전투 수행', async () => {
    // 전투 경로: /combat/start (Vite proxy 경유 시 /combat, 서버 직접 접근 시 /combat)
    const battle = await fetch('http://localhost:3000/combat/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userA.token}` },
      body: JSON.stringify({ characterId: userA.characterId }),
    });
    const battleData = await battle.json();

    expect([200, 201]).toContain(battle.status);
    if (battleData?.data?.combatId ?? battleData?.combatId) {
      const combatId = battleData?.data?.combatId ?? battleData?.combatId;
      const end = await fetch(`http://localhost:3000/combat/${combatId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userA.token}` },
        body: JSON.stringify({ combatId }),
      });
      expect([200, 201]).toContain(end.status);
    }
  });

  // ── 3. 거래 ─────────────────────────────────────────────────

  it('1:1 거래 요청 + 수락', async () => {
    const req = await api('POST', '/trade/request', {
      requesterId: userA.characterId,
      targetId: userB.characterId,
    }, userA.token);
    expect([200, 201]).toContain(req.status);

    const tradeId = req.data?.id ?? req.data?.tradeId;
    if (tradeId) {
      const accept = await api('POST', '/trade/accept', { tradeId, userId: userB.characterId }, userB.token);
      expect([200, 201]).toContain(accept.status);

      const offer = await api('POST', '/trade/offer', {
        tradeId,
        userId: userA.characterId,
        gold: 10,
      }, userA.token);
      expect([200, 201]).toContain(offer.status);

      const confirm = await api('POST', '/trade/confirm', { tradeId, userId: userA.characterId }, userA.token);
      expect([200, 201]).toContain(confirm.status);
    }
  });

  // ── 4. 경매장 ───────────────────────────────────────────────

  it('경매장 아이템 등록/입찰', async () => {
    const list = await api('POST', '/auction/list', {
      sellerId: userA.characterId,
      itemId: 'test_item_001',
      startPrice: 100,
      buyoutPrice: 500,
      durationHours: 24,
    }, userA.token);
    expect([200, 201]).toContain(list.status);

    const auctionId = list.data?.id ?? list.data?.auctionId ?? list.data?.listingId;
    if (auctionId) {
      const bid = await api('POST', '/auction/bid', {
        listingId: auctionId,
        bidderId: userB.characterId,
        amount: 200,
      }, userB.token);
      expect([200, 201]).toContain(bid.status);
    }

    // 경매장 조회
    const search = await api('GET', '/auction?keyword=test', undefined, userA.token);
    expect(search.status).toBe(200);
  });

  // ── 5. 길드 ─────────────────────────────────────────────────

  it('길드 생성/가입/탈퇴', async () => {
    const create = await api('POST', '/guild', {
      name: `TestGuild_${Date.now() % 10000}`,
      tag: 'TST',
      leaderId: userA.characterId,
    }, userA.token);
    expect([200, 201]).toContain(create.status);
    const guildId = create.data?.id ?? create.data?.guildId;

    if (guildId) {
      const join = await api('POST', `/guild/${guildId}/join`, { userId: userB.characterId }, userB.token);
      expect([200, 201]).toContain(join.status);

      const info = await api('GET', `/guild/${guildId}/members`, undefined, userA.token);
      expect(info.status).toBe(200);

      const leave = await api('POST', `/guild/${guildId}/leave`, { userId: userB.characterId }, userB.token);
      expect([200, 201]).toContain(leave.status);
    }
  });

  // ── 6. 채팅 ─────────────────────────────────────────────────

  it('채팅은 소켓 기반 — REST 엔드포인트 없음 (스킵)', async () => {
    // 채팅은 socket.io 이벤트(chat:message)로 처리되므로 REST E2E 테스트 불가
    // 소켓 E2E는 별도 테스트에서 처리
    expect(true).toBe(true);
  });

  // ── 7. 친구 ─────────────────────────────────────────────────

  it('친구 추가/삭제', async () => {
    const add = await api('POST', '/friends/request', {
      userId: userA.characterId,
      targetId: userB.characterId,
    }, userA.token);
    expect([200, 201]).toContain(add.status);

    const list = await api('GET', `/friends?userId=${userA.characterId}`, undefined, userA.token);
    expect(list.status).toBe(200);

    // 친구 삭제
    const remove = await api('DELETE', `/friends/${userB.characterId}?userId=${userA.characterId}`, undefined, userA.token);
    expect([200, 204]).toContain(remove.status);
  });

  // ── 8. 우편 ─────────────────────────────────────────────────

  it('우편 송수신', async () => {
    const send = await api('POST', '/mail/send', {
      senderId: userA.characterId,
      recipientId: userB.characterId,
      subject: '테스트 우편',
      body: 'E2E 우편 테스트입니다.',
      gold: 5,
    }, userA.token);
    expect([200, 201]).toContain(send.status);

    const inbox = await api('GET', `/mail/inbox?userId=${userB.characterId}`, undefined, userB.token);
    expect(inbox.status).toBe(200);
  });
});
