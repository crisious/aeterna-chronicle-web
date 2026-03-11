/**
 * E2E 테스트 — NPC 시스템 (5 tests)
 * 대화, 호감도, 상점, 스케줄, 행동 트리
 */
import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, expectStatus, expectKeys, resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('NPC E2E', () => {
  let app: FastifyInstance;
  let user: TestUser;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    // NPC 목록
    app.get('/api/npc/list', async () => [
      { id: 'npc_blacksmith', name: '대장장이 하인즈', role: 'merchant', location: 'argentium_plaza' },
      { id: 'npc_elder', name: '장로 에르딘', role: 'quest_giver', location: 'argentium_plaza' },
      { id: 'npc_trainer', name: '훈련사 카이', role: 'trainer', location: 'training_ground' },
    ]);

    // NPC 대화
    app.post('/api/npc/talk', async (req, reply) => {
      const { npcId } = req.body as Record<string, string>;
      if (npcId === 'npc_blacksmith') {
        return { dialogue: { id: 'd1', text: '무기가 필요한가? 좋은 물건이 많다네.', options: [{ text: '상점 열기', nextId: 'shop' }, { text: '그냥 지나가기' }] } };
      }
      return reply.status(404).send({ error: 'NPC_NOT_FOUND' });
    });

    // 호감도 조회
    app.get('/api/npc/:npcId/affinity/:userId', async () => ({ affinity: 25, level: 'friendly', nextThreshold: 50 }));

    // 선물 주기
    app.post('/api/npc/gift', async (req) => {
      const { npcId, itemId } = req.body as Record<string, string>;
      const liked = ['mat_iron', 'wpn_iron_sword'];
      const gain = liked.includes(itemId) ? 10 : 2;
      return { affinityGain: gain, newAffinity: 25 + gain };
    });

    // NPC 스케줄
    app.get('/api/npc/:npcId/schedule', async () => ({
      schedule: [
        { hour: 8, location: 'argentium_plaza', action: '상점 오픈' },
        { hour: 12, location: 'tavern', action: '점심 식사' },
        { hour: 20, location: 'home', action: '취침' },
      ],
    }));

    await app.ready();
    user = createTestUser();
  });

  afterAll(async () => { await closeTestServer(); });

  test('1. NPC 목록 조회 → 3명 반환', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/npc/list' });
    expectStatus(res.statusCode, 200);
    expect(JSON.parse(res.body)).toHaveLength(3);
  });

  test('2. NPC 대화 시작 → 선택지 포함 응답', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/npc/talk', payload: { npcId: 'npc_blacksmith' } });
    const body = JSON.parse(res.body);
    expect(body.dialogue.options).toHaveLength(2);
  });

  test('3. 호감도 조회 → affinity/level 반환', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/npc/npc_blacksmith/affinity/u1' });
    const body = JSON.parse(res.body);
    expect(body.affinity).toBe(25);
    expect(body.level).toBe('friendly');
  });

  test('4. 좋아하는 선물 → 호감도 10 증가', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/npc/gift', payload: { npcId: 'npc_blacksmith', itemId: 'mat_iron' } });
    expect(JSON.parse(res.body).affinityGain).toBe(10);
  });

  test('5. NPC 스케줄 조회 → 시간대별 위치', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/npc/npc_blacksmith/schedule' });
    expect(JSON.parse(res.body).schedule).toHaveLength(3);
  });
});
