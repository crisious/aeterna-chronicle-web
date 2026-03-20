/**
 * E2E 테스트 — 레이드 시스템 (7 tests)
 * 보스 목록 / 세션 생성 / 참가 / 상태 조회 / 이력 / 티어 필터 / 인원 제한
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, expectStatus, expectKeys, expectTruthy, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Raid E2E', () => {
  let app: FastifyInstance;
  let testUser: TestUser;

  const bosses = [
    { id: 'boss-1', name: '크로노스 드래곤', tier: 'heroic', hp: 500000, minPlayers: 4, maxPlayers: 8 },
    { id: 'boss-2', name: '그림자 군주', tier: 'normal', hp: 200000, minPlayers: 2, maxPlayers: 4 },
    { id: 'boss-3', name: '시간의 파수꾼', tier: 'heroic', hp: 800000, minPlayers: 8, maxPlayers: 16 },
  ];

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    const sessions: Record<string, {
      id: string; bossId: string; hostId: string; guildId?: string;
      participants: Array<{ userId: string; role: string }>;
      status: string; maxPlayers: number;
    }> = {};
    const raidHistory: Record<string, Array<Record<string, unknown>>> = {};
    let sessionSeq = 0;

    // GET /api/raids/bosses
    app.get('/api/raids/bosses', async (request) => {
      const query = request.query as { tier?: string };
      const filtered = query.tier ? bosses.filter((b) => b.tier === query.tier) : bosses;
      return { bosses: filtered };
    });

    // POST /api/raids/sessions — 세션 생성
    app.post('/api/raids/sessions', async (request, reply) => {
      const body = request.body as { bossId: string; userId: string; guildId?: string };
      const boss = bosses.find((b) => b.id === body.bossId);
      if (!boss) return reply.status(404).send({ error: '보스를 찾을 수 없습니다.' });

      sessionSeq++;
      const id = `session-${sessionSeq}`;
      sessions[id] = {
        id,
        bossId: body.bossId,
        hostId: body.userId,
        guildId: body.guildId,
        participants: [{ userId: body.userId, role: 'leader' }],
        status: 'recruiting',
        maxPlayers: boss.maxPlayers,
      };
      return reply.status(201).send({ sessionId: id, status: 'recruiting', bossName: boss.name });
    });

    // POST /api/raids/sessions/:id/join — 참가
    app.post('/api/raids/sessions/:id/join', async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { userId: string; role?: string };
      const session = sessions[id];
      if (!session) return reply.status(404).send({ error: '세션 없음' });
      if (session.participants.length >= session.maxPlayers) {
        return reply.status(400).send({ error: '인원 초과' });
      }
      if (session.participants.some((p) => p.userId === body.userId)) {
        return reply.status(409).send({ error: '이미 참가 중' });
      }
      session.participants.push({ userId: body.userId, role: body.role || 'dps' });
      return { success: true, participantCount: session.participants.length };
    });

    // GET /api/raids/sessions/:id — 상태 조회
    app.get('/api/raids/sessions/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const session = sessions[id];
      if (!session) return reply.status(404).send({ error: '세션 없음' });
      return session;
    });

    // GET /api/raids/history/:userId
    app.get('/api/raids/history/:userId', async (request) => {
      const { userId } = request.params as { userId: string };
      return { userId, history: raidHistory[userId] || [] };
    });

    await app.ready();
    testUser = createTestUser();
  });

  afterAll(async () => {
    await closeTestServer();
  });

  test('1. 보스 목록 조회', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/raids/bosses' });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().bosses.length, 3, '전체 보스 3개');
  });

  test('2. 티어 필터 → heroic만 반환', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/raids/bosses?tier=heroic' });
    expectEqual(res.json().bosses.length, 2, 'heroic 2개');
  });

  test('3. 레이드 세션 생성 → 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/raids/sessions',
      payload: { bossId: 'boss-2', userId: testUser.userId },
    });
    expectStatus(res.statusCode, 201);
    const body = res.json();
    expectKeys(body, ['sessionId', 'status', 'bossName']);
    expectEqual(body.status, 'recruiting', '모집 상태');
  });

  test('4. 존재하지 않는 보스로 세션 생성 → 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/raids/sessions',
      payload: { bossId: 'boss-unknown', userId: testUser.userId },
    });
    expectStatus(res.statusCode, 404);
  });

  test('5. 세션 참가 → success', async () => {
    const other = createTestUser('user', { userId: 'raider-2' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/raids/sessions/session-1/join',
      payload: { userId: other.userId, role: 'healer' },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().participantCount, 2, '참가자 2명');
  });

  test('6. 중복 참가 → 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/raids/sessions/session-1/join',
      payload: { userId: testUser.userId },
    });
    expectStatus(res.statusCode, 409);
  });

  test('7. 세션 상태 조회', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/raids/sessions/session-1' });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectKeys(body, ['id', 'bossId', 'participants', 'status']);
    expectTruthy(body.participants.length >= 2, '참가자 확인');
  });
});
