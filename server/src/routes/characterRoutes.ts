/**
 * 캐릭터 REST API 라우트 (P23-01)
 *
 * - POST /api/characters        — 캐릭터 생성
 * - GET  /api/characters        — 내 캐릭터 목록
 * - GET  /api/characters/:id    — 캐릭터 상세 조회
 * - DELETE /api/characters/:id  — 캐릭터 삭제
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { verifyAccessToken, TokenPayload } from '../security/jwtManager';

// ── 클래스 초기 스탯 ─────────────────────────────────────────

const CLASS_STATS: Record<string, { hp: number; mp: number }> = {
  ether_knight:    { hp: 500, mp: 150 },
  memory_weaver:   { hp: 300, mp: 400 },
  shadow_weaver:   { hp: 380, mp: 280 },
  memory_breaker:  { hp: 450, mp: 180 },
  time_guardian:    { hp: 400, mp: 350 },
  void_wanderer:   { hp: 360, mp: 320 },
};

const VALID_CLASSES = Object.keys(CLASS_STATS);

// ── 인증 헬퍼 ────────────────────────────────────────────────

async function extractUserId(request: FastifyRequest): Promise<string | null> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const payload = await verifyAccessToken(token);
    return payload.userId;
  } catch {
    return null;
  }
}

// ── 요청 타입 ────────────────────────────────────────────────

interface CreateCharBody {
  name: string;
  classId: string;
}

interface CharIdParams {
  id: string;
}

// ── 라우트 등록 ──────────────────────────────────────────────

export async function characterRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * POST /api/characters — 캐릭터 생성
   */
  fastify.post<{ Body: CreateCharBody }>(
    '/api/characters',
    async (request, reply) => {
      const userId = await extractUserId(request);
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다' });

      const { name, classId } = request.body;

      if (!name || !classId) {
        return reply.status(400).send({ error: 'name, classId는 필수입니다' });
      }

      if (!VALID_CLASSES.includes(classId)) {
        return reply.status(400).send({ error: `유효하지 않은 클래스입니다. 사용 가능: ${VALID_CLASSES.join(', ')}` });
      }

      // 계정당 캐릭터 수 제한 (5개)
      const count = await prisma.character.count({ where: { userId } });
      if (count >= 5) {
        return reply.status(400).send({ error: '계정당 최대 5개의 캐릭터만 생성할 수 있습니다' });
      }

      // 이름 중복 체크
      const existing = await prisma.character.findUnique({ where: { name } });
      if (existing) {
        return reply.status(409).send({ error: '이미 사용 중인 캐릭터명입니다' });
      }

      const stats = CLASS_STATS[classId];
      const character = await prisma.character.create({
        data: {
          userId,
          name,
          classId,
          hp: stats.hp,
          mp: stats.mp,
        },
      });

      return reply.status(201).send({ success: true, data: character });
    }
  );

  /**
   * GET /api/characters — 내 캐릭터 목록
   */
  fastify.get('/api/characters', async (request, reply) => {
    const userId = await extractUserId(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다' });

    const characters = await prisma.character.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ success: true, data: characters });
  });

  /**
   * GET /api/characters/:id — 캐릭터 상세 조회
   */
  fastify.get<{ Params: CharIdParams }>(
    '/api/characters/:id',
    async (request, reply) => {
      const userId = await extractUserId(request);
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다' });

      const character = await prisma.character.findFirst({
        where: { id: request.params.id, userId },
      });

      if (!character) {
        return reply.status(404).send({ error: '캐릭터를 찾을 수 없습니다' });
      }

      return reply.send({ success: true, data: character });
    }
  );

  /**
   * DELETE /api/characters/:id — 캐릭터 삭제
   */
  fastify.delete<{ Params: CharIdParams }>(
    '/api/characters/:id',
    async (request, reply) => {
      const userId = await extractUserId(request);
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다' });

      const character = await prisma.character.findFirst({
        where: { id: request.params.id, userId },
      });

      if (!character) {
        return reply.status(404).send({ error: '캐릭터를 찾을 수 없습니다' });
      }

      await prisma.character.delete({ where: { id: character.id } });

      return reply.send({ success: true, message: '캐릭터가 삭제되었습니다' });
    }
  );
}
