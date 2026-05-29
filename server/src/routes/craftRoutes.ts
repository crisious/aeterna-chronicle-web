/**
 * 제작 시스템 REST API 라우트 (P4-02)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { craftEngine } from '../craft/craftEngine';
import { seedRecipes } from '../craft/recipeSeeds';
import { requireAdmin } from '../admin/authMiddleware';

// ─── 타입 정의 ──────────────────────────────────────────────

interface RecipeListQuery {
  category?: string;
}

interface RecipeIdParams {
  id: string;
}

interface ExecuteBody {
  recipeId: string;
}

interface EnhanceBody {
  itemId: string;
}

interface DisassembleBody {
  itemId: string;
}

interface CraftLogQuery {
  limit?: string;
}

// ─── 라우트 등록 ────────────────────────────────────────────

export async function craftRoutes(fastify: FastifyInstance): Promise<void> {

  // GET /api/craft/recipes — 레시피 목록 (카테고리 필터)
  fastify.get('/api/craft/recipes', async (
    request: FastifyRequest<{ Querystring: RecipeListQuery }>,
    _reply: FastifyReply,
  ) => {
    const { category } = request.query;
    const recipes = await craftEngine.getRecipes(category);
    return { success: true, data: recipes, count: recipes.length };
  });

  // GET /api/craft/recipes/:id — 레시피 상세
  fastify.get('/api/craft/recipes/:id', async (
    request: FastifyRequest<{ Params: RecipeIdParams }>,
    reply: FastifyReply,
  ) => {
    const recipe = await craftEngine.getRecipeById(request.params.id);
    if (!recipe) {
      return reply.status(404).send({ success: false, error: '레시피를 찾을 수 없음' });
    }
    return { success: true, data: recipe };
  });

  // POST /api/craft/execute — 제작 실행
  fastify.post('/api/craft/execute', async (
    request: FastifyRequest<{ Body: ExecuteBody }>,
    reply: FastifyReply,
  ) => {
    // IDOR 방지: body 의 userId 대신 인증된 행위자를 actor 로 사용
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ success: false, error: '인증이 필요합니다.' });
    const { recipeId } = request.body;
    if (!recipeId) {
      return reply.status(400).send({ success: false, error: 'recipeId 필수' });
    }
    const result = await craftEngine.executeCraft(userId, recipeId);
    return { success: true, data: result };
  });

  // POST /api/craft/enhance — 강화
  fastify.post('/api/craft/enhance', async (
    request: FastifyRequest<{ Body: EnhanceBody }>,
    reply: FastifyReply,
  ) => {
    // IDOR 방지: body 의 userId 대신 인증된 행위자를 actor 로 사용
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ success: false, error: '인증이 필요합니다.' });
    const { itemId } = request.body;
    if (!itemId) {
      return reply.status(400).send({ success: false, error: 'itemId 필수' });
    }
    const result = await craftEngine.enhance(userId, itemId);
    return { success: true, data: result };
  });

  // POST /api/craft/disassemble — 분해
  fastify.post('/api/craft/disassemble', async (
    request: FastifyRequest<{ Body: DisassembleBody }>,
    reply: FastifyReply,
  ) => {
    // IDOR 방지: body 의 userId 대신 인증된 행위자를 actor 로 사용
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ success: false, error: '인증이 필요합니다.' });
    const { itemId } = request.body;
    if (!itemId) {
      return reply.status(400).send({ success: false, error: 'itemId 필수' });
    }
    const result = await craftEngine.disassemble(userId, itemId);
    return { success: true, data: result };
  });

  // GET /api/craft/log/:userId — 제작 이력 (본인 것만)
  fastify.get('/api/craft/log/:userId', async (
    request: FastifyRequest<{ Querystring: CraftLogQuery }>,
    reply: FastifyReply,
  ) => {
    // IDOR 방지: params 의 :userId 를 신뢰하지 않고 인증된 행위자 본인의 이력만 조회
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ success: false, error: '인증이 필요합니다.' });
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
    const logs = await craftEngine.getCraftLog(userId, limit);
    return { success: true, data: logs, count: logs.length };
  });

  // GET /api/craft/mastery/:userId — 숙련도 (본인 것만)
  fastify.get('/api/craft/mastery/:userId', async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    // IDOR 방지: params 의 :userId 를 신뢰하지 않고 인증된 행위자 본인의 숙련도만 조회
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ success: false, error: '인증이 필요합니다.' });
    const mastery = await craftEngine.getMastery(userId);
    return { success: true, data: mastery };
  });

  // POST /api/craft/seed — 레시피 시드 실행 (개발/콘텐츠 생성용, 관리자 전용)
  fastify.post('/api/craft/seed', { preHandler: requireAdmin('admin') }, async (
    _request: FastifyRequest,
    _reply: FastifyReply,
  ) => {
    const result = await seedRecipes();
    return { success: true, data: result };
  });

  fastify.log.info('Craft system routes registered');
}
