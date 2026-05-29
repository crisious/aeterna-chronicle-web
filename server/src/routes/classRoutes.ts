// ─── 2차 전직 시스템 REST API ────────────────────────────────
// GET  /api/class/tree              — 전체 전직 트리
// GET  /api/class/tree/:baseClass   — 특정 클래스 전직 경로
// POST /api/class/advance           — 전직 실행
// GET  /api/class/skills/:advancedClass — 전직 스킬 목록

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { advancementEngine } from '../class/advancementEngine';
import { enforceClassGate } from '../class/memoryDestroyerGate';

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
        // SECURITY-IDOR: 인증된 행위자만 자기 캐릭터를 전직시킬 수 있다.
        const userId = request.authUserId;
        if (!userId) return reply.status(401).send({ success: false, error: '인증이 필요합니다.' });

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

        // SECURITY-IDOR: characterId는 공격자 제어 식별자이므로, 해당 캐릭터가
        // 인증된 사용자 소유(Character.userId === authUserId)인지 검증한다.
        const ownedCharacter = await prisma.character.findUnique({
          where: { id: characterId },
          select: { userId: true },
        });
        if (!ownedCharacter) {
          return reply.status(404).send({ success: false, error: '캐릭터를 찾을 수 없습니다' });
        }
        if (ownedCharacter.userId !== userId) {
          return reply.status(403).send({ success: false, error: '해당 캐릭터에 대한 권한이 없습니다.' });
        }

        // P11-16: 기억파괴자 챕터6 게이트 검증
        const gateBlock = await enforceClassGate(
          request.body.characterId, // accountId는 캐릭터에서 역참조
          baseClass
        );
        if (gateBlock) {
          return reply.status(403).send({
            success: false,
            error: gateBlock.reason,
            gate: {
              currentChapter: gateBlock.currentChapter,
              requiredChapter: gateBlock.requiredChapter,
            },
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

  /**
   * GET /api/class/gate/:accountId/:classCode — 클래스 해금 조건 확인
   * P11-16: 기억파괴자 등 게이트가 있는 클래스의 해금 상태 조회
   */
  fastify.get<{ Params: { accountId: string; classCode: string } }>(
    '/api/class/gate/:accountId/:classCode',
    async (request, reply) => {
      try {
        // SECURITY-IDOR: 사적 데이터(계정별 해금 상태) 조회이므로 인증 필수.
        const userId = request.authUserId;
        if (!userId) return reply.status(401).send({ success: false, error: '인증이 필요합니다.' });

        const { classCode } = request.params;

        // SECURITY-IDOR: URL의 accountId(공격자 제어)를 신뢰하지 않고, 인증된 사용자의
        // 캐릭터에서 accountId를 역참조해 actor로 사용한다.
        const ownChar = await prisma.character.findFirst({
          where: { userId },
          select: { accountId: true },
        });
        const accountId = ownChar?.accountId;
        if (!accountId) {
          return reply.status(404).send({ success: false, error: '계정에 캐릭터가 존재하지 않습니다.' });
        }

        const gateResult = await enforceClassGate(accountId, classCode);

        if (gateResult === null) {
          // 게이트 통과 또는 게이트 없는 클래스
          return reply.send({ success: true, data: { eligible: true, classCode } });
        }

        return reply.send({
          success: true,
          data: {
            eligible: false,
            classCode,
            reason: gateResult.reason,
            currentChapter: gateResult.currentChapter,
            requiredChapter: gateResult.requiredChapter,
          },
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ success: false, error: '해금 조건 조회 실패' });
      }
    }
  );
}
