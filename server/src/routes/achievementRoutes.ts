import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { achievementEngine } from '../achievement/achievementEngine';
import { redisClient, redisConnected } from '../redis';
import { requireAdmin } from '../admin/authMiddleware';

// ─── 타입 정의 ──────────────────────────────────────────────

interface AchievementListQuery {
  category?: string;
  tier?: string;
  page?: string;
  limit?: string;
}

interface UserIdParams {
  userId: string;
}

interface CheckBody {
  type: string;
  value?: number;
  flag?: string;
}

interface EquipTitleBody {
  titleId: string;
}

// ─── 업적 & 칭호 라우트 ────────────────────────────────────

export async function achievementRoutes(fastify: FastifyInstance): Promise<void> {

  // ── GET /api/achievements — 전체 업적 목록 (카테고리·티어 필터) ──
  fastify.get('/api/achievements', async (
    request: FastifyRequest<{ Querystring: AchievementListQuery }>,
    reply: FastifyReply
  ) => {
    const { category, tier, page = '1', limit = '50' } = request.query;
    const take = Math.min(parseInt(limit, 10) || 50, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const where: Record<string, unknown> = {};
    if (category) where['category'] = category;
    if (tier) where['tier'] = tier;

    const [achievements, total] = await Promise.all([
      prisma.achievement.findMany({
        where,
        skip,
        take,
        orderBy: [{ category: 'asc' }, { points: 'asc' }],
      }),
      prisma.achievement.count({ where }),
    ]);

    // 숨겨진 업적은 이름/설명을 마스킹
    const masked = achievements.map(a => {
      if (a.isHidden) {
        return { ...a, name: '???', description: '숨겨진 업적입니다.' };
      }
      return a;
    });

    return reply.send({ achievements: masked, total, page: parseInt(page, 10), limit: take });
  });

  // ── GET /api/achievements/:userId — 유저 달성 목록 ─────────
  fastify.get('/api/achievements/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply
  ) => {
    // IDOR 방지: params 의 userId 를 신뢰하지 않고 인증된 행위자만 자신의 달성 목록을 조회
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const unlocks = await prisma.achievementUnlock.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });

    const totalPoints = unlocks.reduce((sum, u) => sum + u.achievement.points, 0);

    return reply.send({
      userId,
      unlocked: unlocks.length,
      totalPoints,
      achievements: unlocks.map(u => ({
        code: u.achievement.code,
        name: u.achievement.name,
        category: u.achievement.category,
        tier: u.achievement.tier,
        points: u.achievement.points,
        unlockedAt: u.unlockedAt,
      })),
    });
  });

  // ── GET /api/achievements/:userId/progress — 진행도 ────────
  fastify.get('/api/achievements/:userId/progress', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply
  ) => {
    // IDOR 방지: params 의 userId 를 신뢰하지 않고 인증된 행위자의 진행도만 조회
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const progress = await achievementEngine.getProgress(userId);

    // 카테고리별 요약
    const summary: Record<string, { total: number; completed: number }> = {};
    for (const p of progress) {
      if (!summary[p.category]) summary[p.category] = { total: 0, completed: 0 };
      summary[p.category].total++;
      if (p.completed) summary[p.category].completed++;
    }

    return reply.send({ userId, summary, progress });
  });

  // ── POST /api/achievements/check — 수동 체크 트리거(admin/debug 전용) ──
  // 보안: 클라가 임의 {type,value,flag} 로 호출하면 value 가 진행 카운터에 그대로 incrBy 되어
  // count/threshold 업적 + 연동 칭호를 무한 자가지급할 수 있다(#241 시즌 add-exp 와 동일 클래스).
  // 정당한 업적 진행은 서버 내부 호출(codexManager → achievementEngine.check, value 서버결정)로만
  // 발생하며 클라는 이 엔드포인트를 호출하지 않으므로, admin/디버그 전용으로 게이트한다.
  // (소켓 트윈 achievement:check 도 동일 sink 라 achievementSocketHandler.ts 에서 함께 제거함)
  fastify.post('/api/achievements/check', { preHandler: requireAdmin('admin') as any }, async (
    request: FastifyRequest<{ Body: CheckBody }>,
    reply: FastifyReply
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { type, value, flag } = request.body;

    if (!type) {
      return reply.status(400).send({ error: 'type은 필수입니다.' });
    }

    const results = await achievementEngine.check({ userId, type, value, flag });

    return reply.send({
      checked: true,
      unlocked: results.length,
      achievements: results,
    });
  });

  // ── GET /api/titles — 칭호 목록 ───────────────────────────
  fastify.get('/api/titles', async (
    _request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const titles = await prisma.title.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return reply.send({ titles });
  });

  // ── PATCH /api/titles/:userId/equip — 칭호 장착 ───────────
  fastify.patch('/api/titles/:userId/equip', async (
    request: FastifyRequest<{ Params: UserIdParams; Body: EquipTitleBody }>,
    reply: FastifyReply
  ) => {
    // IDOR 방지: params 의 userId 를 신뢰하지 않고 인증된 행위자가 자신의 칭호만 장착
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { titleId } = request.body;

    if (!titleId) {
      return reply.status(400).send({ error: 'titleId는 필수입니다.' });
    }

    // 칭호 존재 확인
    const title = await prisma.title.findUnique({ where: { id: titleId } });
    if (!title) return reply.status(404).send({ error: '칭호를 찾을 수 없습니다.' });

    // 유저가 해당 칭호를 소유하고 있는지 확인 (Redis 기반)
    if (redisConnected()) {
      const owns = await redisClient.sIsMember(`user:titles:${userId}`, titleId);
      if (!owns) {
        return reply.status(403).send({ error: '소유하지 않은 칭호입니다.' });
      }
    }

    // Redis에 장착 칭호 저장
    if (redisConnected()) {
      await redisClient.set(`user:equipped_title:${userId}`, titleId);
    }

    return reply.send({
      userId,
      equippedTitle: {
        id: title.id,
        name: title.name,
        rarity: title.rarity,
      },
    });
  });
}
