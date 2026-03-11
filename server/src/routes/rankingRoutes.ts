/**
 * P5-07: 통합 랭킹 REST API 라우트
 *
 * GET  /api/ranking/:category          — 카테고리별 Top100
 * GET  /api/ranking/:category/me       — 내 순위
 * GET  /api/ranking/:category/around   — 주변 순위
 * GET  /api/ranking/history/:userId    — 시즌 이력
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { rankingManager } from '../ranking/rankingManager';

// ─── 타입 ──────────────────────────────────────────────────────

interface CategoryParams { category: string }
interface UserIdParams { userId: string }

interface RankingQuery {
  season?: string;
  limit?: string;
  userId?: string;
  range?: string;
}

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function rankingRoutes(fastify: FastifyInstance): Promise<void> {

  /** GET /api/ranking/:category — 카테고리별 Top100 */
  fastify.get('/api/ranking/:category', async (
    request: FastifyRequest<{ Params: CategoryParams; Querystring: RankingQuery }>,
  ) => {
    const { category } = request.params;
    const q = request.query;
    const limit = q.limit ? Math.min(Number(q.limit), 100) : 100;

    const entries = await rankingManager.getTopN(category, limit, q.season);
    return {
      success: true,
      data: {
        category,
        season: q.season ?? 'current',
        entries,
      },
    };
  });

  /** GET /api/ranking/:category/me — 내 순위 */
  fastify.get('/api/ranking/:category/me', async (
    request: FastifyRequest<{ Params: CategoryParams; Querystring: RankingQuery }>,
  ) => {
    const { category } = request.params;
    const q = request.query;
    const userId = q.userId;

    if (!userId) {
      return { success: false, error: 'userId 쿼리 파라미터가 필요합니다' };
    }

    const entry = await rankingManager.getMyRank(userId, category, q.season);
    if (!entry) {
      return { success: false, error: '랭킹 데이터가 없습니다' };
    }

    return { success: true, data: entry };
  });

  /** GET /api/ranking/:category/around — 주변 순위 */
  fastify.get('/api/ranking/:category/around', async (
    request: FastifyRequest<{ Params: CategoryParams; Querystring: RankingQuery }>,
  ) => {
    const { category } = request.params;
    const q = request.query;
    const userId = q.userId;
    const range = q.range ? Number(q.range) : 5;

    if (!userId) {
      return { success: false, error: 'userId 쿼리 파라미터가 필요합니다' };
    }

    const entries = await rankingManager.getAroundMe(userId, category, range, q.season);
    return { success: true, data: { category, entries } };
  });

  /** GET /api/ranking/history/:userId — 시즌 이력 */
  fastify.get('/api/ranking/history/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams; Querystring: { category?: string } }>,
  ) => {
    const { userId } = request.params;
    const category = (request.query as { category?: string }).category ?? 'level';

    const history = await rankingManager.getSeasonHistory(userId, category);
    return { success: true, data: { userId, category, history } };
  });
}
