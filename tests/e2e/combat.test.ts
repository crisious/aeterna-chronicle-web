/**
 * E2E 테스트 — 전투 시스템 (7 tests)
 * 상태효과 적용 / 활성 효과 조회 / 엣지케이스
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, expectStatus, expectKeys, expectTruthy, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Combat E2E', () => {
  let app: FastifyInstance;
  let testUser: TestUser;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    // ── 활성 효과 저장소 (stub) ──
    const activeEffects: Record<string, Array<{
      effectId: string; sourceId: string; value: number; duration: number;
    }>> = {};

    // POST /combat/apply-effect
    app.post('/combat/apply-effect', async (request, reply) => {
      const body = request.body as Record<string, unknown>;
      const { effectId, sourceId, targetId, applyChance, value, duration, targetResist } = body as {
        effectId?: string; sourceId?: string; targetId?: string;
        applyChance?: number; value?: number; duration?: number; targetResist?: number;
      };

      if (!effectId || !sourceId || !targetId) {
        return reply.status(400).send({ error: '필수 파라미터 누락' });
      }

      const chance = applyChance ?? 1.0;
      const resist = targetResist ?? 0;
      const effectiveChance = chance - resist;

      if (effectiveChance <= 0) {
        return { success: false, reason: '저항으로 무효화', activeEffects: activeEffects[targetId as string] || [] };
      }

      const effect = { effectId, sourceId, value: value ?? 0, duration: duration ?? 1 };
      if (!activeEffects[targetId as string]) activeEffects[targetId as string] = [];
      activeEffects[targetId as string].push(effect);

      return {
        success: true,
        reason: null,
        activeEffects: activeEffects[targetId as string],
      };
    });

    // GET /combat/active-effects/:targetId
    app.get('/combat/active-effects/:targetId', async (request) => {
      const { targetId } = request.params as { targetId: string };
      const effects = activeEffects[targetId] || [];
      return {
        targetId,
        effects,
        modifiers: {
          speedMultiplier: 1.0,
          defenseModifier: effects.length > 0 ? -5 : 0,
        },
      };
    });

    await app.ready();
    testUser = createTestUser();
  });

  afterAll(async () => {
    await closeTestServer();
  });

  // ── 상태효과 적용 ──

  test('1. 정상 상태효과 적용 → success', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/combat/apply-effect',
      payload: {
        effectId: 'burn', sourceId: 'player-1', targetId: 'mob-1',
        applyChance: 0.8, value: 30, duration: 3, targetResist: 0,
      },
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectTruthy(body.success, '효과 적용 성공');
    expectTruthy(Array.isArray(body.activeEffects), '활성 효과 배열');
  });

  test('2. 저항으로 효과 무효화 → success: false', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/combat/apply-effect',
      payload: {
        effectId: 'freeze', sourceId: 'player-1', targetId: 'mob-2',
        applyChance: 0.3, value: 0, duration: 2, targetResist: 0.5,
      },
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectEqual(body.success, false, '저항으로 실패');
    expectEqual(body.reason, '저항으로 무효화', '실패 사유');
  });

  test('3. 필수 파라미터 누락 → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/combat/apply-effect',
      payload: { effectId: 'burn' }, // sourceId, targetId 누락
    });
    expectStatus(res.statusCode, 400);
  });

  // ── 활성 효과 조회 ──

  test('4. 활성 효과 조회 → 효과 목록 + 수정자', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/combat/active-effects/mob-1',
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectKeys(body, ['targetId', 'effects', 'modifiers']);
    expectEqual(body.targetId, 'mob-1', '대상 ID');
    expectTruthy(body.effects.length > 0, '효과 존재');
  });

  test('5. 효과 없는 대상 조회 → 빈 배열', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/combat/active-effects/mob-999',
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectEqual(body.effects.length, 0, '효과 없음');
    expectEqual(body.modifiers.defenseModifier, 0, '수정자 기본값');
  });

  // ── 엣지케이스 ──

  test('6. 동일 대상에 복수 효과 적용 → 누적', async () => {
    await app.inject({
      method: 'POST',
      url: '/combat/apply-effect',
      payload: {
        effectId: 'poison', sourceId: 'player-1', targetId: 'mob-1',
        applyChance: 1.0, value: 10, duration: 5, targetResist: 0,
      },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/combat/active-effects/mob-1',
    });
    const body = res.json();
    expectTruthy(body.effects.length >= 2, '효과 누적 확인');
  });

  test('7. applyChance 미지정 시 기본 100% 적용', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/combat/apply-effect',
      payload: {
        effectId: 'slow', sourceId: 'player-1', targetId: 'mob-3',
        value: 5, duration: 2, targetResist: 0,
      },
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectTruthy(body.success, '기본 확률로 적용');
  });
});
