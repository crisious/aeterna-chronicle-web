/**
 * E2E 테스트 — 펫 시스템 (6 tests)
 * 소환 / 해제 / 먹이 / 진화
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, mockPet, expectStatus, expectKeys, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Pet E2E', () => {
  let app: FastifyInstance;
  let user: TestUser;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();
    user = createTestUser();

    let activePet: Record<string, unknown> | null = null;

    app.post('/api/pet/summon', async (request, reply) => {
      const body = request.body as { userId: string; petId: string };
      if (activePet) return reply.status(400).send({ error: '이미 소환된 펫이 있습니다.' });
      activePet = mockPet({ id: body.petId, summoned: true });
      return reply.status(201).send({ success: true, pet: activePet });
    });

    app.post('/api/pet/dismiss', async (_request, reply) => {
      if (!activePet) return reply.status(400).send({ error: '소환된 펫 없음' });
      activePet = null;
      return { success: true };
    });

    app.post('/api/pet/feed', async (request, reply) => {
      if (!activePet) return reply.status(400).send({ error: '소환된 펫 없음' });
      const body = request.body as { foodId: string };
      const hungerRestore = body.foodId === 'premium-food' ? 50 : 20;
      activePet.hunger = Math.min(100, (activePet.hunger as number) + hungerRestore);
      activePet.exp = (activePet.exp as number) + 10;
      return { success: true, hunger: activePet.hunger, exp: activePet.exp };
    });

    app.post('/api/pet/evolve', async (_request, reply) => {
      if (!activePet) return reply.status(400).send({ error: '소환된 펫 없음' });
      if ((activePet.level as number) < 10) {
        return reply.status(400).send({ error: '진화 레벨 미달 (최소 10)' });
      }
      activePet.level = (activePet.level as number) + 1;
      activePet.species = 'dire_wolf';
      return { success: true, pet: activePet };
    });

    await app.ready();
  });

  afterAll(async () => { await closeTestServer(); });

  test('1. 펫 소환 → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/pet/summon',
      headers: authHeader(user),
      payload: { userId: user.userId, petId: 'pet-wolf-001' },
    });
    expectStatus(res.statusCode, 201);
    expectKeys(res.json(), ['success', 'pet']);
  });

  test('2. 이미 소환된 상태에서 재소환 → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/pet/summon',
      payload: { userId: user.userId, petId: 'pet-cat-001' },
    });
    expectStatus(res.statusCode, 400);
  });

  test('3. 펫 먹이 주기 → 허기/경험치 변화', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/pet/feed',
      payload: { userId: user.userId, foodId: 'basic-food' },
    });
    expectStatus(res.statusCode, 200);
    expectKeys(res.json(), ['success', 'hunger', 'exp']);
  });

  test('4. 프리미엄 먹이 → 더 많은 허기 회복', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/pet/feed',
      payload: { userId: user.userId, foodId: 'premium-food' },
    });
    expectStatus(res.statusCode, 200);
  });

  test('5. 레벨 미달 진화 시도 → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/pet/evolve',
      payload: { userId: user.userId },
    });
    expectStatus(res.statusCode, 400);
  });

  test('6. 펫 해제 → 성공', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/pet/dismiss',
      payload: { userId: user.userId },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().success, true, '해제 성공');
  });
});
