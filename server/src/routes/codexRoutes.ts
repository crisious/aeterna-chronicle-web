/**
 * codexRoutes.ts — 도감/컬렉션 REST API (P5-08)
 *
 * 엔드포인트:
 *   GET  /api/codex/:userId              — 전체 도감
 *   GET  /api/codex/:userId/:category    — 카테고리별 도감
 *   GET  /api/codex/completion/:userId   — 완성도 조회
 *   POST /api/codex/discover             — 발견 등록 (서버 내부용)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { codexManager, CodexCategory } from '../codex/codexManager';

// ── 요청 타입 정의 ──────────────────────────────────────────────

interface UserIdParams {
  userId: string;
}

interface CategoryParams extends UserIdParams {
  category: string;
}

interface DiscoverBody {
  userId: string;
  category: CodexCategory;
  targetCode: string;
  percentage?: number;
}

// ── 유효 카테고리 검증 ──────────────────────────────────────────

const VALID_CATEGORIES: ReadonlySet<string> = new Set([
  'monster', 'item', 'npc', 'zone', 'skill',
]);

// ── 라우트 등록 ─────────────────────────────────────────────────

export async function codexRoutes(fastify: FastifyInstance): Promise<void> {

  // ── GET /api/codex/completion/:userId — 완성도 조회 ───────────
  // (completion 경로가 :category보다 먼저 매칭되어야 하므로 위에 배치)
  fastify.get('/api/codex/completion/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    _reply: FastifyReply,
  ) => {
    const { userId } = request.params;
    const completion = await codexManager.getCompletion(userId);
    return { success: true, data: completion };
  });

  // ── GET /api/codex/:userId — 전체 도감 조회 ──────────────────
  fastify.get('/api/codex/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    _reply: FastifyReply,
  ) => {
    const { userId } = request.params;
    const entries = await codexManager.getAll(userId);
    return { success: true, data: entries };
  });

  // ── GET /api/codex/:userId/:category — 카테고리별 조회 ───────
  fastify.get('/api/codex/:userId/:category', async (
    request: FastifyRequest<{ Params: CategoryParams }>,
    reply: FastifyReply,
  ) => {
    const { userId, category } = request.params;

    if (!VALID_CATEGORIES.has(category)) {
      return reply.status(400).send({
        success: false,
        error: `유효하지 않은 카테고리: ${category}. 허용: ${[...VALID_CATEGORIES].join(', ')}`,
      });
    }

    const entries = await codexManager.getByCategory(userId, category as CodexCategory);
    return { success: true, data: entries };
  });

  // ── POST /api/codex/discover — 발견 등록 ─────────────────────
  fastify.post('/api/codex/discover', async (
    request: FastifyRequest<{ Body: DiscoverBody }>,
    reply: FastifyReply,
  ) => {
    const { userId, category, targetCode, percentage } = request.body;

    if (!userId || !category || !targetCode) {
      return reply.status(400).send({
        success: false,
        error: 'userId, category, targetCode는 필수입니다.',
      });
    }

    if (!VALID_CATEGORIES.has(category)) {
      return reply.status(400).send({
        success: false,
        error: `유효하지 않은 카테고리: ${category}`,
      });
    }

    const result = await codexManager.discover(userId, category, targetCode, percentage);
    return { success: true, data: result };
  });
}
