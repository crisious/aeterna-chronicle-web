/**
 * P6-12: 신고/제재 REST API 라우트
 * POST /report — 유저 신고 접수
 * GET  /admin/reports — GM 검토 큐
 * PATCH /admin/reports/:id/review — 신고 검토 + 제재 적용
 * GET  /admin/sanctions/:userId — 유저 제재 이력
 * POST /admin/sanctions/lift — 제재 수동 해제
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  createReport,
  getReportQueue,
  reviewReport,
  getUserSanctions,
  liftSanction,
  expireOverdueSanctions,
  ReportType,
  ReportStatus,
  SanctionAction,
} from '../report/reportManager';
import { requireAdmin, getAdminUser } from '../admin/authMiddleware';

// ─── 타입 ────────────────────────────────────────────────────────

interface ReportBody {
  reporterId: string;
  targetId: string;
  type: ReportType;
  description: string;
  evidence?: Record<string, unknown>;
}

interface ReportQueueQuery {
  status?: ReportStatus;
  type?: ReportType;
  page?: string;
  limit?: string;
}

interface ReviewBody {
  action: SanctionAction | null;
  reviewNote?: string;
}

interface ReviewParams {
  id: string;
}

interface SanctionParams {
  userId: string;
}

interface SanctionQuery {
  activeOnly?: string;
}

interface LiftBody {
  sanctionId: string;
}

// ─── 라우트 등록 ─────────────────────────────────────────────────

export async function reportRoutes(fastify: FastifyInstance): Promise<void> {
  // ── 유저용: 신고 접수 ──
  fastify.post('/api/report', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as ReportBody;

    if (!body.reporterId || !body.targetId || !body.type || !body.description) {
      return reply.status(400).send({ error: '필수 필드 누락 (reporterId, targetId, type, description)' });
    }

    const validTypes: ReportType[] = [
      'harassment', 'cheating', 'botting', 'inappropriate_name', 'spam', 'other',
    ];
    if (!validTypes.includes(body.type)) {
      return reply.status(400).send({ error: `잘못된 신고 유형: ${body.type}` });
    }

    try {
      const result = await createReport(body);
      if (result.duplicate) {
        return reply.status(409).send({ error: '동일 대상에 대한 대기 중 신고가 이미 존재합니다.', report: result.report });
      }
      return reply.status(201).send(result.report);
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ── GM용: 신고 큐 조회 ──
  fastify.get(
    '/api/admin/reports',
    { preHandler: requireAdmin('moderator', 'view_reports') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as ReportQueueQuery;
      try {
        const result = await getReportQueue({
          status: query.status,
          type: query.type,
          page: query.page ? parseInt(query.page, 10) : undefined,
          limit: query.limit ? parseInt(query.limit, 10) : undefined,
        });
        return reply.send(result);
      } catch (err) {
        return reply.status(500).send({ error: (err as Error).message });
      }
    },
  );

  // ── GM용: 신고 검토 + 제재 적용/기각 ──
  fastify.patch(
    '/api/admin/reports/:id/review',
    { preHandler: requireAdmin('moderator', 'review_report') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as ReviewParams;
      const body = request.body as ReviewBody;
      const admin = getAdminUser(request);

      const validActions: (SanctionAction | null)[] = [
        null, 'warn', 'mute_1h', 'mute_24h', 'ban_7d', 'ban_30d', 'ban_permanent',
      ];
      if (!validActions.includes(body.action)) {
        return reply.status(400).send({ error: `잘못된 제재 액션: ${body.action}` });
      }

      try {
        const result = await reviewReport({
          reportId: params.id,
          reviewerId: admin.userId,
          action: body.action,
          reviewNote: body.reviewNote,
        });
        return reply.send(result);
      } catch (err) {
        return reply.status(400).send({ error: (err as Error).message });
      }
    },
  );

  // ── GM용: 유저 제재 이력 조회 ──
  fastify.get(
    '/api/admin/sanctions/:userId',
    { preHandler: requireAdmin('moderator', 'view_sanctions') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as SanctionParams;
      const query = request.query as SanctionQuery;
      try {
        const sanctions = await getUserSanctions(
          params.userId,
          query.activeOnly === 'true',
        );
        return reply.send({ userId: params.userId, sanctions });
      } catch (err) {
        return reply.status(500).send({ error: (err as Error).message });
      }
    },
  );

  // ── GM용: 제재 수동 해제 ──
  fastify.post(
    '/api/admin/sanctions/lift',
    { preHandler: requireAdmin('admin', 'lift_sanction') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as LiftBody;
      const admin = getAdminUser(request);

      if (!body.sanctionId) {
        return reply.status(400).send({ error: 'sanctionId 필수' });
      }

      try {
        const sanction = await liftSanction(body.sanctionId, admin.userId);
        return reply.send({ lifted: true, sanction });
      } catch (err) {
        return reply.status(400).send({ error: (err as Error).message });
      }
    },
  );

  // ── 내부용: 만료 제재 자동 해제 (헬스체크 부속) ──
  fastify.post(
    '/api/admin/sanctions/expire',
    { preHandler: requireAdmin('admin', 'expire_sanctions') },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const count = await expireOverdueSanctions();
        return reply.send({ expired: count });
      } catch (err) {
        return reply.status(500).send({ error: (err as Error).message });
      }
    },
  );
}
