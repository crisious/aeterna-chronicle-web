// ─── 전투 시스템 REST API 라우트 (P6-04/05) ────────────────────
// 상태이상 적용/조회 + 콤보 정보 API

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  statusEffectManager,
  EffectId,
  STATUS_EFFECT_DEFS,
} from '../combat/statusEffectManager';
import type { ResistStats } from '../combat/statusEffectManager';
import {
  comboManager,
  COMBO_DEFINITIONS,
  CHAIN_BONUSES,
} from '../combat/comboManager';

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
}
