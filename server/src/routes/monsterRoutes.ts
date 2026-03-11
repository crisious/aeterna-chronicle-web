/**
 * monsterRoutes.ts — 몬스터/적 시스템 REST API
 *
 * GET  /api/monsters                — 목록 (type/level/location 필터)
 * GET  /api/monsters/:id            — 상세
 * GET  /api/monsters/zone/:zoneId   — 존별 활성 몬스터 목록
 * POST /api/monsters/:id/battle-result — 전투 결과 (드롭/경험치 처리)
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { spawnManager } from '../monster/spawnManager';

// ─── 타입 정의 ──────────────────────────────────────────────────

interface MonsterListQuery {
  type?: string;
  level?: string;      // 정확한 레벨 또는 "10-20" 범위
  location?: string;
  page?: string;
  limit?: string;
}

interface MonsterIdParams {
  id: string;
}

interface ZoneParams {
  zoneId: string;
}

interface BattleResultBody {
  attackerId: string;       // 공격자(플레이어) ID
  attackerLevel: number;
  damage: number;
  zoneId: string;
  instanceId: string;       // 스폰 매니저의 몬스터 인스턴스 ID
}

// ─── JSON Schema ────────────────────────────────────────────────

const battleResultSchema = {
  body: {
    type: 'object' as const,
    required: ['attackerId', 'attackerLevel', 'damage', 'zoneId', 'instanceId'],
    properties: {
      attackerId: { type: 'string' as const },
      attackerLevel: { type: 'number' as const },
      damage: { type: 'number' as const },
      zoneId: { type: 'string' as const },
      instanceId: { type: 'string' as const },
    },
  },
};

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function monsterRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /api/monsters — 몬스터 목록
   * 필터: ?type=elite&level=10-20&location=twilight_forest&page=1&limit=20
   */
  fastify.get('/api/monsters', async (
    request: FastifyRequest<{ Querystring: MonsterListQuery }>,
    _reply: FastifyReply,
  ) => {
    const { type, level, location, page = '1', limit = '20' } = request.query;

    const where: Record<string, unknown> = {};

    if (type) where.type = type;
    if (location) where.location = location;

    // 레벨 필터: 단일 값 또는 범위 ("10-20")
    if (level) {
      if (level.includes('-')) {
        const [min, max] = level.split('-').map(Number);
        where.level = { gte: min, lte: max };
      } else {
        where.level = parseInt(level, 10);
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [monsters, total] = await Promise.all([
      prisma.monster.findMany({
        where,
        orderBy: [{ level: 'asc' }, { type: 'asc' }],
        skip,
        take: limitNum,
      }),
      prisma.monster.count({ where }),
    ]);

    return {
      monsters,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  });

  /**
   * GET /api/monsters/:id — 몬스터 상세
   */
  fastify.get('/api/monsters/:id', async (
    request: FastifyRequest<{ Params: MonsterIdParams }>,
    reply: FastifyReply,
  ) => {
    const { id } = request.params;

    const monster = await prisma.monster.findUnique({ where: { id } });
    if (!monster) {
      return reply.status(404).send({ error: '몬스터를 찾을 수 없습니다.' });
    }

    return { monster };
  });

  /**
   * GET /api/monsters/zone/:zoneId — 존별 활성 몬스터 목록
   * 스폰 매니저에서 실시간 상태를 가져옴
   */
  fastify.get('/api/monsters/zone/:zoneId', async (
    request: FastifyRequest<{ Params: ZoneParams }>,
    _reply: FastifyReply,
  ) => {
    const { zoneId } = request.params;

    // 실시간 몬스터 상태 (스폰 매니저 메모리)
    const activeMonsters = spawnManager.getZoneMonsters(zoneId);

    // DB에서 해당 존의 스폰 설정도 반환
    const spawnPoints = await prisma.monsterSpawn.findMany({
      where: { zoneId, isActive: true },
    });

    return {
      zoneId,
      activeCount: activeMonsters.length,
      monsters: activeMonsters,
      spawnPoints: spawnPoints.map(sp => ({
        id: sp.id,
        monsterId: sp.monsterId,
        posX: sp.posX,
        posY: sp.posY,
        maxCount: sp.maxCount,
      })),
    };
  });

  /**
   * POST /api/monsters/:id/battle-result — 전투 결과 처리
   * 데미지 적용 → 사망 시 드롭/경험치 반환
   */
  fastify.post('/api/monsters/:id/battle-result', {
    schema: battleResultSchema,
  }, async (
    request: FastifyRequest<{ Params: MonsterIdParams; Body: BattleResultBody }>,
    reply: FastifyReply,
  ) => {
    const { attackerId, attackerLevel, damage, zoneId, instanceId } = request.body;

    const result = spawnManager.damageMonster(zoneId, instanceId, attackerId, damage, attackerLevel);

    if (!result) {
      return reply.status(404).send({ error: '해당 존에 몬스터 인스턴스를 찾을 수 없습니다.' });
    }

    // 사망 시 경험치/골드 지급 처리
    if (result.isDead && result.expReward > 0) {
      try {
        // 캐릭터 경험치 추가
        const character = await prisma.character.findFirst({
          where: { userId: attackerId },
        });
        if (character) {
          await prisma.character.update({
            where: { id: character.id },
            data: { exp: { increment: result.expReward } },
          });
        }

        // 골드 추가
        if (result.goldReward > 0) {
          await prisma.user.update({
            where: { id: attackerId },
            data: { gold: { increment: result.goldReward } },
          });
        }
      } catch (err) {
        // 보상 지급 실패는 전투 결과 자체에 영향을 주지 않음
        request.log.error(`전투 보상 지급 실패: ${(err as Error).message}`);
      }
    }

    return {
      actualDamage: result.actualDamage,
      isDead: result.isDead,
      drops: result.drops,
      expReward: result.isDead ? result.expReward : 0,
      goldReward: result.isDead ? result.goldReward : 0,
    };
  });
}
