/**
 * P6-14: KPI/BI 분석 REST API 라우트
 * GET /analytics/kpi — 기간별 KPI 스냅샷
 * GET /analytics/retention — 리텐션 곡선
 * GET /analytics/economy — 경제 지표 (인플레이션/유통량)
 * GET /analytics/revenue — 매출 시계열
 * POST /analytics/snapshot — 수동 스냅샷 트리거
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getKpiSnapshots,
  getEconomyMetrics,
  getRevenueTimeSeries,
  calculateRetention,
  runDailyKpiSnapshot,
  KpiMetric,
} from '../analytics/analyticsEngine';
import { requireAdmin } from '../admin/authMiddleware';

// ─── 타입 ────────────────────────────────────────────────────────

interface KpiQuery {
  startDate?: string;
  endDate?: string;
  metric?: KpiMetric;
  segment?: string;
}

interface RetentionQuery {
  cohortDate?: string; // YYYY-MM-DD
  days?: string;       // 쉼표 구분: "1,7,30"
}

interface RevenueQuery {
  startDate?: string;
  endDate?: string;
}

// ─── 라우트 등록 ─────────────────────────────────────────────────

export async function analyticsRoutes(fastify: FastifyInstance): Promise<void> {
  // ── KPI 스냅샷 조회 ──
  fastify.get(
    '/api/analytics/kpi',
    { preHandler: requireAdmin('moderator', 'view_analytics') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as KpiQuery;

      const endDate = query.endDate ? new Date(query.endDate) : new Date();
      const startDate = query.startDate
        ? new Date(query.startDate)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 기본 30일

      try {
        const snapshots = await getKpiSnapshots({
          startDate,
          endDate,
          metric: query.metric,
          segment: query.segment,
        });
        return reply.send({ startDate, endDate, snapshots });
      } catch (err) {
        return reply.status(500).send({ error: (err as Error).message });
      }
    },
  );

  // ── 리텐션 곡선 ──
  fastify.get(
    '/api/analytics/retention',
    { preHandler: requireAdmin('moderator', 'view_analytics') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as RetentionQuery;

      const cohortDate = query.cohortDate
        ? new Date(query.cohortDate)
        : new Date(Date.now() - 24 * 60 * 60 * 1000); // 기본: 어제

      const days = query.days
        ? query.days.split(',').map(d => parseInt(d.trim(), 10))
        : [1, 7, 30];

      try {
        const results = await Promise.all(
          days.map(async (dayN) => ({
            day: dayN,
            retention: await calculateRetention(cohortDate, dayN),
          })),
        );
        return reply.send({ cohortDate, retentions: results });
      } catch (err) {
        return reply.status(500).send({ error: (err as Error).message });
      }
    },
  );

  // ── 경제 지표 ──
  fastify.get(
    '/api/analytics/economy',
    { preHandler: requireAdmin('moderator', 'view_analytics') },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const metrics = await getEconomyMetrics();
        return reply.send(metrics);
      } catch (err) {
        return reply.status(500).send({ error: (err as Error).message });
      }
    },
  );

  // ── 매출 시계열 ──
  fastify.get(
    '/api/analytics/revenue',
    { preHandler: requireAdmin('moderator', 'view_analytics') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as RevenueQuery;

      const endDate = query.endDate ? new Date(query.endDate) : new Date();
      const startDate = query.startDate
        ? new Date(query.startDate)
        : new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000); // 기본 90일

      try {
        const series = await getRevenueTimeSeries(startDate, endDate);
        return reply.send({ startDate, endDate, series });
      } catch (err) {
        return reply.status(500).send({ error: (err as Error).message });
      }
    },
  );

  // ── 수동 스냅샷 트리거 (어드민 전용) ──
  fastify.post(
    '/api/analytics/snapshot',
    { preHandler: requireAdmin('admin', 'trigger_snapshot') },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await runDailyKpiSnapshot();
        return reply.send({ success: true, ...result });
      } catch (err) {
        return reply.status(500).send({ error: (err as Error).message });
      }
    },
  );
}
