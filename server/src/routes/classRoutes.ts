// ─── 2차 전직 시스템 REST API ────────────────────────────────
// GET  /api/class/tree              — 전체 전직 트리
// GET  /api/class/tree/:baseClass   — 특정 클래스 전직 경로
// POST /api/class/advance           — 전직 실행
// GET  /api/class/skills/:advancedClass — 전직 스킬 목록

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { advancementEngine } from '../class/advancementEngine';

// ─── 요청 타입 정의 ─────────────────────────────────────────

interface BaseClassParams {
  baseClass: string;
}

interface AdvancedClassParams {
  advancedClass: string;
}

interface AdvanceBody {
  characterId: string;
  baseClass: string;
  targetTier: number;
  completedQuests?: string[];
}

// ─── 라우트 등록 ────────────────────────────────────────────

export async function classRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /api/class/tree — 전체 전직 트리 조회
   */
  fastify.get('/api/class/tree', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tree = await advancementEngine.getFullTree();
      return reply.send({ success: true, data: tree });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: '전직 트리 조회 실패' });
    }
  });

  /**
   * GET /api/class/tree/:baseClass — 특정 클래스 전직 경로 조회
   */
  fastify.get<{ Params: BaseClassParams }>(
    '/api/class/tree/:baseClass',
    async (request, reply) => {
      try {
        const { baseClass } = request.params;
        const tree = await advancementEngine.getClassTree(baseClass);
        if (!tree) {
          return reply.status(404).send({ success: false, error: `클래스 '${baseClass}'의 전직 경로를 찾을 수 없습니다` });
        }
        return reply.send({ success: true, data: tree });
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ success: false, error: '전직 경로 조회 실패' });
      }
    }
  );

  /**
   * POST /api/class/advance — 전직 실행
   * Body: { characterId, baseClass, targetTier, completedQuests? }
   */
  fastify.post<{ Body: AdvanceBody }>(
    '/api/class/advance',
    async (request, reply) => {
      try {
        const { characterId, baseClass, targetTier, completedQuests } = request.body;

        // 필수 파라미터 검증
        if (!characterId || !baseClass || targetTier == null) {
          return reply.status(400).send({
            success: false,
            error: 'characterId, baseClass, targetTier는 필수 파라미터입니다',
          });
        }

        if (targetTier < 1 || targetTier > 3) {
          return reply.status(400).send({
            success: false,
            error: 'targetTier는 1~3 사이 값이어야 합니다',
          });
        }

        const result = await advancementEngine.executeAdvancement(
          characterId,
          baseClass,
          targetTier,
          completedQuests ?? []
        );

        if (!result.success) {
          return reply.status(400).send({ success: false, error: result.message });
        }

        return reply.send({ success: true, data: result });
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ success: false, error: '전직 실행 실패' });
      }
    }
  );

  /**
   * GET /api/class/skills/:advancedClass — 전직 스킬 목록 조회
   */
  fastify.get<{ Params: AdvancedClassParams }>(
    '/api/class/skills/:advancedClass',
    async (request, reply) => {
      try {
        const { advancedClass } = request.params;
        const skills = await advancementEngine.getSkillsByAdvancedClass(advancedClass);
        if (!skills) {
          return reply.status(404).send({ success: false, error: `전직 클래스 '${advancedClass}'를 찾을 수 없습니다` });
        }
        return reply.send({ success: true, data: skills });
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ success: false, error: '스킬 목록 조회 실패' });
      }
    }
  );
}
