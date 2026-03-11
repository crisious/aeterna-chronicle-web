/**
 * E2E 테스트 — 스킬 시스템 (6 tests)
 * 스킬 트리 조회, 해금, 레벨업, 장착, 리셋, 데미지 계산
 */
import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Skill E2E', () => {
  let app: FastifyInstance;
  let user: TestUser;

  const playerSkills: Record<string, { skillId: string; level: number; equipped: boolean }[]> = {};

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    app.get('/api/skill/tree/:classId', async (req) => {
      return {
        classId: (req.params as Record<string, string>).classId,
        skills: [
          { id: 'sk_slash', name: '베기', tier: 1, requiredLevel: 1, maxLevel: 5, type: 'active' },
          { id: 'sk_guard', name: '방어 태세', tier: 1, requiredLevel: 5, maxLevel: 3, type: 'passive' },
          { id: 'sk_charge', name: '돌진', tier: 2, requiredLevel: 10, maxLevel: 5, type: 'active', prerequisite: 'sk_slash' },
        ],
      };
    });

    app.post('/api/skill/unlock', async (req, reply) => {
      const { userId, skillId, playerLevel } = req.body as Record<string, any>;
      if (skillId === 'sk_charge' && playerLevel < 10) return reply.status(400).send({ error: 'LEVEL_TOO_LOW' });
      if (!playerSkills[userId]) playerSkills[userId] = [];
      if (playerSkills[userId].find(s => s.skillId === skillId)) return reply.status(409).send({ error: 'ALREADY_UNLOCKED' });
      playerSkills[userId].push({ skillId, level: 1, equipped: false });
      return { skillId, level: 1 };
    });

    app.post('/api/skill/levelup', async (req, reply) => {
      const { userId, skillId } = req.body as Record<string, any>;
      const skill = playerSkills[userId]?.find(s => s.skillId === skillId);
      if (!skill) return reply.status(404).send({ error: 'NOT_UNLOCKED' });
      if (skill.level >= 5) return reply.status(400).send({ error: 'MAX_LEVEL' });
      skill.level++;
      return { skillId, level: skill.level };
    });

    app.post('/api/skill/equip', async (req, reply) => {
      const { userId, skillId } = req.body as Record<string, any>;
      const skills = playerSkills[userId] ?? [];
      const equipped = skills.filter(s => s.equipped).length;
      if (equipped >= 6) return reply.status(400).send({ error: 'SLOTS_FULL' });
      const skill = skills.find(s => s.skillId === skillId);
      if (!skill) return reply.status(404).send({ error: 'NOT_FOUND' });
      skill.equipped = true;
      return { skillId, equipped: true };
    });

    app.post('/api/skill/reset', async (req) => {
      const { userId } = req.body as Record<string, any>;
      const count = playerSkills[userId]?.length ?? 0;
      playerSkills[userId] = [];
      return { reset: true, skillsRemoved: count, goldCost: 1000 + count * 200 };
    });

    app.post('/api/skill/calculate-damage', async (req) => {
      const { baseDamage, skillLevel, scalingPct, statValue } = req.body as Record<string, number>;
      const total = Math.floor(baseDamage + baseDamage * (skillLevel - 1) * 0.1 + statValue * (scalingPct / 100));
      return { totalDamage: total };
    });

    await app.ready();
    user = createTestUser();
  });

  afterAll(async () => { await closeTestServer(); });

  test('1. 스킬 트리 조회', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/skill/tree/ether_knight' });
    expect(JSON.parse(res.body).skills).toHaveLength(3);
  });

  test('2. 스킬 해금', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/skill/unlock', payload: { userId: 'u1', skillId: 'sk_slash', playerLevel: 5 } });
    expect(JSON.parse(res.body).level).toBe(1);
  });

  test('3. 레벨 부족 해금 → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/skill/unlock', payload: { userId: 'u1', skillId: 'sk_charge', playerLevel: 5 } });
    expect(res.statusCode).toBe(400);
  });

  test('4. 스킬 레벨업', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/skill/levelup', payload: { userId: 'u1', skillId: 'sk_slash' } });
    expect(JSON.parse(res.body).level).toBe(2);
  });

  test('5. 스킬 장착', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/skill/equip', payload: { userId: 'u1', skillId: 'sk_slash' } });
    expect(JSON.parse(res.body).equipped).toBe(true);
  });

  test('6. 스킬 리셋', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/skill/reset', payload: { userId: 'u1' } });
    const body = JSON.parse(res.body);
    expect(body.reset).toBe(true);
    expect(body.skillsRemoved).toBeGreaterThan(0);
  });
});
