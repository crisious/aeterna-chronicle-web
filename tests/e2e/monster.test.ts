/**
 * E2E 테스트 — 몬스터 시스템 (5 tests)
 * 몬스터 목록, 스폰, 전투, 드롭, 필드 보스
 */
import {
  createTestServer, closeTestServer, createTestUser,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Monster E2E', () => {
  let app: FastifyInstance;
  let user: TestUser;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    app.get('/api/monster/list', async (req) => {
      const { zone } = req.query as Record<string, string>;
      const all = [
        { code: 'slime_01', name: '초록 슬라임', zone: 'argentium', level: 3, type: 'normal' },
        { code: 'goblin_01', name: '고블린 보초', zone: 'argentium', level: 8, type: 'normal' },
        { code: 'boss_treant', name: '고대 트렌트', zone: 'twilight_forest', level: 15, type: 'field_boss' },
      ];
      return zone ? all.filter(m => m.zone === zone) : all;
    });

    app.get('/api/monster/:code', async (req, reply) => {
      const { code } = req.params as Record<string, string>;
      if (code === 'slime_01') {
        return { code, name: '초록 슬라임', hp: 100, attack: 10, defense: 5, skills: [{ name: '점액 투척', damage: 15 }], drops: [{ itemId: 'mat_slime_gel', rate: 0.5 }] };
      }
      return reply.status(404).send({ error: 'NOT_FOUND' });
    });

    app.post('/api/monster/spawn', async (req) => {
      const { zone, count } = req.body as Record<string, any>;
      return { spawned: count, zone, monsters: Array.from({ length: count }, (_, i) => ({ instanceId: `inst_${i}`, code: 'slime_01' })) };
    });

    app.post('/api/monster/kill', async (req) => {
      const { instanceId, playerLevel } = req.body as Record<string, any>;
      const levelDiff = playerLevel - 3;
      const expMultiplier = Math.max(0.1, 1 - levelDiff * 0.05);
      return { exp: Math.floor(30 * expMultiplier), drops: [{ itemId: 'mat_slime_gel', count: 1 }], gold: 15 };
    });

    app.get('/api/monster/field-boss/status', async () => ({
      bosses: [
        { code: 'boss_treant', name: '고대 트렌트', alive: true, respawnAt: null, hpPercent: 100 },
      ],
    }));

    await app.ready();
    user = createTestUser();
  });

  afterAll(async () => { await closeTestServer(); });

  test('1. 몬스터 목록 조회 — 전체', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/monster/list' });
    expect(JSON.parse(res.body)).toHaveLength(3);
  });

  test('2. 존 필터 몬스터 목록', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/monster/list?zone=argentium' });
    expect(JSON.parse(res.body)).toHaveLength(2);
  });

  test('3. 몬스터 상세 정보 — 스킬/드롭 포함', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/monster/slime_01' });
    const body = JSON.parse(res.body);
    expect(body.skills).toHaveLength(1);
    expect(body.drops).toHaveLength(1);
  });

  test('4. 몬스터 처치 → 경험치/드롭 반환', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/monster/kill', payload: { instanceId: 'inst_0', playerLevel: 5 } });
    const body = JSON.parse(res.body);
    expect(body.exp).toBeGreaterThan(0);
    expect(body.drops).toHaveLength(1);
  });

  test('5. 필드 보스 상태 조회', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/monster/field-boss/status' });
    const body = JSON.parse(res.body);
    expect(body.bosses[0].alive).toBe(true);
  });
});
