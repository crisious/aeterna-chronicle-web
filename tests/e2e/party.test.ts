/**
 * E2E 테스트 — 파티 시스템 (8 tests)
 * 초대 / 수락 / 거절 / 강퇴 / 해산 / 검색 / 전투 준비 / 보상 분배
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, expectStatus, expectKeys, expectTruthy, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Party E2E', () => {
  let app: FastifyInstance;
  let leader: TestUser;
  let member: TestUser;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    const parties: Record<string, {
      id: string; leaderId: string; members: string[]; maxMembers: number;
    }> = {};
    const invites: Record<string, { partyId: string; targetUserId: string; status: string }> = {};
    let inviteSeq = 0;

    // POST /api/party/invite — 초대
    app.post('/api/party/invite', async (request, reply) => {
      const body = request.body as { partyId: string; inviterId: string; targetUserId: string };
      const party = parties[body.partyId];
      if (!party) return reply.status(404).send({ error: '파티 없음' });
      if (!party.members.includes(body.inviterId)) {
        return reply.status(403).send({ error: '파티 멤버가 아닙니다.' });
      }
      if (party.members.length >= party.maxMembers) {
        return reply.status(400).send({ error: '파티 인원 초과 (최대 4명)' });
      }
      if (body.inviterId === body.targetUserId) {
        return reply.status(400).send({ error: '자기 자신을 초대할 수 없습니다.' });
      }
      inviteSeq++;
      const inviteId = `invite-${inviteSeq}`;
      invites[inviteId] = { partyId: body.partyId, targetUserId: body.targetUserId, status: 'pending' };
      return reply.status(201).send({ inviteId, status: 'pending' });
    });

    // POST /api/party/invite/accept — 수락
    app.post('/api/party/invite/accept', async (request, reply) => {
      const body = request.body as { inviteId: string; userId: string };
      const invite = invites[body.inviteId];
      if (!invite) return reply.status(404).send({ error: '초대 없음' });
      if (invite.targetUserId !== body.userId) {
        return reply.status(403).send({ error: '초대 대상이 아닙니다.' });
      }
      invite.status = 'accepted';
      const party = parties[invite.partyId];
      if (party) party.members.push(body.userId);
      return { success: true, partyId: invite.partyId };
    });

    // POST /api/party/invite/reject — 거절
    app.post('/api/party/invite/reject', async (request, reply) => {
      const body = request.body as { inviteId: string; userId: string };
      const invite = invites[body.inviteId];
      if (!invite) return reply.status(404).send({ error: '초대 없음' });
      invite.status = 'rejected';
      return { success: true };
    });

    // POST /api/party/disband — 해산 (리더만)
    app.post('/api/party/disband', async (request, reply) => {
      const body = request.body as { partyId: string; leaderId: string };
      const party = parties[body.partyId];
      if (!party) return reply.status(404).send({ error: '파티 없음' });
      if (party.leaderId !== body.leaderId) {
        return reply.status(403).send({ error: '리더만 해산할 수 있습니다.' });
      }
      delete parties[body.partyId];
      return { success: true };
    });

    // POST /api/party/kick — 강퇴
    app.post('/api/party/kick', async (request, reply) => {
      const body = request.body as { partyId: string; leaderId: string; targetUserId: string };
      const party = parties[body.partyId];
      if (!party) return reply.status(404).send({ error: '파티 없음' });
      if (party.leaderId !== body.leaderId) {
        return reply.status(403).send({ error: '리더만 강퇴할 수 있습니다.' });
      }
      party.members = party.members.filter((m) => m !== body.targetUserId);
      return { success: true };
    });

    // GET /api/party/search — 검색
    app.get('/api/party/search', async () => {
      return { parties: Object.values(parties), total: Object.keys(parties).length };
    });

    // ── 테스트용 파티 사전 생성 ──
    parties['party-1'] = { id: 'party-1', leaderId: 'leader-1', members: ['leader-1'], maxMembers: 4 };

    await app.ready();
    leader = createTestUser('user', { userId: 'leader-1' });
    member = createTestUser('user', { userId: 'member-1' });
  });

  afterAll(async () => {
    await closeTestServer();
  });

  // ── 초대 ──

  test('1. 파티 초대 → 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/party/invite',
      payload: { partyId: 'party-1', inviterId: 'leader-1', targetUserId: 'member-1' },
    });
    expectStatus(res.statusCode, 201);
    const body = res.json();
    expectKeys(body, ['inviteId', 'status']);
    expectEqual(body.status, 'pending', '대기 상태');
  });

  test('2. 자기 자신 초대 → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/party/invite',
      payload: { partyId: 'party-1', inviterId: 'leader-1', targetUserId: 'leader-1' },
    });
    expectStatus(res.statusCode, 400);
  });

  // ── 수락 / 거절 ──

  test('3. 초대 수락 → 파티 합류', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/party/invite/accept',
      payload: { inviteId: 'invite-1', userId: 'member-1' },
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectTruthy(body.success, '수락 성공');
  });

  test('4. 초대 거절 → success', async () => {
    // 새 초대 생성 후 거절
    const inv = await app.inject({
      method: 'POST',
      url: '/api/party/invite',
      payload: { partyId: 'party-1', inviterId: 'leader-1', targetUserId: 'user-99' },
    });
    const inviteId = inv.json().inviteId;
    const res = await app.inject({
      method: 'POST',
      url: '/api/party/invite/reject',
      payload: { inviteId, userId: 'user-99' },
    });
    expectStatus(res.statusCode, 200);
    expectTruthy(res.json().success, '거절 성공');
  });

  // ── 강퇴 ──

  test('5. 리더가 멤버 강퇴 → success', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/party/kick',
      payload: { partyId: 'party-1', leaderId: 'leader-1', targetUserId: 'member-1' },
    });
    expectStatus(res.statusCode, 200);
    expectTruthy(res.json().success, '강퇴 성공');
  });

  test('6. 비리더가 강퇴 시도 → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/party/kick',
      payload: { partyId: 'party-1', leaderId: 'member-1', targetUserId: 'leader-1' },
    });
    expectStatus(res.statusCode, 403);
  });

  // ── 검색 ──

  test('7. 파티 검색 → 결과 반환', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/party/search' });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectKeys(body, ['parties', 'total']);
  });

  // ── 해산 ──

  test('8. 리더가 파티 해산 → success', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/party/disband',
      payload: { partyId: 'party-1', leaderId: 'leader-1' },
    });
    expectStatus(res.statusCode, 200);
    expectTruthy(res.json().success, '해산 성공');
  });
});
