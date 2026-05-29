/**
 * dialogueRoutes.ts — 시나리오 대화 REST API (P5-09)
 *
 * 엔드포인트:
 *   POST /api/dialogue/start     — 대화 시작
 *   POST /api/dialogue/choose    — 선택지 선택
 *   GET  /api/dialogue/history/:userId — 대화 이력 조회
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dialogueRunner } from '../dialogue/dialogueRunner';

// ── 요청 타입 정의 ──────────────────────────────────────────────

interface StartBody {
  npcId: string;
}

interface ChooseBody {
  choiceId: string;
}

interface HistoryQuery {
  limit?: string;
}

// ── 라우트 등록 ─────────────────────────────────────────────────

export async function dialogueRoutes(fastify: FastifyInstance): Promise<void> {

  // ── POST /api/dialogue/start — 대화 시작 ─────────────────────
  fastify.post('/api/dialogue/start', async (
    request: FastifyRequest<{ Body: StartBody }>,
    reply: FastifyReply,
  ) => {
    // 행위자는 인증된 사용자로 고정한다(body 의 userId 신뢰 금지 → IDOR 차단).
    const userId = request.authUserId;
    if (!userId) {
      return reply.status(401).send({ success: false, error: '인증이 필요합니다.' });
    }

    const { npcId } = request.body;

    if (!npcId) {
      return reply.status(400).send({
        success: false,
        error: 'npcId는 필수입니다.',
      });
    }

    try {
      const response = await dialogueRunner.start(userId, npcId);
      return { success: true, data: response };
    } catch (err) {
      const message = err instanceof Error ? err.message : '대화 시작 실패';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  // ── POST /api/dialogue/choose — 선택지 선택 ──────────────────
  fastify.post('/api/dialogue/choose', async (
    request: FastifyRequest<{ Body: ChooseBody }>,
    reply: FastifyReply,
  ) => {
    // 행위자는 인증된 사용자로 고정한다(body 의 userId 신뢰 금지 → IDOR 차단).
    const userId = request.authUserId;
    if (!userId) {
      return reply.status(401).send({ success: false, error: '인증이 필요합니다.' });
    }

    const { choiceId } = request.body;

    if (!choiceId) {
      return reply.status(400).send({
        success: false,
        error: 'choiceId는 필수입니다.',
      });
    }

    try {
      const response = await dialogueRunner.choose(userId, choiceId);
      return { success: true, data: response };
    } catch (err) {
      const message = err instanceof Error ? err.message : '선택 처리 실패';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  // ── GET /api/dialogue/history/:userId — 대화 이력 ────────────
  fastify.get('/api/dialogue/history/:userId', async (
    request: FastifyRequest<{ Querystring: HistoryQuery }>,
    reply: FastifyReply,
  ) => {
    // 사적 데이터(대화 이력) 조회: params 의 userId 를 신뢰하지 않고 인증된 사용자만 조회한다 → IDOR 차단.
    const userId = request.authUserId;
    if (!userId) {
      return reply.status(401).send({ success: false, error: '인증이 필요합니다.' });
    }

    const limit = parseInt(request.query.limit ?? '50', 10);

    const history = await dialogueRunner.getHistory(userId, Math.min(limit, 200));
    return { success: true, data: history };
  });
}
