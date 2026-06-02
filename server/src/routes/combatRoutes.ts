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
import { grantCombatGold, clearCombatReward } from '../combat/rewardGranter';
import { prisma } from '../db';
import { extractUserIdFromRequest } from '../security/jwtManager';
import { resolvePassiveModifiers } from '../skill/passiveResolver';
import { initCombatSkillsFromDb } from '../combat/skillAdapter';
import {
  isChronoEraId,
  chronoEraToEnemyMultipliers,
  decorateMonsterNameByEra,
  chronoEraBonusDrops,
  chronoEraToMonsterPassives,
} from '../../../shared/types/chronoEraAtb';

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
  // playerId 는 더 이상 신뢰하지 않는다(actor = 인증된 authUserId).
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
  // SECURITY-IDOR: HTTP /combat/start 로 생성된 세션의 소유자(userId)를 추적.
  // combatId 는 추측 불가한 uuid 지만, 누출 시 타 유저가 세션을 조작/열람하지 못하도록 소유권을 강제(defense-in-depth).
  // 소유자 미기록(소켓 등 다른 경로로 생성된) 세션은 허용해 기존 흐름을 보존한다.
  const combatOwners = new Map<string, string>();
  const isCombatOwner = (combatId: string, userId: string | undefined): boolean => {
    const owner = combatOwners.get(combatId);
    return !owner || owner === userId;
  };

  fastify.post('/combat/apply-effect', async (
    request: FastifyRequest<{ Body: ApplyEffectBody }>,
    reply: FastifyReply,
  ) => {
    // 보안(IDOR): actor 는 body 가 아니라 인증된 request.authUserId 를 신뢰한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

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
    reply: FastifyReply,
  ) => {
    // 보안(IDOR): 임의 대상 상태이상 조회 — 최소한 인증을 강제한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

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
    reply: FastifyReply,
  ) => {
    // 보안(IDOR): 디버프 제거 — 최소한 인증을 강제한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

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
    reply: FastifyReply,
  ) => {
    // 보안(IDOR): 콤보 추적 actor 는 body.playerId 가 아니라 인증된 authUserId 를 사용한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { skillCode, classId, hitCount } = request.body;

    const result = comboManager.recordSkillUse(
      userId,
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
      hints: comboManager.getNextHint(userId, classId),
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
  interface LegacyCombatantInput {
    id: string;
    name?: string;
    hp?: number;
    maxHp?: number;
    mp?: number;
    maxMp?: number;
    attack?: number;
    defense?: number;
    speed?: number;
    level?: number;
    classId?: string;
  }

  interface CombatStartBody {
    partyCharacterIds?: string[];
    monsterIds?: string[];
    party?: LegacyCombatantInput[];
    monsters?: LegacyCombatantInput[];
    autoMode?: boolean;
    /** CHRONO-S7: 시대 기반 ATB SpeedTier 적용 (ancient/present/ruined_future) */
    eraId?: string;
    /** zone id — monsterIds 미지정 시 서버가 이 zone(monsters.location)의 DB 몬스터로 전투를 구성한다. */
    zoneId?: string;
  }

  const toFiniteNumber = (value: number | undefined, fallback: number): number => (
    typeof value === 'number' && Number.isFinite(value) ? value : fallback
  );

  fastify.post('/combat/start', async (
    request: FastifyRequest<{ Body: CombatStartBody }>,
    reply: FastifyReply,
  ) => {
    // JWT 인증
    const userId = await extractUserIdFromRequest(request);
    if (!userId) {
      return reply.status(401).send({ error: '인증이 필요합니다.' });
    }

    const { partyCharacterIds, monsterIds, party, monsters, autoMode, eraId, zoneId } = request.body;
    const legacyPayload = Array.isArray(party) || Array.isArray(monsters);
    const effectivePartyCharacterIds = partyCharacterIds?.length
      ? partyCharacterIds
      : (party ?? []).map((member) => member.id).filter(Boolean);

    if (legacyPayload && process.env.NODE_ENV !== 'test') {
      return reply.status(400).send({ error: '레거시 전투 페이로드는 테스트 환경에서만 허용됩니다.' });
    }

    if (!effectivePartyCharacterIds.length) {
      return reply.status(400).send({ error: '파티 캐릭터 ID와 몬스터 ID 모두 필요합니다.' });
    }

    if (legacyPayload && (!party?.length || !monsters?.length || effectivePartyCharacterIds.length !== party.length)) {
      return reply.status(400).send({ error: '레거시 전투 페이로드의 party/monsters 배열이 유효하지 않습니다.' });
    }

    if (!legacyPayload && !monsterIds?.length && !zoneId) {
      return reply.status(400).send({ error: '파티 캐릭터 ID와 (몬스터 ID 또는 zoneId) 가 필요합니다.' });
    }

    try {
      // DB에서 파티 캐릭터 조회 (JWT userId 소유 검증)
      const characters = await prisma.character.findMany({
        where: { id: { in: effectivePartyCharacterIds }, userId },
      });
      if (characters.length !== effectivePartyCharacterIds.length) {
        return reply.status(403).send({ error: '소유하지 않은 캐릭터가 포함되어 있습니다.' });
      }

      // P56-S2: DB 스킬 cache lazy init — 첫 /combat/start 직전 한 번. 이후 호출은 즉시 resolve.
      await initCombatSkillsFromDb();

      // CHRONO-S7: 유효한 eraId 면 시대→tier 매핑 적용. 미지정/무효 시 표준 tier 3.
      const validEra = isChronoEraId(eraId) ? eraId : null;
      const engine = validEra
        ? combatInstanceManager.createFromEra(validEra, { autoMode: autoMode ?? false })
        : combatInstanceManager.create({ autoMode: autoMode ?? false });

      // CHRONO-S12: monster 스탯 보정 multiplier (HP/spd/reward/levelOffset).
      const enemyMult = validEra
        ? chronoEraToEnemyMultipliers(validEra)
        : { hp: 1.0, attackSpeed: 1.0, reward: 1.0, levelOffset: 0 };

      // CHRONO-S37: 시대별 monster 패시브 보너스 (evasion/hitChance).
      const eraPassives = validEra
        ? chronoEraToMonsterPassives(validEra)
        : { evasionAddPercent: 0, hitChanceAddPercent: 0 };

      // P55-S1: 캐릭터별 장착 패시브 효과 병렬 resolve
      const passiveResolutions = await Promise.all(
        characters.map(async (c) => ({ id: c.id, result: await resolvePassiveModifiers(c.id) })),
      );
      const passiveByCharacter = new Map(passiveResolutions.map((p) => [p.id, p.result]));

      for (const c of characters) {
        const base = CLASS_BASE_COMBAT_STATS[c.classId] ?? CLASS_BASE_COMBAT_STATS['ether_knight'];
        const growth = CLASS_GROWTH[c.classId] ?? CLASS_GROWTH['ether_knight'];
        const lvl = c.level - 1;
        const passiveMods = passiveByCharacter.get(c.id)?.modifiers;

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
          // P55-S1 passive modifiers (Phase 1 — 5종)
          evasionAddPercent: passiveMods?.evasionAddPercent ?? 0,
          hitChanceAddPercent: passiveMods?.hitChanceAddPercent ?? 0,
          mpRegenPerTurn: passiveMods?.mpRegenPerTurn ?? 0,
          lowHpAtkBonusPercent: passiveMods?.lowHpAtkBonusPercent ?? 0,
          defenseUpConditionalPercent: passiveMods?.defenseUpConditionalPercent ?? 0,
          // P55-S3 trigger passive modifiers (Phase 3 — 4종)
          reflectPercent: passiveMods?.reflectPercent ?? 0,
          projectileReflectPercent: passiveMods?.projectileReflectPercent ?? 0,
          hpRegenPerTurn: passiveMods?.hpRegenPerTurn ?? 0,
          cheatDeathChargesMax: passiveMods?.cheatDeathChargesMax ?? 0,
          // P55-S5 Phase 4 (부분) — 2종
          critEchoPercent: passiveMods?.critEchoPercent ?? 0,
          moveDamageAuraValue: passiveMods?.moveDamageAuraValue ?? 0,
          // P55-S6 auto_resurrect — duration + value + charges
          autoResurrectDelay: passiveMods?.autoResurrectDelay ?? 0,
          autoResurrectHpPercent: passiveMods?.autoResurrectHpPercent ?? 0,
          autoResurrectChargesMax: passiveMods?.autoResurrectChargesMax ?? 0,
          // P55-S7 poison_amplify — DoT 증폭
          poisonAmplifyPercent: passiveMods?.poisonAmplifyPercent ?? 0,
          // P56-S3 drain_amplify — lifesteal 증폭
          drainAmplifyPercent: passiveMods?.drainAmplifyPercent ?? 0,
        });
      }

      if (legacyPayload) {
        for (const m of monsters ?? []) {
          const rawMaxHp = Math.max(1, toFiniteNumber(m.maxHp ?? m.hp, 100));
          // CHRONO-S12: era multiplier 적용
          const maxHp = Math.max(1, Math.round(rawMaxHp * enemyMult.hp));
          const hp = Math.max(1, Math.min(Math.round(toFiniteNumber(m.hp, rawMaxHp) * enemyMult.hp), maxHp));
          const spd = Math.max(1, Math.round(toFiniteNumber(m.speed, 10) * enemyMult.attackSpeed));
          engine.addParticipant({
            id: m.id,
            name: validEra ? decorateMonsterNameByEra(m.name ?? m.id, validEra) : (m.name ?? m.id),
            classId: m.classId ?? 'normal',
            level: Math.max(1, toFiniteNumber(m.level, 1) + enemyMult.levelOffset),
            hp,
            maxHp,
            // CHRONO-S37: era 패시브
            evasionAddPercent: eraPassives.evasionAddPercent,
            hitChanceAddPercent: eraPassives.hitChanceAddPercent,
            mp: Math.max(0, toFiniteNumber(m.mp, 0)),
            maxMp: Math.max(0, toFiniteNumber(m.maxMp ?? m.mp, 0)),
            atk: Math.max(1, toFiniteNumber(m.attack, 10)),
            def: Math.max(0, toFiniteNumber(m.defense, 0)),
            matk: Math.max(1, toFiniteNumber(m.attack, 10)),
            mdef: Math.max(0, toFiniteNumber(m.defense, 0)),
            spd,
            critRate: 0.05,
            critDamage: 1.5,
            isMonster: true,
            atbGauge: 0,
            alive: true,
            team: 'monsters',
            isBoss: false,
            element: 'neutral' as ElementType,
            armorPenetration: 0,
            armorPenetrationPercent: 0,
            baseExp: 0,
            baseGold: 0,
            dropTable: [],
          });
        }
      } else {
        // monsterIds 가 없으면 zone 기반으로 DB 몬스터를 해결한다.
        // (클라 하드코딩 id ↔ 시나리오 인카운터 id ↔ DB 몬스터 id 가 분열돼 있어,
        //  서버가 monsters.location = zoneId 로 직접 조회하는 것이 유일하게 정합적인 경로다.)
        let effectiveMonsterIds = monsterIds ?? [];
        if (!effectiveMonsterIds.length && zoneId) {
          const zoneMonsters = await prisma.monster.findMany({
            where: { location: zoneId, isActive: true },
            orderBy: { level: 'asc' },
            take: 3,
          });
          effectiveMonsterIds = zoneMonsters.map((m) => m.id);
        }
        if (!effectiveMonsterIds.length) {
          return reply.status(400).send({ error: '전투에 사용할 몬스터를 찾을 수 없습니다(zoneId/monsterIds).' });
        }

        // DB에서 몬스터 조회
        const dbMonsters = await prisma.monster.findMany({
          where: { id: { in: effectiveMonsterIds }, isActive: true },
        });
        if (dbMonsters.length !== effectiveMonsterIds.length) {
          return reply.status(400).send({ error: '존재하지 않거나 비활성 몬스터가 포함되어 있습니다.' });
        }

        for (const m of dbMonsters) {
          // CHRONO-S12: era multiplier 적용 — HP/spd/level/reward 보정
          const adjHp = Math.max(1, Math.round(m.hp * enemyMult.hp));
          const adjSpd = Math.max(1, Math.round(m.speed * enemyMult.attackSpeed));
          const adjLevel = Math.max(1, m.level + enemyMult.levelOffset);
          const adjExp = Math.max(0, Math.round(m.expReward * enemyMult.reward));
          const adjGold = Math.max(0, Math.round(m.goldReward * enemyMult.reward));
          engine.addParticipant({
            id: m.id,
            name: validEra ? decorateMonsterNameByEra(m.name, validEra) : m.name,
            classId: m.type,
            level: adjLevel,
            hp: adjHp,
            maxHp: adjHp,
            mp: 0,
            maxMp: 0,
            // CHRONO-S37: era 패시브 (ancient evasion / ruined_future hitChance)
            evasionAddPercent: eraPassives.evasionAddPercent,
            hitChanceAddPercent: eraPassives.hitChanceAddPercent,
            atk: m.attack,
            def: m.defense,
            matk: m.attack,
            mdef: m.defense,
            spd: adjSpd,
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
            baseExp: adjExp,
            baseGold: adjGold,
            // CHRONO-S30: era bonus rare drops append (시대 전용 아이템)
            dropTable: [
              ...((m.dropTable as unknown as DropEntry[]) ?? []),
              ...(validEra ? chronoEraBonusDrops(validEra).map((d) => ({ ...d })) : []),
            ],
          });
        }
      }

      engine.start();

      // P55-S1: 패시브 트레이스 — 캐릭터별 적용/대기 effect 노출 (QA/UI 검증용)
      const passiveTrace = Array.from(passiveByCharacter.entries()).map(([id, r]) => ({
        characterId: id,
        modifiers: r.modifiers,
        applied: r.applied,
        pending: r.pending,
      }));

      // SECURITY-IDOR: 세션 소유자 = /combat/start 를 호출한 인증 사용자
      combatOwners.set(engine.combatId, userId);

      return {
        success: true,
        combatId: engine.combatId,
        state: engine.getState(),
        participants: engine.getSnapshot(),
        passiveTrace,
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
    // 보안(IDOR): 인증 강제 + 본인 세션 소유권 검증(combatOwners, 아래 engine 조회 후)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { combatId, action } = request.body;
    const engine = combatInstanceManager.get(combatId);
    if (!engine) {
      return reply.status(404).send({ error: '전투를 찾을 수 없습니다.' });
    }
    if (!isCombatOwner(combatId, userId)) {
      return reply.status(403).send({ error: '본인 전투 세션이 아닙니다.' });
    }

    const accepted = engine.submitAction(action);
    return { success: accepted };
  });

  // ── POST /combat/dual_tech (CHRONO-S19) ────────────────────
  // 크로노 트리거 2인 협공 예약. 다음 tick 직전에 실행됨.
  interface CombatDualTechBody {
    combatId: string;
    actorIdA: string;
    actorIdB: string;
    techId: string;
    targetId: string;
  }

  fastify.post('/combat/dual_tech', async (
    request: FastifyRequest<{ Body: CombatDualTechBody }>,
    reply: FastifyReply,
  ) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) {
      return reply.status(401).send({ error: '인증이 필요합니다.' });
    }

    const { combatId, actorIdA, actorIdB, techId, targetId } = request.body;
    if (!combatId || !actorIdA || !actorIdB || !techId || !targetId) {
      return reply.status(400).send({ error: '필수 파라미터 누락' });
    }

    const engine = combatInstanceManager.get(combatId);
    if (!engine) {
      return reply.status(404).send({ error: '전투를 찾을 수 없습니다.' });
    }
    if (!isCombatOwner(combatId, userId)) {
      return reply.status(403).send({ error: '본인 전투 세션이 아닙니다.' });
    }

    const accepted = engine.submitDualTech(actorIdA, actorIdB, techId, targetId);
    if (!accepted) {
      return reply.status(400).send({
        error: '협공 발동 불가 (ATB/클래스/MP 또는 협공 ID 검증 실패)',
      });
    }
    return { success: true };
  });

  // ── POST /combat/triple_tech (CHRONO-S62) ──────────────────
  // 크로노 트리거 3인 협공 예약.
  interface CombatTripleTechBody {
    combatId: string;
    actorIds: [string, string, string];
    techId: string;
    targetId: string;
  }

  fastify.post('/combat/triple_tech', async (
    request: FastifyRequest<{ Body: CombatTripleTechBody }>,
    reply: FastifyReply,
  ) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) {
      return reply.status(401).send({ error: '인증이 필요합니다.' });
    }

    const { combatId, actorIds, techId, targetId } = request.body;
    if (!combatId || !Array.isArray(actorIds) || actorIds.length !== 3 || !techId || !targetId) {
      return reply.status(400).send({ error: '필수 파라미터 누락 (actorIds 3개 필요)' });
    }

    const engine = combatInstanceManager.get(combatId);
    if (!engine) {
      return reply.status(404).send({ error: '전투를 찾을 수 없습니다.' });
    }
    if (!isCombatOwner(combatId, userId)) {
      return reply.status(403).send({ error: '본인 전투 세션이 아닙니다.' });
    }

    const accepted = engine.submitTripleTech(actorIds, techId, targetId);
    if (!accepted) {
      return reply.status(400).send({
        error: '3인 협공 발동 불가 (ATB/클래스/MP 또는 협공 ID 검증 실패)',
      });
    }
    return { success: true };
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
    // 보안(IDOR): 인증 강제 + 본인 세션 소유권 검증(combatOwners, 아래 engine 조회 후)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { combatId } = request.params;
    const engine = combatInstanceManager.get(combatId);
    if (!engine) {
      return reply.status(404).send({ error: '전투를 찾을 수 없습니다.' });
    }
    if (!isCombatOwner(combatId, userId)) {
      return reply.status(403).send({ error: '본인 전투 세션이 아닙니다.' });
    }

    const result = engine.processTick();
    // SECURITY/경제: 전투 종료(파티 승리) 시 서버 산정 골드를 자동 지급 (클라이언트 goldTotal 신뢰 제거)
    if (result.combatEnded && result.winner === 'party' && result.rewards) {
      const partyIds = engine.getSnapshot().filter((p) => p.team === 'party').map((p) => p.id);
      await grantCombatGold(combatId, partyIds, result.rewards);
    }
    return result;
  });

  // ── GET /combat/:combatId/state ───────────────────────────
  // 전투 현재 상태 조회
  fastify.get('/combat/:combatId/state', async (
    request: FastifyRequest<{ Params: CombatIdParams }>,
    reply: FastifyReply,
  ) => {
    // 보안(IDOR): 인증 강제 + 본인 세션 소유권 검증(combatOwners, 아래 engine 조회 후)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { combatId } = request.params;
    const engine = combatInstanceManager.get(combatId);
    if (!engine) {
      return reply.status(404).send({ error: '전투를 찾을 수 없습니다.' });
    }
    if (!isCombatOwner(combatId, userId)) {
      return reply.status(403).send({ error: '본인 전투 세션이 아닙니다.' });
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
    // 보안(IDOR): 인증 강제 + 본인 세션 소유권 검증(combatOwners, 아래 engine 조회 후)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { combatId } = request.params;
    const engine = combatInstanceManager.get(combatId);
    if (!engine) {
      return reply.status(404).send({ error: '전투를 찾을 수 없습니다.' });
    }
    if (!isCombatOwner(combatId, userId)) {
      return reply.status(403).send({ error: '본인 전투 세션이 아닙니다.' });
    }

    // 통계 생성 후 제거
    const stats = engine.getStatistics();
    combatInstanceManager.remove(combatId);
    combatOwners.delete(combatId);
    clearCombatReward(combatId);

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
    // 보안(IDOR): 인증 강제 + 본인 세션 소유권 검증(combatOwners, 아래 engine 조회 후)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { combatId } = request.params;
    const engine = combatInstanceManager.get(combatId);
    if (!engine) {
      return reply.status(404).send({ error: '전투를 찾을 수 없습니다.' });
    }
    if (!isCombatOwner(combatId, userId)) {
      return reply.status(403).send({ error: '본인 전투 세션이 아닙니다.' });
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
    // 보안(IDOR): 인증 강제 + 본인 세션 소유권 검증(combatOwners, 아래 engine 조회 후)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { combatId } = request.params;
    const engine = combatInstanceManager.get(combatId);
    if (!engine) {
      return reply.status(404).send({ error: '전투를 찾을 수 없습니다.' });
    }
    if (!isCombatOwner(combatId, userId)) {
      return reply.status(403).send({ error: '본인 전투 세션이 아닙니다.' });
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
