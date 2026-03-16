/**
 * 오픈 베타 REST API 라우트 (P6-19)
 * POST  /beta/validate-code       — 초대 코드 검증 + 사용
 * POST  /beta/feedback             — 피드백 접수
 * GET   /admin/beta/codes          — 초대 코드 관리 (관리자)
 * POST  /admin/beta/generate       — 초대 코드 생성 (관리자)
 * GET   /admin/beta/feedback       — 피드백 조회 (관리자)
 * PATCH /admin/beta/feedback/:id   — 피드백 상태 변경 (관리자)
 * GET   /admin/beta/stats          — 베타 통계 (관리자)
 */
import { FastifyInstance } from 'fastify';
import { betaManager } from '../beta/betaManager';
import { requireAdmin } from '../admin/authMiddleware';

// ─── 타입 정의 ──────────────────────────────────────────────────
interface ValidateCodeBody {
  code: string;
  userId: string;
}

interface FeedbackBody {
  userId: string;
  type: string;
  title: string;
  description: string;
  priority?: string;
  screenshot?: string;
  metadata?: Record<string, unknown>;
}

interface GenerateBody {
  count?: number;
  expiryDays?: number;
  email?: string;
}

interface CodesQuery {
  used?: string;
  limit?: string;
  offset?: string;
}

interface FeedbackQuery {
  type?: string;
  status?: string;
  limit?: string;
  offset?: string;
}

interface FeedbackIdParams {
  id: string;
}

interface FeedbackStatusBody {
  status: string;
}

// ─── 라우트 등록 ────────────────────────────────────────────────
export async function betaRoutes(fastify: FastifyInstance): Promise<void> {

  // ── 공개 API ──────────────────────────────────────────────────

  // 초대 코드 검증 + 사용
  fastify.post<{ Body: ValidateCodeBody }>('/beta/validate-code', async (req, reply) => {
    const { code, userId } = req.body;
    if (!code || !userId) {
      return reply.status(400).send({ ok: false, error: 'code와 userId 필수' });
    }
    const result = await betaManager.redeemCode(code, userId);
    if (!result.valid) {
      return reply.status(400).send({ ok: false, error: result.reason });
    }
    return reply.send({ ok: true, code: result.code });
  });

  // 피드백 접수
  fastify.post<{ Body: FeedbackBody }>('/beta/feedback', async (req, reply) => {
    const { userId, type, title, description, priority, screenshot, metadata } = req.body;
    if (!userId || !type || !title || !description) {
      return reply.status(400).send({ ok: false, error: 'userId, type, title, description 필수' });
    }
    const validTypes = ['bug', 'feature', 'balance', 'ux', 'other'];
    if (!validTypes.includes(type)) {
      return reply.status(400).send({ ok: false, error: `type은 ${validTypes.join(', ')} 중 하나` });
    }
    const report = await betaManager.submitFeedback({
      userId, type, title, description, priority, screenshot, metadata,
    });
    return reply.send({ ok: true, report });
  });

  // ── 관리자 API ────────────────────────────────────────────────

  // 초대 코드 목록 조회
  fastify.get<{ Querystring: CodesQuery }>('/admin/beta/codes', {
    preHandler: requireAdmin('admin'),
  }, async (req, reply) => {
    const used = req.query.used !== undefined ? req.query.used === 'true' : undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const result = await betaManager.listCodes({ used, limit, offset });
    return reply.send({ ok: true, ...result });
  });

  // 초대 코드 배치 생성
  fastify.post<{ Body: GenerateBody }>('/admin/beta/generate', {
    preHandler: requireAdmin('admin'),
  }, async (req, reply) => {
    const count = Math.min(req.body.count ?? 100, 500);
    const expiryDays = req.body.expiryDays ?? 30;
    const result = await betaManager.generateCodes(count, expiryDays, req.body.email);
    return reply.send({ ok: true, ...result });
  });

  // 피드백 목록 조회
  fastify.get<{ Querystring: FeedbackQuery }>('/admin/beta/feedback', {
    preHandler: requireAdmin('admin'),
  }, async (req, reply) => {
    const result = await betaManager.listFeedback({
      type: req.query.type,
      status: req.query.status,
      limit: Math.min(Number(req.query.limit) || 50, 200),
      offset: Number(req.query.offset) || 0,
    });
    return reply.send({ ok: true, ...result });
  });

  // 피드백 상태 업데이트
  fastify.patch<{ Params: FeedbackIdParams; Body: FeedbackStatusBody }>('/admin/beta/feedback/:id', {
    preHandler: requireAdmin('admin'),
  }, async (req, reply) => {
    const validStatuses = ['open', 'acknowledged', 'in_progress', 'resolved', 'wontfix'];
    if (!validStatuses.includes(req.body.status)) {
      return reply.status(400).send({
        ok: false,
        error: `status는 ${validStatuses.join(', ')} 중 하나`,
      });
    }
    const report = await betaManager.updateFeedbackStatus(req.params.id, req.body.status);
    return reply.send({ ok: true, report });
  });

  // 베타 통계
  fastify.get('/admin/beta/stats', {
    preHandler: requireAdmin('admin'),
  }, async (_req, reply) => {
    const stats = await betaManager.getStats();
    return reply.send({ ok: true, ...stats });
  });
}
