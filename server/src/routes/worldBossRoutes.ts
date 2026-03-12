/**
 * worldBossRoutes.ts — 월드 보스 REST API (P11-05)
 *
 * GET  /api/world-boss/current  — 현재 활성 보스
 * GET  /api/world-boss/rewards  — 보상 목록
 * POST /api/world-boss/join     — 참여
 * POST /api/world-boss/damage   — 데미지 기여
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import {
  getCurrentBoss,
  WorldBossHPPool,
  calculateContributions,
  calculateLoot,
  WORLD_BOSSES,
} from '../world/worldBossManager';

// ─── 타입 정의 ──────────────────────────────────────────────────

interface JoinBody {
  playerId: string;
  playerName: string;
}

interface DamageBody {
  playerId: string;
  damage: number;
}

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function worldBossRoutes(fastify: FastifyInstance): Promise<void> {
  const hpPool = new WorldBossHPPool();

  /**
   * GET /api/world-boss/current — 현재 활성 보스
   */
  fastify.get('/api/world-boss/current', async (
    _request: FastifyRequest,
    _reply: FastifyReply,
  ) => {
    const boss = getCurrentBoss();
    const currentHp = await hpPool.getCurrentHp(boss.id);

    return {
      boss: {
        id: boss.id,
        name: boss.name,
        description: boss.description,
        maxHp: boss.maxHp,
        currentHp,
        requiredLevel: boss.requiredLevel,
        phases: boss.phases,
        skills: boss.skills,
      },
    };
  });

  /**
   * GET /api/world-boss/rewards — 보상 목록 (현재 보스의 드롭 테이블)
   */
  fastify.get('/api/world-boss/rewards', async (
    _request: FastifyRequest,
    _reply: FastifyReply,
  ) => {
    const boss = getCurrentBoss();

    return {
      bossId: boss.id,
      bossName: boss.name,
      lootTable: boss.lootTable.map((loot) => ({
        itemId: loot.itemId,
        name: loot.name,
        type: loot.type,
        dropRate: loot.dropRate,
        minContribution: loot.minContribution,
      })),
    };
  });

  /**
   * POST /api/world-boss/join — 참여 등록
   */
  fastify.post('/api/world-boss/join', async (
    request: FastifyRequest<{ Body: JoinBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { playerId, playerName } = request.body;
      if (!playerId || !playerName) {
        return reply.status(400).send({ error: 'playerId, playerName은 필수입니다.' });
      }

      const boss = getCurrentBoss();
      const currentHp = await hpPool.getCurrentHp(boss.id);

      if (currentHp <= 0) {
        return reply.status(400).send({ error: '이미 처치된 보스입니다.' });
      }

      return reply.status(200).send({
        joined: true,
        bossId: boss.id,
        bossName: boss.name,
        currentHp,
        maxHp: boss.maxHp,
        message: `${boss.name} 전투에 참여했습니다.`,
      });
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  /**
   * POST /api/world-boss/damage — 데미지 기여
   */
  fastify.post('/api/world-boss/damage', async (
    request: FastifyRequest<{ Body: DamageBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { playerId, damage } = request.body;
      if (!playerId || damage == null) {
        return reply.status(400).send({ error: 'playerId, damage는 필수입니다.' });
      }

      const boss = getCurrentBoss();
      const remainingHp = await hpPool.applyDamage(boss.id, damage);
      const defeated = remainingHp <= 0;

      const result: Record<string, unknown> = {
        bossId: boss.id,
        damage,
        remainingHp: Math.max(0, remainingHp),
        defeated,
      };

      if (defeated) {
        const contributions = await calculateContributions(boss.id);
        const playerContrib = contributions.find((c) => c.playerId === playerId);
        if (playerContrib) {
          result.loot = calculateLoot(boss, playerContrib.totalDamage, boss.maxHp);
        }
      }

      return reply.status(200).send(result);
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });
}
