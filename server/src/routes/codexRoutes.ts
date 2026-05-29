/**
 * codexRoutes.ts — 도감/컬렉션 REST API (P5-08)
 *
 * 엔드포인트:
 *   GET  /api/codex/:userId              — 전체 도감
 *   GET  /api/codex/:userId/:category    — 카테고리별 도감
 *   GET  /api/codex/completion/:userId   — 완성도 조회
 *   POST /api/codex/discover             — 발견 등록 (서버 내부용)
 *
 * [SECURITY-IDOR] 도감은 유저별 개인 데이터(CodexEntry.userId)다.
 * 경로/바디의 userId 는 공격자가 임의로 바꿀 수 있으므로 신뢰하지 않고,
 * 전역 authGate 가 주입한 request.authUserId 를 actor 로 사용한다.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { CodexCategory } from '../codex/codexManager';
import { codexManager } from '../codex/codexManager';

// ── 요청 타입 정의 ──────────────────────────────────────────────
// 참고: GET 라우트 URL(/:userId)에는 파라미터가 남지만, 핸들러는 이를 무시하고
//       인증된 request.authUserId 를 사용한다.

interface UserIdParams {
  userId: string;
}

interface CategoryParams extends UserIdParams {
  category: string;
}

// 발견 등록 바디 — userId 는 더 이상 신뢰하지 않으므로 제외(actor = authUserId).
interface DiscoverBody {
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
    reply: FastifyReply,
  ) => {
    // 경로의 :userId 는 신뢰하지 않고 인증된 행위자를 사용한다(IDOR 차단).
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const completion = await codexManager.getCompletion(userId);
    return { success: true, data: completion };
  });

  // ── GET /api/codex/:userId — 전체 도감 조회 ──────────────────
  fastify.get('/api/codex/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply,
  ) => {
    // 경로의 :userId 는 신뢰하지 않고 인증된 행위자를 사용한다(IDOR 차단).
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const entries = await codexManager.getAll(userId);
    return { success: true, data: entries };
  });

  // ── GET /api/codex/:userId/:category — 카테고리별 조회 ───────
  fastify.get('/api/codex/:userId/:category', async (
    request: FastifyRequest<{ Params: CategoryParams }>,
    reply: FastifyReply,
  ) => {
    // 경로의 :userId 는 신뢰하지 않고 인증된 행위자를 사용한다(IDOR 차단).
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { category } = request.params;

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
    // 바디의 userId 는 신뢰하지 않고 인증된 행위자를 actor 로 사용한다(IDOR 차단).
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { category, targetCode, percentage } = request.body;

    if (!category || !targetCode) {
      return reply.status(400).send({
        success: false,
        error: 'category, targetCode는 필수입니다.',
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
