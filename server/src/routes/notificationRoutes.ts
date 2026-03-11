/**
 * notificationRoutes.ts — 알림 시스템 REST API (P5-10)
 *
 * 엔드포인트:
 *   GET    /api/notifications/:userId          — 알림 목록
 *   GET    /api/notifications/:userId/unread    — 미읽음 수
 *   PATCH  /api/notifications/:id/read          — 읽음 처리
 *   PATCH  /api/notifications/read-all          — 일괄 읽음
 *   DELETE /api/notifications/:id               — 알림 삭제
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { notificationManager, NotificationType } from '../notification/notificationManager';

// ── 요청 타입 정의 ──────────────────────────────────────────────

interface UserIdParams {
  userId: string;
}

interface NotificationIdParams {
  id: string;
}

interface ListQuery {
  type?: string;
  isRead?: string;
  limit?: string;
  offset?: string;
}

interface ReadAllBody {
  userId: string;
}

interface DeleteBody {
  userId: string;
}

// ── 라우트 등록 ─────────────────────────────────────────────────

export async function notificationRoutes(fastify: FastifyInstance): Promise<void> {

  // ── GET /api/notifications/:userId — 알림 목록 ───────────────
  fastify.get('/api/notifications/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams; Querystring: ListQuery }>,
    _reply: FastifyReply,
  ) => {
    const { userId } = request.params;
    const { type, isRead, limit, offset } = request.query;

    const result = await notificationManager.list({
      userId,
      type: type as NotificationType | undefined,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return { success: true, data: result };
  });

  // ── GET /api/notifications/:userId/unread — 미읽음 수 ────────
  fastify.get('/api/notifications/:userId/unread', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    _reply: FastifyReply,
  ) => {
    const { userId } = request.params;
    const count = await notificationManager.getUnreadCount(userId);
    return { success: true, data: { unreadCount: count } };
  });

  // ── PATCH /api/notifications/:id/read — 읽음 처리 ────────────
  fastify.patch('/api/notifications/:id/read', async (
    request: FastifyRequest<{ Params: NotificationIdParams; Body: { userId: string } }>,
    reply: FastifyReply,
  ) => {
    const { id } = request.params;
    const { userId } = request.body;

    if (!userId) {
      return reply.status(400).send({ success: false, error: 'userId는 필수입니다.' });
    }

    const success = await notificationManager.markRead(id, userId);
    if (!success) {
      return reply.status(404).send({ success: false, error: '알림을 찾을 수 없습니다.' });
    }

    return { success: true };
  });

  // ── PATCH /api/notifications/read-all — 일괄 읽음 ─────────────
  fastify.patch('/api/notifications/read-all', async (
    request: FastifyRequest<{ Body: ReadAllBody }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.body;

    if (!userId) {
      return reply.status(400).send({ success: false, error: 'userId는 필수입니다.' });
    }

    const count = await notificationManager.markAllRead(userId);
    return { success: true, data: { markedCount: count } };
  });

  // ── DELETE /api/notifications/:id — 알림 삭제 ─────────────────
  fastify.delete('/api/notifications/:id', async (
    request: FastifyRequest<{ Params: NotificationIdParams; Body: DeleteBody }>,
    reply: FastifyReply,
  ) => {
    const { id } = request.params;
    const { userId } = request.body;

    if (!userId) {
      return reply.status(400).send({ success: false, error: 'userId는 필수입니다.' });
    }

    const success = await notificationManager.remove(id, userId);
    if (!success) {
      return reply.status(404).send({ success: false, error: '알림을 찾을 수 없습니다.' });
    }

    return { success: true };
  });
}
