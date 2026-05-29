/**
 * worldBossRoutes.ts — 월드 보스 REST API (P11-05)
 *
 * GET  /api/world-boss/current  — 현재 활성 보스
 * GET  /api/world-boss/rewards  — 보상 목록
 * POST /api/world-boss/join     — 참여
 * POST /api/world-boss/damage   — 데미지 기여
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getCurrentBoss,
  WorldBossHPPool,
  calculateContributions,
  calculateLoot,
} from '../world/worldBossManager';

// ─── 타입 정의 ──────────────────────────────────────────────────
// [SECURITY-IDOR] 행위자(playerId)는 body 에서 받지 않고 request.authUserId 로 결정한다.

interface JoinBody {
  playerName: string;
}

interface DamageBody {
  damage: number;
}

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function worldBossRoutes(fastify: FastifyInstance): Promise<void> {
  const hpPool = new WorldBossHPPool("default_boss" as any);

  /**
   * GET /api/world-boss/current — 현재 활성 보스
   */
  fastify.get('/api/world-boss/current', async (
    _request: FastifyRequest,
    _reply: FastifyReply,
  ) => {
    const boss = getCurrentBoss();
    const currentHp = await (hpPool as any).getCurrentHp(boss.id);

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
    // [SECURITY-IDOR] body 의 playerId 대신 인증된 행위자를 참여자로 사용한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    try {
      const { playerName } = request.body;
      if (!playerName) {
        return reply.status(400).send({ error: 'playerName은 필수입니다.' });
      }

      const boss = getCurrentBoss();
      const currentHp = await (hpPool as any).getCurrentHp(boss.id);

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
    // [SECURITY-IDOR] body 의 playerId 대신 인증된 행위자를 기여자로 사용한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    try {
      const { damage } = request.body;
      if (damage == null) {
        return reply.status(400).send({ error: 'damage는 필수입니다.' });
      }

      const boss = getCurrentBoss();
      const damageResult = await (hpPool as any).applyDamage(boss.id, damage) as any;
      const remainingHp = typeof damageResult === 'number' ? damageResult : damageResult?.remainingHp ?? 0;
      const defeated = remainingHp <= 0;

      const result: Record<string, unknown> = {
        bossId: boss.id,
        damage,
        remainingHp: Math.max(0, remainingHp),
        defeated,
      };

      if (defeated) {
        const contributions = await calculateContributions(boss.id);
        const playerContrib = contributions.find((c) => c.playerId === userId);
        if (playerContrib) {
          result.loot = (calculateLoot as any)(boss, playerContrib.totalDamage, boss.maxHp);
        }
      }

      return reply.status(200).send(result);
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });
}
