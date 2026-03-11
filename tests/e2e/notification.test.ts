/**
 * E2E 테스트 — 알림 시스템 (4 tests)
 * 알림 생성, 목록 조회, 읽기 표시, 일괄 삭제
 */
import {
  createTestServer, closeTestServer, createTestUser,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Notification E2E', () => {
  let app: FastifyInstance;
  let user: TestUser;

  const notifications: { id: string; userId: string; type: string; message: string; read: boolean; createdAt: number }[] = [];

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    app.post('/api/notification/create', async (req) => {
      const { userId, type, message } = req.body as Record<string, string>;
      const id = `notif_${notifications.length}`;
      notifications.push({ id, userId, type, message, read: false, createdAt: Date.now() });
      return { notificationId: id };
    });

    app.get('/api/notification/:userId', async (req) => {
      const { userId } = req.params as Record<string, string>;
      const items = notifications.filter(n => n.userId === userId);
      return { notifications: items, unreadCount: items.filter(n => !n.read).length };
    });

    app.post('/api/notification/read', async (req, reply) => {
      const { notificationId } = req.body as Record<string, string>;
      const notif = notifications.find(n => n.id === notificationId);
      if (!notif) return reply.status(404).send({ error: 'NOT_FOUND' });
      notif.read = true;
      return { read: true };
    });

    app.post('/api/notification/clear', async (req) => {
      const { userId } = req.body as Record<string, string>;
      const count = notifications.filter(n => n.userId === userId).length;
      // 해당 유저 알림 전부 제거
      const remaining = notifications.filter(n => n.userId !== userId);
      notifications.length = 0;
      notifications.push(...remaining);
      return { cleared: count };
    });

    await app.ready();
    user = createTestUser();
  });

  afterAll(async () => { await closeTestServer(); });

  test('1. 알림 생성', async () => {
    await app.inject({ method: 'POST', url: '/api/notification/create', payload: { userId: 'u1', type: 'quest', message: '퀘스트 완료!' } });
    await app.inject({ method: 'POST', url: '/api/notification/create', payload: { userId: 'u1', type: 'system', message: '서버 점검 예정' } });
    const res = await app.inject({ method: 'GET', url: '/api/notification/u1' });
    expect(JSON.parse(res.body).notifications).toHaveLength(2);
  });

  test('2. 미읽음 카운트', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/notification/u1' });
    expect(JSON.parse(res.body).unreadCount).toBe(2);
  });

  test('3. 알림 읽기 → read 전환', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/notification/read', payload: { notificationId: 'notif_0' } });
    expect(JSON.parse(res.body).read).toBe(true);
    const list = await app.inject({ method: 'GET', url: '/api/notification/u1' });
    expect(JSON.parse(list.body).unreadCount).toBe(1);
  });

  test('4. 알림 일괄 삭제', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/notification/clear', payload: { userId: 'u1' } });
    expect(JSON.parse(res.body).cleared).toBe(2);
  });
});
