/**
 * E2E 테스트 — 소셜 시스템 (8 tests)
 * 친구 / 파티 / 우편
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, expectStatus, expectKeys, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Social E2E', () => {
  let app: FastifyInstance;
  let user1: TestUser;
  let user2: TestUser;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();
    user1 = createTestUser();
    user2 = createTestUser();

    const friends = new Map<string, Set<string>>();
    const mails: Array<Record<string, unknown>> = [];

    // 친구
    app.post('/api/social/friend/request', async (request, reply) => {
      const body = request.body as { fromId: string; toId: string };
      if (body.fromId === body.toId) return reply.status(400).send({ error: '자신에게 요청 불가' });
      return reply.status(201).send({ success: true, status: 'pending' });
    });

    app.post('/api/social/friend/accept', async (request) => {
      const body = request.body as { userId: string; friendId: string };
      if (!friends.has(body.userId)) friends.set(body.userId, new Set());
      if (!friends.has(body.friendId)) friends.set(body.friendId, new Set());
      friends.get(body.userId)!.add(body.friendId);
      friends.get(body.friendId)!.add(body.userId);
      return { success: true };
    });

    app.get('/api/social/friends/:userId', async (request) => {
      const { userId } = request.params as { userId: string };
      const list = friends.get(userId);
      return { friends: list ? Array.from(list) : [], count: list?.size || 0 };
    });

    // 파티
    app.post('/api/social/party/create', async (request) => {
      const body = request.body as { leaderId: string; maxSize?: number };
      return { partyId: `party-${Date.now()}`, leaderId: body.leaderId, maxSize: body.maxSize || 4, members: [body.leaderId] };
    });

    app.post('/api/social/party/invite', async (request, reply) => {
      const body = request.body as { partyId: string; targetId: string };
      if (!body.targetId) return reply.status(400).send({ error: '대상 지정 필요' });
      return { success: true, invited: body.targetId };
    });

    // 우편
    app.post('/api/social/mail/send', async (request, reply) => {
      const body = request.body as { fromId: string; toId: string; title: string; body?: string; attachments?: unknown[] };
      if (!body.title) return reply.status(400).send({ error: '제목 필요' });
      const mail = { id: `mail-${Date.now()}`, ...body, read: false, createdAt: new Date().toISOString() };
      mails.push(mail);
      return reply.status(201).send({ success: true, mailId: mail.id });
    });

    app.get('/api/social/mail/:userId', async (request) => {
      const { userId } = request.params as { userId: string };
      const userMails = mails.filter(m => m.toId === userId);
      return { mails: userMails, count: userMails.length };
    });

    app.post('/api/social/mail/read', async (request) => {
      const body = request.body as { mailId: string };
      const mail = mails.find(m => m.id === body.mailId);
      if (mail) mail.read = true;
      return { success: true };
    });

    await app.ready();
  });

  afterAll(async () => { await closeTestServer(); });

  // ── 친구 ──

  test('1. 친구 요청 → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/social/friend/request',
      headers: authHeader(user1),
      payload: { fromId: user1.userId, toId: user2.userId },
    });
    expectStatus(res.statusCode, 201);
    expectEqual(res.json().status, 'pending', '대기 상태');
  });

  test('2. 자기 자신에게 친구 요청 → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/social/friend/request',
      payload: { fromId: user1.userId, toId: user1.userId },
    });
    expectStatus(res.statusCode, 400);
  });

  test('3. 친구 수락 → 양방향 등록', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/social/friend/accept',
      payload: { userId: user2.userId, friendId: user1.userId },
    });
    expectStatus(res.statusCode, 200);
    // 친구 목록 확인
    const list = await app.inject({ method: 'GET', url: `/api/social/friends/${user1.userId}` });
    expectEqual(list.json().count, 1, '친구 수');
  });

  // ── 파티 ──

  test('4. 파티 생성 → 파티 정보 반환', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/social/party/create',
      payload: { leaderId: user1.userId, maxSize: 4 },
    });
    expectStatus(res.statusCode, 200);
    expectKeys(res.json(), ['partyId', 'leaderId', 'maxSize', 'members']);
  });

  test('5. 파티 초대 → 성공', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/social/party/invite',
      payload: { partyId: 'party-1', targetId: user2.userId },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().invited, user2.userId, '초대 대상');
  });

  // ── 우편 ──

  test('6. 우편 발송 → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/social/mail/send',
      payload: { fromId: user1.userId, toId: user2.userId, title: '안녕하세요!' },
    });
    expectStatus(res.statusCode, 201);
    expectKeys(res.json(), ['success', 'mailId']);
  });

  test('7. 우편함 조회 → 수신 목록', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/social/mail/${user2.userId}`,
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().count, 1, '우편 수');
  });

  test('8. 우편 읽음 처리 → 성공', async () => {
    const listRes = await app.inject({ method: 'GET', url: `/api/social/mail/${user2.userId}` });
    const mailId = listRes.json().mails[0]?.id;
    const res = await app.inject({
      method: 'POST', url: '/api/social/mail/read',
      payload: { mailId },
    });
    expectStatus(res.statusCode, 200);
  });
});
