/**
 * E2E 테스트 — 멀티엔딩 시스템 (8 tests)
 * 엔딩 플래그 조회/갱신 / 엔딩 판정 4종 / 이력 조회
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, expectStatus, expectKeys, expectTruthy, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Ending E2E', () => {
  let app: FastifyInstance;
  let testUser: TestUser;

  interface EndingFlags {
    hopeFragments: number;
    shadowPact: boolean;
    companionAlive: boolean;
    chronoMastery: number;
  }

  const defaultFlags: EndingFlags = {
    hopeFragments: 0,
    shadowPact: false,
    companionAlive: true,
    chronoMastery: 0,
  };

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    const userFlags: Record<string, EndingFlags> = {};
    const endingHistory: Record<string, Array<Record<string, unknown>>> = {};

    // GET /api/ending/flags/:userId
    app.get('/api/ending/flags/:userId', async (request) => {
      const { userId } = request.params as { userId: string };
      return { userId, flags: userFlags[userId] || { ...defaultFlags } };
    });

    // PATCH /api/ending/flags/:userId
    app.patch('/api/ending/flags/:userId', async (request) => {
      const { userId } = request.params as { userId: string };
      const body = request.body as Partial<EndingFlags>;
      if (!userFlags[userId]) userFlags[userId] = { ...defaultFlags };
      Object.assign(userFlags[userId], body);
      return { userId, flags: userFlags[userId] };
    });

    // POST /api/ending/judge/:userId — 엔딩 판정
    app.post('/api/ending/judge/:userId', async (request, reply) => {
      const { userId } = request.params as { userId: string };
      const flags = userFlags[userId] || { ...defaultFlags };

      let ending: string;
      let endingName: string;
      let endingDescription: string;
      let reason: string;

      if (flags.hopeFragments >= 10 && flags.companionAlive && flags.chronoMastery >= 5) {
        ending = 'ENDING_A';
        endingName = '시간의 축복 (트루 엔딩)';
        endingDescription = '모든 파편을 모아 시간의 축복을 받는다.';
        reason = '희망 파편 10+ / 동료 생존 / 시간 마스터리 5+';
      } else if (flags.shadowPact) {
        ending = 'ENDING_B';
        endingName = '그림자의 길';
        endingDescription = '어둠의 힘으로 세상을 지배한다.';
        reason = '그림자 서약 체결';
      } else if (!flags.companionAlive) {
        ending = 'ENDING_C';
        endingName = '고독한 여명';
        endingDescription = '동료를 잃고 홀로 새벽을 맞이한다.';
        reason = '동료 사망';
      } else {
        ending = 'ENDING_D';
        endingName = '미완의 연대기';
        endingDescription = '이야기는 아직 끝나지 않았다.';
        reason = '기본 엔딩';
      }

      const record = {
        ending,
        endingName,
        endingDescription,
        reason,
        playthrough: (endingHistory[userId]?.length || 0) + 1,
        recordId: `record-${Date.now()}`,
        flagSnapshot: { ...flags },
      };
      if (!endingHistory[userId]) endingHistory[userId] = [];
      endingHistory[userId].push(record);

      return record;
    });

    // GET /api/ending/history/:userId
    app.get('/api/ending/history/:userId', async (request) => {
      const { userId } = request.params as { userId: string };
      return { userId, history: endingHistory[userId] || [] };
    });

    await app.ready();
    testUser = createTestUser();
  });

  afterAll(async () => {
    await closeTestServer();
  });

  // ── 플래그 관리 ──

  test('1. 초기 플래그 조회 → 기본값', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/ending/flags/${testUser.userId}` });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectKeys(body, ['userId', 'flags']);
    expectEqual(body.flags.hopeFragments, 0, '초기 희망 파편');
    expectEqual(body.flags.companionAlive, true, '동료 생존 기본값');
  });

  test('2. 플래그 갱신 → 반영 확인', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ending/flags/${testUser.userId}`,
      payload: { hopeFragments: 5, chronoMastery: 3 },
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectEqual(body.flags.hopeFragments, 5, '파편 갱신');
    expectEqual(body.flags.chronoMastery, 3, '마스터리 갱신');
  });

  // ── 엔딩 판정 4종 ──

  test('3. 엔딩 D (기본 엔딩) — 조건 미충족', async () => {
    const res = await app.inject({ method: 'POST', url: `/api/ending/judge/${testUser.userId}` });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectEqual(body.ending, 'ENDING_D', '기본 엔딩');
    expectKeys(body, ['ending', 'endingName', 'endingDescription', 'reason', 'playthrough', 'recordId', 'flagSnapshot']);
  });

  test('4. 엔딩 B (그림자의 길) — shadowPact 활성', async () => {
    await app.inject({
      method: 'PATCH',
      url: `/api/ending/flags/${testUser.userId}`,
      payload: { shadowPact: true },
    });
    const res = await app.inject({ method: 'POST', url: `/api/ending/judge/${testUser.userId}` });
    const body = res.json();
    expectEqual(body.ending, 'ENDING_B', '그림자 엔딩');
  });

  test('5. 엔딩 C (고독한 여명) — 동료 사망', async () => {
    await app.inject({
      method: 'PATCH',
      url: `/api/ending/flags/${testUser.userId}`,
      payload: { shadowPact: false, companionAlive: false },
    });
    const res = await app.inject({ method: 'POST', url: `/api/ending/judge/${testUser.userId}` });
    const body = res.json();
    expectEqual(body.ending, 'ENDING_C', '고독 엔딩');
  });

  test('6. 엔딩 A (트루 엔딩) — 모든 조건 충족', async () => {
    await app.inject({
      method: 'PATCH',
      url: `/api/ending/flags/${testUser.userId}`,
      payload: { hopeFragments: 10, shadowPact: false, companionAlive: true, chronoMastery: 5 },
    });
    const res = await app.inject({ method: 'POST', url: `/api/ending/judge/${testUser.userId}` });
    const body = res.json();
    expectEqual(body.ending, 'ENDING_A', '트루 엔딩');
  });

  // ── 이력 조회 ──

  test('7. 엔딩 이력 조회 → 판정 기록 존재', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/ending/history/${testUser.userId}` });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectTruthy(body.history.length >= 3, '복수 엔딩 기록');
  });

  test('8. 미플레이 유저 이력 → 빈 배열', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/ending/history/unknown-user' });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectEqual(body.history.length, 0, '기록 없음');
  });
});
