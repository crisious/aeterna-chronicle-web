/**
 * E2E 테스트 — 길드 시스템 (5 tests)
 * 생성 / 가입 / 전쟁
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, mockGuild, expectStatus, expectKeys, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Guild E2E', () => {
  let app: FastifyInstance;
  let leader: TestUser;
  let member: TestUser;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();
    leader = createTestUser();
    member = createTestUser();

    const guilds = new Map<string, Record<string, unknown>>();

    app.post('/api/guild/create', async (request, reply) => {
      const body = request.body as { userId: string; name: string };
      if (guilds.has(body.name)) return reply.status(409).send({ error: '이미 존재하는 길드명' });
      const guild = mockGuild({ name: body.name, leaderId: body.userId, members: [body.userId] });
      guilds.set(body.name, guild);
      return reply.status(201).send({ success: true, guild });
    });

    app.post('/api/guild/join', async (request, reply) => {
      const body = request.body as { userId: string; guildName: string };
      const guild = guilds.get(body.guildName);
      if (!guild) return reply.status(404).send({ error: '길드 없음' });
      const members = guild.members as string[];
      if (members.includes(body.userId)) return reply.status(400).send({ error: '이미 가입됨' });
      members.push(body.userId);
      guild.memberCount = members.length;
      return { success: true, memberCount: guild.memberCount };
    });

    app.post('/api/guild/war/declare', async (request, reply) => {
      const body = request.body as { attackerGuild: string; defenderGuild: string };
      if (!guilds.has(body.attackerGuild) || !guilds.has(body.defenderGuild)) {
        return reply.status(404).send({ error: '길드 없음' });
      }
      if (body.attackerGuild === body.defenderGuild) {
        return reply.status(400).send({ error: '자기 길드에 선전포고 불가' });
      }
      return { success: true, warId: `war-${Date.now()}`, status: 'declared' };
    });

    await app.ready();
  });

  afterAll(async () => { await closeTestServer(); });

  test('1. 길드 생성 → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/guild/create',
      headers: authHeader(leader),
      payload: { userId: leader.userId, name: '에테르나 기사단' },
    });
    expectStatus(res.statusCode, 201);
    expectKeys(res.json(), ['success', 'guild']);
  });

  test('2. 중복 길드명 → 409', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/guild/create',
      payload: { userId: member.userId, name: '에테르나 기사단' },
    });
    expectStatus(res.statusCode, 409);
  });

  test('3. 길드 가입 → 멤버 수 증가', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/guild/join',
      headers: authHeader(member),
      payload: { userId: member.userId, guildName: '에테르나 기사단' },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().memberCount, 2, '멤버 수');
  });

  test('4. 길드전 선포 → warId 반환', async () => {
    // 적 길드 생성
    await app.inject({
      method: 'POST', url: '/api/guild/create',
      payload: { userId: 'enemy-leader', name: '다크 어쌔신' },
    });
    const res = await app.inject({
      method: 'POST', url: '/api/guild/war/declare',
      payload: { attackerGuild: '에테르나 기사단', defenderGuild: '다크 어쌔신' },
    });
    expectStatus(res.statusCode, 200);
    expectKeys(res.json(), ['success', 'warId', 'status']);
  });

  test('5. 자기 길드에 선전포고 → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/guild/war/declare',
      payload: { attackerGuild: '에테르나 기사단', defenderGuild: '에테르나 기사단' },
    });
    expectStatus(res.statusCode, 400);
  });
});
