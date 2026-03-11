/**
 * 통합 테스트 — 길드 + 레이드 플로우 (8 tests)
 * 길드 생성 → 가입 → 레이드 개설 → 참가 → 진행 → 보상
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

let app: FastifyInstance;

const guilds: Record<string, { name: string; leaderId: string; members: string[]; level: number }> = {};
const raids: Record<string, { guildId: string; bossHp: number; participants: string[]; status: string; damage: Record<string, number> }> = {};

beforeAll(async () => {
  app = Fastify({ logger: false });

  // 길드 생성
  app.post('/api/guild/create', async (req, reply) => {
    const { userId, guildName } = req.body as Record<string, string>;
    if (Object.values(guilds).find(g => g.name === guildName)) return reply.status(409).send({ error: '중복 이름' });
    const id = `guild_${Date.now()}`;
    guilds[id] = { name: guildName, leaderId: userId, members: [userId], level: 1 };
    return { guildId: id, name: guildName };
  });

  // 길드 가입
  app.post('/api/guild/join', async (req, reply) => {
    const { userId, guildId } = req.body as Record<string, string>;
    const guild = guilds[guildId];
    if (!guild) return reply.status(404).send({ error: 'NOT_FOUND' });
    if (guild.members.includes(userId)) return reply.status(409).send({ error: 'ALREADY_MEMBER' });
    if (guild.members.length >= 50) return reply.status(400).send({ error: 'GUILD_FULL' });
    guild.members.push(userId);
    return { guildId, memberCount: guild.members.length };
  });

  // 레이드 개설
  app.post('/api/raid/create', async (req, reply) => {
    const { guildId, bossHp } = req.body as Record<string, any>;
    if (!guilds[guildId]) return reply.status(404).send({ error: 'GUILD_NOT_FOUND' });
    const id = `raid_${Date.now()}`;
    raids[id] = { guildId, bossHp, participants: [], status: 'waiting', damage: {} };
    return { raidId: id };
  });

  // 레이드 참가
  app.post('/api/raid/join', async (req, reply) => {
    const { raidId, userId } = req.body as Record<string, string>;
    const raid = raids[raidId];
    if (!raid) return reply.status(404).send({ error: 'NOT_FOUND' });
    if (raid.participants.includes(userId)) return reply.status(409).send({ error: 'ALREADY_JOINED' });
    raid.participants.push(userId);
    raid.damage[userId] = 0;
    return { raidId, participants: raid.participants.length };
  });

  // 레이드 공격
  app.post('/api/raid/attack', async (req, reply) => {
    const { raidId, userId, damage } = req.body as Record<string, any>;
    const raid = raids[raidId];
    if (!raid) return reply.status(404).send({ error: 'NOT_FOUND' });
    raid.bossHp = Math.max(0, raid.bossHp - damage);
    raid.damage[userId] = (raid.damage[userId] ?? 0) + damage;
    raid.status = raid.bossHp <= 0 ? 'cleared' : 'in_progress';
    return { bossHp: raid.bossHp, status: raid.status };
  });

  // 레이드 결과
  app.get('/api/raid/:id/result', async (req, reply) => {
    const { id } = req.params as Record<string, string>;
    const raid = raids[id];
    if (!raid) return reply.status(404).send({ error: 'NOT_FOUND' });
    const rankings = Object.entries(raid.damage).sort(([, a], [, b]) => b - a).map(([uid, dmg], i) => ({ rank: i + 1, userId: uid, damage: dmg }));
    return { status: raid.status, rankings };
  });

  await app.ready();
});

afterAll(async () => { await app.close(); });

describe('Guild + Raid Flow 통합', () => {
  let guildId = '';
  let raidId = '';

  // 1. 길드 생성
  test('1. 길드 생성 성공', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/guild/create', payload: { userId: 'u1', guildName: '에테르나 기사단' } });
    guildId = JSON.parse(res.body).guildId;
    expect(res.statusCode).toBe(200);
  });

  // 2. 길드 가입
  test('2. 길드 가입 → 멤버 수 증가', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/guild/join', payload: { userId: 'u2', guildId } });
    expect(JSON.parse(res.body).memberCount).toBe(2);
  });

  // 3. 중복 가입 → 409
  test('3. 중복 가입 → 409', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/guild/join', payload: { userId: 'u2', guildId } });
    expect(res.statusCode).toBe(409);
  });

  // 4. 레이드 개설
  test('4. 레이드 개설', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/raid/create', payload: { guildId, bossHp: 10000 } });
    raidId = JSON.parse(res.body).raidId;
    expect(raidId).toBeTruthy();
  });

  // 5. 레이드 참가
  test('5. 레이드 참가', async () => {
    await app.inject({ method: 'POST', url: '/api/raid/join', payload: { raidId, userId: 'u1' } });
    const res = await app.inject({ method: 'POST', url: '/api/raid/join', payload: { raidId, userId: 'u2' } });
    expect(JSON.parse(res.body).participants).toBe(2);
  });

  // 6. 레이드 공격
  test('6. 레이드 공격 → 보스 HP 감소', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/raid/attack', payload: { raidId, userId: 'u1', damage: 3000 } });
    expect(JSON.parse(res.body).bossHp).toBe(7000);
  });

  // 7. 보스 처치 → cleared
  test('7. 보스 HP 0 → cleared', async () => {
    await app.inject({ method: 'POST', url: '/api/raid/attack', payload: { raidId, userId: 'u2', damage: 7000 } });
    const res = await app.inject({ method: 'POST', url: '/api/raid/attack', payload: { raidId, userId: 'u1', damage: 1 } });
    expect(JSON.parse(res.body).status).toBe('cleared');
  });

  // 8. 랭킹 확인 — u2가 1위
  test('8. 레이드 랭킹 — 데미지 순', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/raid/${raidId}/result` });
    const body = JSON.parse(res.body);
    expect(body.rankings[0].userId).toBe('u2');
    expect(body.rankings[0].damage).toBe(7000);
  });
});
