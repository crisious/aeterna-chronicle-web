/**
 * notificationRoutes.ts — 알림 시스템 REST API (P5-10)
 *
 * 엔드포인트:
 *   GET    /api/notifications/:userId          — 알림 목록
 *   GET    /api/notifications/:userId/unread    — 미읽음 수
 *   PATCH  /api/notifications/:id/read          — 읽음 처리
 *   PATCH  /api/notifications/read-all          — 일괄 읽음
 *   DELETE /api/notifications/:id               — 알림 삭제
 *
 * [SECURITY-IDOR] 모든 엔드포인트는 유저 개인 데이터(알림)를 다루므로
 * body/params 의 userId 를 신뢰하지 않고 인증된 행위자(request.authUserId)를 actor 로 사용한다.
 * notificationManager 의 list/getUnreadCount/markRead/markAllRead/remove 는 모두 userId 로 스코프되므로
 * actor 를 authUserId 로 치환하면 소유권 검증이 자동으로 강제된다(타 유저 알림 접근 불가).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { NotificationType } from '../notification/notificationManager';
import { notificationManager } from '../notification/notificationManager';

// ── 요청 타입 정의 ──────────────────────────────────────────────

interface NotificationIdParams {
  id: string;
}

interface ListQuery {
  type?: string;
  isRead?: string;
  limit?: string;
  offset?: string;
}

// ── 라우트 등록 ─────────────────────────────────────────────────

export async function notificationRoutes(fastify: FastifyInstance): Promise<void> {

  // ── GET /api/notifications/:userId — 알림 목록 ───────────────
  // [SECURITY-IDOR] params.userId 는 무시하고 인증된 actor 의 알림만 조회한다.
  fastify.get('/api/notifications/:userId', async (
    request: FastifyRequest<{ Querystring: ListQuery }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

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
  // [SECURITY-IDOR] params.userId 는 무시하고 인증된 actor 의 미읽음 수만 반환한다.
  fastify.get('/api/notifications/:userId/unread', async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const count = await notificationManager.getUnreadCount(userId);
    return { success: true, data: { unreadCount: count } };
  });

  // ── PATCH /api/notifications/:id/read — 읽음 처리 ────────────
  // [SECURITY-IDOR] body.userId 대신 인증된 actor 로 스코프 → 본인 알림만 읽음 처리(소유권 강제).
  fastify.patch('/api/notifications/:id/read', async (
    request: FastifyRequest<{ Params: NotificationIdParams }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { id } = request.params;

    const success = await notificationManager.markRead(id, userId);
    if (!success) {
      return reply.status(404).send({ success: false, error: '알림을 찾을 수 없습니다.' });
    }

    return { success: true };
  });

  // ── PATCH /api/notifications/read-all — 일괄 읽음 ─────────────
  // [SECURITY-IDOR] body.userId 대신 인증된 actor 의 알림만 일괄 읽음 처리.
  fastify.patch('/api/notifications/read-all', async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const count = await notificationManager.markAllRead(userId);
    return { success: true, data: { markedCount: count } };
  });

  // ── DELETE /api/notifications/:id — 알림 삭제 ─────────────────
  // [SECURITY-IDOR] body.userId 대신 인증된 actor 로 스코프 → 본인 알림만 삭제(소유권 강제).
  fastify.delete('/api/notifications/:id', async (
    request: FastifyRequest<{ Params: NotificationIdParams }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { id } = request.params;

    const success = await notificationManager.remove(id, userId);
    if (!success) {
      return reply.status(404).send({ success: false, error: '알림을 찾을 수 없습니다.' });
    }

    return { success: true };
  });
}
