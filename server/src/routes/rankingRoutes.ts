/**
 * P5-07: 통합 랭킹 REST API 라우트
 *
 * GET  /api/ranking/:category          — 카테고리별 Top100
 * GET  /api/ranking/:category/me       — 내 순위
 * GET  /api/ranking/:category/around   — 주변 순위
 * GET  /api/ranking/history/:userId    — 시즌 이력
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
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
    reply,
  ) => {
    const { category } = request.params;
    const q = request.query;

    // [IDOR] 쿼리의 userId 를 신뢰하지 않고 인증된 행위자를 사용한다.
    const userId = request.authUserId;
    if (!userId) {
      return reply.status(401).send({ error: '인증이 필요합니다.' });
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
    reply,
  ) => {
    // [IDOR] params 의 userId 를 신뢰하지 않고 인증된 행위자의 이력만 반환한다.
    const userId = request.authUserId;
    if (!userId) {
      return reply.status(401).send({ error: '인증이 필요합니다.' });
    }

    const category = (request.query as { category?: string }).category ?? 'level';

    const history = await rankingManager.getSeasonHistory(userId, category);
    return { success: true, data: { userId, category, history } };
  });
}
