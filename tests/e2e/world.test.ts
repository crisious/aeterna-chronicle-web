/**
 * E2E 테스트 — 월드맵 시스템 (7 tests)
 * 존 목록 / 존 상세 / 이동 / 현재 위치 / 텔레포트 / 연결 검증
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, expectStatus, expectKeys, expectTruthy, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('World E2E', () => {
  let app: FastifyInstance;
  let testUser: TestUser;

  const zones = [
    { id: 'z1', code: 'elysium_city', name: '엘리시움 도시', region: 'central', levelRange: [1, 10], connections: ['twilight_forest'], isHub: true },
    { id: 'z2', code: 'twilight_forest', name: '황혼의 숲', region: 'central', levelRange: [5, 15], connections: ['elysium_city', 'crystal_cave'], isHub: false },
    { id: 'z3', code: 'crystal_cave', name: '수정 동굴', region: 'underground', levelRange: [10, 20], connections: ['twilight_forest'], isHub: false },
    { id: 'z4', code: 'void_sanctum', name: '공허의 성역', region: 'void', levelRange: [40, 50], connections: [], isHub: true },
  ];

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    const userLocations: Record<string, string> = {};

    // GET /api/world/zones — 목록
    app.get('/api/world/zones', async (request) => {
      const query = request.query as { region?: string };
      const filtered = query.region ? zones.filter((z) => z.region === query.region) : zones;
      return { zones: filtered };
    });

    // GET /api/world/zones/:code — 상세
    app.get('/api/world/zones/:code', async (request, reply) => {
      const { code } = request.params as { code: string };
      const zone = zones.find((z) => z.code === code);
      if (!zone) return reply.status(404).send({ error: '존을 찾을 수 없습니다.' });
      return {
        zone,
        monsters: [{ id: 'm1', name: '슬라임', level: zone.levelRange[0] }],
        npcs: [{ id: 'npc1', name: '상인' }],
      };
    });

    // POST /api/world/move — 이동
    app.post('/api/world/move', async (request, reply) => {
      const body = request.body as { userId: string; targetZoneCode: string };
      const target = zones.find((z) => z.code === body.targetZoneCode);
      if (!target) return reply.status(404).send({ error: '존이 존재하지 않습니다.' });

      const currentCode = userLocations[body.userId] || 'elysium_city';
      const currentZone = zones.find((z) => z.code === currentCode);
      if (currentZone && !currentZone.connections.includes(body.targetZoneCode)) {
        return reply.status(400).send({ error: '연결되지 않은 존입니다.' });
      }

      userLocations[body.userId] = body.targetZoneCode;
      return { success: true, currentZone: body.targetZoneCode };
    });

    // GET /api/world/location/:userId — 현재 위치
    app.get('/api/world/location/:userId', async (request) => {
      const { userId } = request.params as { userId: string };
      const code = userLocations[userId] || 'elysium_city';
      return { userId, currentZone: code };
    });

    // POST /api/world/teleport — 텔레포트 (허브만)
    app.post('/api/world/teleport', async (request, reply) => {
      const body = request.body as { userId: string; targetZoneCode: string };
      const target = zones.find((z) => z.code === body.targetZoneCode);
      if (!target) return reply.status(404).send({ error: '존을 찾을 수 없습니다.' });
      if (!target.isHub) {
        return reply.status(400).send({ error: '허브 존만 텔레포트 가능합니다.' });
      }
      userLocations[body.userId] = body.targetZoneCode;
      return { success: true, currentZone: body.targetZoneCode };
    });

    await app.ready();
    testUser = createTestUser();
  });

  afterAll(async () => {
    await closeTestServer();
  });

  test('1. 전체 존 목록 조회', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/world/zones' });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectEqual(body.zones.length, 4, '전체 존 수');
  });

  test('2. 리전 필터 → central만 반환', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/world/zones?region=central' });
    expectEqual(res.json().zones.length, 2, 'central 2개');
  });

  test('3. 존 상세 조회 → 몬스터/NPC 포함', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/world/zones/twilight_forest' });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectKeys(body, ['zone', 'monsters', 'npcs']);
    expectEqual(body.zone.name, '황혼의 숲', '존 이름');
  });

  test('4. 연결된 존으로 이동 → success', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/world/move',
      payload: { userId: testUser.userId, targetZoneCode: 'twilight_forest' },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().currentZone, 'twilight_forest', '이동 완료');
  });

  test('5. 연결되지 않은 존 이동 → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/world/move',
      payload: { userId: testUser.userId, targetZoneCode: 'void_sanctum' },
    });
    expectStatus(res.statusCode, 400);
  });

  test('6. 허브 텔레포트 → success', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/world/teleport',
      payload: { userId: testUser.userId, targetZoneCode: 'void_sanctum' },
    });
    expectStatus(res.statusCode, 200);
    expectTruthy(res.json().success, '텔레포트 성공');
  });

  test('7. 비허브 존 텔레포트 시도 → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/world/teleport',
      payload: { userId: testUser.userId, targetZoneCode: 'crystal_cave' },
    });
    expectStatus(res.statusCode, 400);
  });
});
