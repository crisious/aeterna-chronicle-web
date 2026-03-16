/**
 * 운영 알림 REST API 라우트 (P6-18)
 * GET   /ops/alerts/history — 알림 이력 조회
 * POST  /ops/alerts/test    — 테스트 알림 발송
 * PATCH /ops/alerts/config  — 알림 설정 업데이트
 * GET   /ops/alerts/config  — 알림 설정 조회
 */
import { FastifyInstance } from 'fastify';
import { opsAlertManager, AlertConfig } from '../ops/opsAlertManager';
import { requireAdmin } from '../admin/authMiddleware';

// ─── 쿼리/바디 타입 ─────────────────────────────────────────────
interface HistoryQuery {
  limit?: string;
  offset?: string;
}

type ConfigBody = Partial<AlertConfig>;

// ─── 라우트 등록 ────────────────────────────────────────────────
export async function opsRoutes(fastify: FastifyInstance): Promise<void> {

  // 알림 이력 조회 (관리자 전용)
  fastify.get<{ Querystring: HistoryQuery }>('/ops/alerts/history', {
    preHandler: requireAdmin('admin'),
  }, async (req, reply) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const history = opsAlertManager.getHistory(limit, offset);
    return reply.send({ ok: true, data: history, count: history.length });
  });

  // 테스트 알림 발송 (관리자 전용)
  fastify.post('/ops/alerts/test', {
    preHandler: requireAdmin('admin'),
  }, async (_req, reply) => {
    const result = await opsAlertManager.sendTestAlert();
    return reply.send({ ok: true, delivery: result });
  });

  // 알림 설정 업데이트 (관리자 전용)
  fastify.patch<{ Body: ConfigBody }>('/ops/alerts/config', {
    preHandler: requireAdmin('admin'),
  }, async (req, reply) => {
    const updated = opsAlertManager.updateConfig(req.body);
    return reply.send({ ok: true, config: updated });
  });

  // 알림 설정 조회 (관리자 전용)
  fastify.get('/ops/alerts/config', {
    preHandler: requireAdmin('admin'),
  }, async (_req, reply) => {
    return reply.send({ ok: true, config: opsAlertManager.getConfig() });
  });
}
