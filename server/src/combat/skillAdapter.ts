// ─── DB Skill → Combat SkillDefinition 어댑터 (P56-S1) ─────────
//
// 두 스킬 시스템 통합 1단계:
//   - server/src/skill/skillSeeds.ts (180 스킬, DB persisted)
//   - server/src/combat/skillSystem.ts (30 hardcoded SKILL_DATABASE)
//
// 본 어댑터는 DB Skill 레코드를 combat-time SkillDefinition 형태로 변환.
// P56-S2 에서 engine wiring (combatInstanceManager init 시 prefetch + cache).
// P56-S3 에서 lifesteal/drain_amplify 본격 구현.

import { prisma } from '../db';
import type { DamageType, ElementType } from './damageCalculator';
import type { SkillDefinition } from './skillSystem';
import { setDbSkillCache } from './skillSystem';

// ─── 매핑 테이블 ───────────────────────────────────────────────

/** DB 의 element (10종) → combat 의 ElementType (7종) */
const DB_TO_COMBAT_ELEMENT: Record<string, ElementType> = {
  // 직접 매핑
  fire: 'fire',
  water: 'water',
  wind: 'wind',
  earth: 'earth',
  light: 'light',
  dark: 'dark',
  neutral: 'neutral',
  // DB 만의 element → 가장 가까운 combat 매핑
  aether: 'light',  // 빛/마법 에너지 → 빛
  time: 'neutral',  // 시간 → 중립 (combat 에 time 없음)
  void: 'dark',     // 공허 → 어둠
  ice: 'water',     // 얼음 → 물 계열
};

/** 클래스별 기본 데미지 타입 — 개별 skill 의 effect 로 override 가능 */
const CLASS_DEFAULT_DAMAGE_TYPE: Record<string, DamageType> = {
  ether_knight: 'physical',
  memory_breaker: 'physical',
  shadow_weaver: 'physical',
  memory_weaver: 'magical',
  time_guardian: 'magical',
  void_wanderer: 'magical',
};

/** effect.type 이 status effect 인 경우 그대로 사용. 상태이상으로 인정되는 type 집합. */
const STATUS_EFFECT_TYPES: ReadonlySet<string> = new Set([
  'stun', 'freeze', 'silence', 'slow', 'poison', 'burn', 'bleed', 'blind', 'curse',
]);

// ─── DB Skill row 의 최소 형태 ─────────────────────────────────

/**
 * Prisma `Skill` 모델의 본 어댑터가 필요로 하는 부분 집합.
 * 실제 prisma return 타입이 호환되도록 구조적 타입 사용.
 */
export interface DbSkillLike {
  code: string;
  name: string;
  description: string;
  class: string;
  type: string;          // 'active' | 'passive' | 'ultimate'
  element: string;
  damage: number;
  damageScale: number;
  mpCost: number;
  cooldown: number;      // 초
  targetType: string;    // 'single' | 'aoe' | 'self' | ...
  aoeRadius: number | null;
  effect: unknown;       // Json | null  ({ type, value, duration } 형태 추정)
  requiredLevel: number;
}

// ─── 헬퍼 ──────────────────────────────────────────────────────

export function mapElement(dbElement: string): ElementType {
  return DB_TO_COMBAT_ELEMENT[dbElement] ?? 'neutral';
}

export function inferDamageType(dbSkill: Pick<DbSkillLike, 'class' | 'effect'>): DamageType {
  // effect.type 이 magical 표지 (mind/memory/spell 류) 이면 override
  if (dbSkill.effect && typeof dbSkill.effect === 'object') {
    const e = dbSkill.effect as { type?: unknown };
    if (typeof e.type === 'string') {
      if (e.type === 'silence' || e.type === 'curse') return 'magical';
    }
  }
  return CLASS_DEFAULT_DAMAGE_TYPE[dbSkill.class] ?? 'physical';
}

export function inferTargetCount(targetType: string): number {
  switch (targetType) {
    case 'aoe': return -1;
    case 'multi': return 3;
    case 'self':
    case 'single':
    default:
      return 1;
  }
}

/**
 * effect json 이 status effect 면 (type, default chance) 추출, 아니면 null.
 * passive effect (mp_regen, reflect 등) 는 status effect 아님 → null.
 */
export function extractStatusEffect(
  effect: unknown,
): { effect: string; chance: number } | null {
  if (!effect || typeof effect !== 'object') return null;
  const e = effect as { type?: unknown; value?: unknown };
  if (typeof e.type !== 'string') return null;
  if (!STATUS_EFFECT_TYPES.has(e.type)) return null;
  // value 가 50 같은 % 라면 그대로, 아니면 default 50
  const chance = typeof e.value === 'number' && e.value > 0 && e.value <= 100
    ? e.value
    : 50;
  return { effect: e.type, chance };
}

/**
 * effect json 이 lifesteal 이면 percent 추출, 아니면 null.
 * (sw_soul_drain: { type: 'lifesteal', value: 50 })
 */
export function extractLifestealPercent(effect: unknown): number | null {
  if (!effect || typeof effect !== 'object') return null;
  const e = effect as { type?: unknown; value?: unknown };
  if (e.type !== 'lifesteal') return null;
  if (typeof e.value !== 'number' || e.value <= 0) return null;
  return e.value;
}

// ─── 메인 어댑터 ───────────────────────────────────────────────

/**
 * DB Skill row → combat SkillDefinition.
 *
 * 매핑 규칙:
 *   - id ← code (DB code 가 combat 의 새 통합 ID)
 *   - damageMultiplier ← damageScale (DB 값 그대로)
 *   - cooldownTicks ← cooldown (초 → tick 1:1, 1tick=1s 가정)
 *   - element: DB 10종 → combat 7종 매핑
 *   - damageType: 클래스 기본값 (effect 로 override)
 *   - targetCount: targetType → 숫자
 *   - statusEffect/Chance: effect 가 status type 일 때만
 */
export function mapDbSkillToCombatDef(dbSkill: DbSkillLike): SkillDefinition {
  const status = extractStatusEffect(dbSkill.effect);
  const lifesteal = extractLifestealPercent(dbSkill.effect);
  const def: SkillDefinition = {
    id: dbSkill.code,
    name: dbSkill.name,
    classId: dbSkill.class,
    damageType: inferDamageType(dbSkill),
    element: mapElement(dbSkill.element),
    damageMultiplier: dbSkill.damageScale,
    manaCost: dbSkill.mpCost,
    cooldownTicks: Math.max(0, Math.floor(dbSkill.cooldown)),
    targetCount: inferTargetCount(dbSkill.targetType),
    requiredLevel: dbSkill.requiredLevel,
    description: dbSkill.description,
  };
  if (status) {
    def.statusEffect = status.effect;
    def.statusEffectChance = status.chance;
  }
  if (lifesteal !== null) {
    def.lifestealPercent = lifesteal;
  }
  return def;
}

// ─── DB 일괄 로드 ──────────────────────────────────────────────

/**
 * DB 의 모든 active/ultimate 스킬을 combat 형태로 변환해 Map<code, SkillDefinition> 반환.
 *
 * passive 는 별도 시스템(passiveResolver) 이라 제외.
 * 본 함수는 combatInstanceManager 초기화 시 한 번 호출 (P56-S2 wiring).
 */
export async function loadCombatSkillsFromDb(): Promise<Map<string, SkillDefinition>> {
  const rows = await prisma.skill.findMany({
    where: { type: { in: ['active', 'ultimate'] } },
  });
  const out = new Map<string, SkillDefinition>();
  for (const row of rows) {
    out.set(row.code, mapDbSkillToCombatDef(row as unknown as DbSkillLike));
  }
  return out;
}

// ─── 초기화 진입점 (P56-S2) ────────────────────────────────────

let initInFlight: Promise<Map<string, SkillDefinition>> | null = null;
let initialized = false;

/**
 * combat 시스템에 DB 스킬 cache 를 주입. 앱 라이프사이클 동안 한 번만 실제 실행.
 * 이미 초기화 됐으면 즉시 반환. 동시 호출은 단일 promise 공유.
 *
 * 호출 위치 권장: combatRoutes 의 첫 /combat/start 직전 (lazy).
 * 또는 server bootstrap 끝에 fire-and-forget.
 */
export async function initCombatSkillsFromDb(force: boolean = false): Promise<Map<string, SkillDefinition>> {
  if (initialized && !force) {
    return (await initInFlight)!;
  }
  if (!initInFlight || force) {
    initInFlight = (async () => {
      const cache = await loadCombatSkillsFromDb();
      setDbSkillCache(cache);
      initialized = true;
      return cache;
    })();
  }
  return initInFlight;
}

/** 테스트용 — 상태 reset */
export function _resetInitState(): void {
  initialized = false;
  initInFlight = null;
  setDbSkillCache(null);
}
