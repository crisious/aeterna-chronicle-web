// ─── 전투 시스템 REST API 라우트 (P6-04/05 + P24-19/20) ────────
// 상태이상 적용/조회 + 콤보 정보 + 전투 시작/진행/종료/로그 API

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  statusEffectManager,
  STATUS_EFFECT_DEFS,
} from '../combat/statusEffectManager';
import type { ResistStats ,
  EffectId} from '../combat/statusEffectManager';
import {
  comboManager,
  COMBO_DEFINITIONS,
  CHAIN_BONUSES,
} from '../combat/comboManager';
import type {
  PlayerAction} from '../combat/combatEngine';
import {
  combatInstanceManager,
} from '../combat/combatEngine';
import type { ElementType } from '../combat/damageCalculator';
import type { DropEntry } from '../combat/rewardEngine';
import { prisma } from '../db';
import { extractUserIdFromRequest } from '../security/jwtManager';

// ─── 클래스별 기본 전투 스탯 (레벨 1 기준) ──────────────────────
const CLASS_BASE_COMBAT_STATS: Record<string, {
  atk: number; def: number; matk: number; mdef: number;
  spd: number; critRate: number; critDamage: number;
}> = {
  ether_knight:    { atk: 15, def: 12, matk: 5,  mdef: 8,  spd: 10, critRate: 0.05, critDamage: 1.5 },
  memory_weaver:   { atk: 5,  def: 6,  matk: 18, mdef: 14, spd: 10, critRate: 0.08, critDamage: 1.5 },
  shadow_weaver:   { atk: 12, def: 8,  matk: 10, mdef: 8,  spd: 14, critRate: 0.12, critDamage: 1.8 },
  memory_breaker:  { atk: 18, def: 10, matk: 8,  mdef: 8,  spd: 12, critRate: 0.10, critDamage: 1.6 },
  time_guardian:   { atk: 8,  def: 15, matk: 10, mdef: 15, spd: 8,  critRate: 0.03, critDamage: 1.4 },
  void_wanderer:   { atk: 10, def: 8,  matk: 14, mdef: 10, spd: 12, critRate: 0.08, critDamage: 1.5 },
};

// 클래스별 레벨당 성장률
const CLASS_GROWTH: Record<string, {
  atk: number; def: number; matk: number; mdef: number;
  spd: number; crit: number;
}> = {
  ether_knight:    { atk: 4, def: 4, matk: 1, mdef: 2, spd: 2, crit: 0.002 },
  memory_weaver:   { atk: 1, def: 2, matk: 5, mdef: 4, spd: 2, crit: 0.003 },
  shadow_weaver:   { atk: 3, def: 2, matk: 3, mdef: 2, spd: 4, crit: 0.005 },
  memory_breaker:  { atk: 5, def: 3, matk: 2, mdef: 2, spd: 3, crit: 0.004 },
  time_guardian:   { atk: 2, def: 5, matk: 3, mdef: 5, spd: 1, crit: 0.001 },
  void_wanderer:   { atk: 3, def: 2, matk: 4, mdef: 3, spd: 3, crit: 0.003 },
};

// ─── 요청/응답 타입 ────────────────────────────────────────────

interface ApplyEffectBody {
  effectId: EffectId;
  sourceId: string;
  targetId: string;
  applyChance: number;
  value: number;
  duration?: number;
  targetResist: ResistStats;
}

interface ActiveEffectsParams {
  targetId: string;
}

interface RecordSkillBody {
  playerId: string;
  skillCode: string;
  classId: string;
  hitCount?: number;
}

interface CombosByClassParams {
  classId: string;
}

// ─── 라우트 등록 ───────────────────────────────────────────────

export async function combatRoutes(fastify: FastifyInstance): Promise<void> {
  // ── POST /combat/apply-effect ─────────────────────────────
  // 상태이상/버프 적용 요청
  fastify.post('/combat/apply-effect', async (
    request: FastifyRequest<{ Body: ApplyEffectBody }>,
    _reply: FastifyReply,
  ) => {
    const {
      effectId, sourceId, targetId,
      applyChance, value, duration, targetResist,
    } = request.body;

    // 효과 ID 유효성 검증
    if (!STATUS_EFFECT_DEFS[effectId]) {
      return { success: false, error: '알 수 없는 효과 ID' };
    }

    const result = statusEffectManager.applyEffect(
      effectId,
      sourceId,
      targetId,
      applyChance,
      targetResist,
      value,
      duration,
    );

    return {
      success: result.applied,
      reason: result.reason ?? null,
      activeEffects: statusEffectManager.serializeForClient(targetId),
    };
  });

  // ── GET /combat/active-effects/:targetId ──────────────────
  // 특정 대상의 활성 상태이상/버프 조회
  fastify.get('/combat/active-effects/:targetId', async (
    request: FastifyRequest<{ Params: ActiveEffectsParams }>,
    _reply: FastifyReply,
  ) => {
    const { targetId } = request.params;

    return {
      targetId,
      effects: statusEffectManager.serializeForClient(targetId),
      modifiers: {
        speedMultiplier: statusEffectManager.getSpeedMultiplier(targetId),
        defenseModifier: statusEffectManager.getDefenseModifier(targetId),
        attackModifier: statusEffectManager.getAttackModifier(targetId),
        accuracyMultiplier: statusEffectManager.getAccuracyMultiplier(targetId),
        healMultiplier: statusEffectManager.getHealMultiplier(targetId),
        shieldAmount: statusEffectManager.getShieldAmount(targetId),
      },
      flags: {
        incapacitated: statusEffectManager.isIncapacitated(targetId),
        silenced: statusEffectManager.isSilenced(targetId),
        charmed: statusEffectManager.isCharmed(targetId),
      },
    };
  });

  // ── GET /combat/effect-defs ───────────────────────────────
  // 전체 상태이상/버프 정의 목록
  fastify.get('/combat/effect-defs', async () => {
    return { effects: STATUS_EFFECT_DEFS };
  });

  // ── POST /combat/purge-debuffs ────────────────────────────
  // 정화 스킬용: 대상의 모든 디버프 제거
  fastify.post('/combat/purge-debuffs', async (
    request: FastifyRequest<{ Body: { targetId: string } }>,
    _reply: FastifyReply,
  ) => {
    const { targetId } = request.body;
    const removed = statusEffectManager.purgeDebuffs(targetId);
    return {
      success: true,
      removedCount: removed,
      activeEffects: statusEffectManager.serializeForClient(targetId),
    };
  });

  // ── POST /combat/record-skill ─────────────────────────────
  // 스킬 사용 기록 + 콤보 판정
  fastify.post('/combat/record-skill', async (
    request: FastifyRequest<{ Body: RecordSkillBody }>,
    _reply: FastifyReply,
  ) => {
    const { playerId, skillCode, classId, hitCount } = request.body;

    const result = comboManager.recordSkillUse(
      playerId,
      skillCode,
      classId,
      hitCount ?? 1,
    );

    return {
      combo: result.combo ? {
        id: result.combo.id,
        name: result.combo.name,
        description: result.combo.description,
        damageBonus: result.combo.damageBonus,
        statusEffect: result.combo.statusEffect,
        statusEffectChance: result.combo.statusEffectChance,
        bonusDescription: result.combo.bonusDescription,
      } : null,
      hitCount: result.hitCount,
      totalMultiplier: result.totalMultiplier,
      chainLabel: result.chainLabel,
      hints: comboManager.getNextHint(playerId, classId),
    };
  });

  // ── GET /combat/combos/:classId ───────────────────────────
  // 클래스별 콤보 레시피 목록
  fastify.get('/combat/combos/:classId', async (
    request: FastifyRequest<{ Params: CombosByClassParams }>,
    _reply: FastifyReply,
  ) => {
    const { classId } = request.params;
    return {
      classId,
      combos: comboManager.getClassCombos(classId),
    };
  });

  // ── GET /combat/combos ────────────────────────────────────
  // 전체 콤보 + 체인 보너스 정의
  fastify.get('/combat/combos', async () => {
    return {
      combos: COMBO_DEFINITIONS,
      chainBonuses: CHAIN_BONUSES,
    };
  });

  // ═══════════════════════════════════════════════════════════
  // P24-19/20: 전투 시작/진행/종료/상태/로그 REST API
  // ═══════════════════════════════════════════════════════════

  // ── POST /combat/start ────────────────────────────────────
  // 전투 인스턴스 생성 + 시작
  // Security: 클라이언트 스탯을 무시하고 DB에서 조회
  interface CombatStartBody {
    partyCharacterIds: string[];
    monsterIds: string[];
    autoMode?: boolean;
  }

  fastify.post('/combat/start', async (
    request: FastifyRequest<{ Body: CombatStartBody }>,
    reply: FastifyReply,
  ) => {
    // JWT 인증
    const userId = await extractUserIdFromRequest(request);
    if (!userId) {
      return reply.status(401).send({ error: '인증이 필요합니다.' });
    }

    const { partyCharacterIds, monsterIds, autoMode } = request.body;

    if (!partyCharacterIds?.length || !monsterIds?.length) {
      return reply.status(400).send({ error: '파티 캐릭터 ID와 몬스터 ID 모두 필요합니다.' });
    }

    try {
      // DB에서 파티 캐릭터 조회 (JWT userId 소유 검증)
      const characters = await prisma.character.findMany({
        where: { id: { in: partyCharacterIds }, userId },
      });
      if (characters.length !== partyCharacterIds.length) {
        return reply.status(403).send({ error: '소유하지 않은 캐릭터가 포함되어 있습니다.' });
      }

      // DB에서 몬스터 조회
      const dbMonsters = await prisma.monster.findMany({
        where: { id: { in: monsterIds }, isActive: true },
      });
      if (dbMonsters.length !== monsterIds.length) {
        return reply.status(400).send({ error: '존재하지 않거나 비활성 몬스터가 포함되어 있습니다.' });
      }

      const engine = combatInstanceManager.create({ autoMode: autoMode ?? false });

      for (const c of characters) {
        const base = CLASS_BASE_COMBAT_STATS[c.classId] ?? CLASS_BASE_COMBAT_STATS['ether_knight'];
        const growth = CLASS_GROWTH[c.classId] ?? CLASS_GROWTH['ether_knight'];
        const lvl = c.level - 1;

        engine.addParticipant({
          id: c.id,
          name: c.name,
          classId: c.classId,
          level: c.level,
          hp: c.hp,
          maxHp: c.maxHp,
          mp: c.mp,
          maxMp: c.maxMp,
          atk: base.atk + growth.atk * lvl,
          def: base.def + growth.def * lvl,
          matk: base.matk + growth.matk * lvl,
          mdef: base.mdef + growth.mdef * lvl,
          spd: base.spd + growth.spd * lvl,
          critRate: base.critRate + growth.crit * lvl,
          critDamage: base.critDamage,
          isMonster: false,
          atbGauge: 0,
          alive: true,
          team: 'party',
          isBoss: false,
          element: 'neutral' as ElementType,
          armorPenetration: 0,
          armorPenetrationPercent: 0,
          baseExp: 0,
          baseGold: 0,
          dropTable: [],
        });
      }

      for (const m of dbMonsters) {
        engine.addParticipant({
          id: m.id,
          name: m.name,
          classId: m.type,
          level: m.level,
          hp: m.hp,
          maxHp: m.hp,
          mp: 0,
          maxMp: 0,
          atk: m.attack,
          def: m.defense,
          matk: m.attack,
          mdef: m.defense,
          spd: m.speed,
          critRate: 0.05,
          critDamage: 1.5,
          isMonster: true,
          atbGauge: 0,
          alive: true,
          team: 'monsters',
          isBoss: m.type === 'boss' || m.type === 'raid_boss' || m.type === 'field_boss',
          element: (m.element ?? 'neutral') as ElementType,
          armorPenetration: 0,
          armorPenetrationPercent: 0,
          baseExp: m.expReward,
          baseGold: m.goldReward,
          dropTable: (m.dropTable as unknown as DropEntry[]) ?? [],
        });
      }

      engine.start();

      return {
        success: true,
        combatId: engine.combatId,
        state: engine.getState(),
        participants: engine.getSnapshot(),
      };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // ── POST /combat/action ───────────────────────────────────
  // 플레이어 행동 입력
  interface CombatActionBody {
    combatId: string;
    action: PlayerAction;
  }

  fastify.post('/combat/action', async (
    request: FastifyRequest<{ Body: CombatActionBody }>,
    reply: FastifyReply,
  ) => {
    const { combatId, action } = request.body;
    const engine = combatInstanceManager.get(combatId);
    if (!engine) {
      return reply.status(404).send({ error: '전투를 찾을 수 없습니다.' });
    }

    const accepted = engine.submitAction(action);
    return { success: accepted };
  });

  // ── POST /combat/:combatId/tick ───────────────────────────
  // 수동 틱 진행 (REST 기반 턴 진행)
  interface CombatIdParams {
    combatId: string;
  }

  fastify.post('/combat/:combatId/tick', async (
    request: FastifyRequest<{ Params: CombatIdParams }>,
    reply: FastifyReply,
  ) => {
    const { combatId } = request.params;
    const engine = combatInstanceManager.get(combatId);
    if (!engine) {
      return reply.status(404).send({ error: '전투를 찾을 수 없습니다.' });
    }

    const result = engine.processTick();
    return result;
  });

  // ── GET /combat/:combatId/state ───────────────────────────
  // 전투 현재 상태 조회
  fastify.get('/combat/:combatId/state', async (
    request: FastifyRequest<{ Params: CombatIdParams }>,
    reply: FastifyReply,
  ) => {
    const { combatId } = request.params;
    const engine = combatInstanceManager.get(combatId);
    if (!engine) {
      return reply.status(404).send({ error: '전투를 찾을 수 없습니다.' });
    }

    return {
      combatId,
      state: engine.getState(),
      tick: engine.getCurrentTick(),
      participants: engine.getSnapshot(),
    };
  });

  // ── POST /combat/:combatId/end ────────────────────────────
  // 전투 강제 종료
  fastify.post('/combat/:combatId/end', async (
    request: FastifyRequest<{ Params: CombatIdParams }>,
    reply: FastifyReply,
  ) => {
    const { combatId } = request.params;
    const engine = combatInstanceManager.get(combatId);
    if (!engine) {
      return reply.status(404).send({ error: '전투를 찾을 수 없습니다.' });
    }

    // 통계 생성 후 제거
    const stats = engine.getStatistics();
    combatInstanceManager.remove(combatId);

    return {
      success: true,
      combatId,
      statistics: stats,
    };
  });

  // ── GET /combat/:combatId/log ─────────────────────────────
  // 전투 로그 조회
  fastify.get('/combat/:combatId/log', async (
    request: FastifyRequest<{ Params: CombatIdParams }>,
    reply: FastifyReply,
  ) => {
    const { combatId } = request.params;
    const engine = combatInstanceManager.get(combatId);
    if (!engine) {
      return reply.status(404).send({ error: '전투를 찾을 수 없습니다.' });
    }

    return {
      combatId,
      entries: engine.getLogger().getEntries(),
      statistics: engine.getStatistics(),
    };
  });

  // ── GET /combat/:combatId/replay ──────────────────────────
  // 전투 리플레이 데이터
  fastify.get('/combat/:combatId/replay', async (
    request: FastifyRequest<{ Params: CombatIdParams }>,
    reply: FastifyReply,
  ) => {
    const { combatId } = request.params;
    const engine = combatInstanceManager.get(combatId);
    if (!engine) {
      return reply.status(404).send({ error: '전투를 찾을 수 없습니다.' });
    }

    const replay = engine.getReplay();
    if (!replay) {
      return reply.status(400).send({ error: '전투가 완료되지 않았습니다.' });
    }

    return replay;
  });

  // ── GET /combat/active ────────────────────────────────────
  // 활성 전투 목록
  fastify.get('/combat/active', async () => {
    return {
      activeCount: combatInstanceManager.activeCount(),
    };
  });
}
