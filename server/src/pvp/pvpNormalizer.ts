/**
 * pvpNormalizer.ts — PvP 스탯 정규화 + 클래스 조정 + 디미니싱 리턴 (P6-08)
 *
 * 장비 스코어 정규화:
 *   normalizedStat = baseStat + (equipStat × normalizeFactor)
 *   normalizeFactor = targetGearScore / actualGearScore (cap: 0.5~1.5)
 *
 * PvP 전용 글로벌 조정:
 *   - 힐  -30%
 *   - CC 지속 -40%
 *   - 데미지 -20%
 *
 * 클래스별 조정:
 *   - 에테르 기사: 방어+10%, 공격-5%
 *   - 기억술사: 마법+5%, HP-10%
 *   - 그림자: 크리+15%, 방어-15%
 *
 * 디미니싱 리턴 (DR):
 *   같은 CC 연속 적용 시 50% → 25% → 면역
 */

// ─── 정규화 상수 ────────────────────────────────────────────

/** PvP 기준 장비 스코어 */
export const TARGET_GEAR_SCORE = 1000;

/** 정규화 팩터 범위 */
export const NORMALIZE_FACTOR_MIN = 0.5;
export const NORMALIZE_FACTOR_MAX = 1.5;

// ─── 글로벌 PvP 조정값 ─────────────────────────────────────

export const PVP_GLOBAL_MODIFIERS = {
  healMultiplier: 0.70,    // 힐 -30%
  ccDurationMultiplier: 0.60,  // CC 지속 -40%
  damageMultiplier: 0.80,  // 데미지 -20%
} as const;

// ─── 클래스별 PvP 조정값 ────────────────────────────────────

export interface ClassPvpModifier {
  className: string;
  defenseMultiplier: number;
  attackMultiplier: number;
  magicMultiplier: number;
  hpMultiplier: number;
  critMultiplier: number;
}

export const CLASS_PVP_MODIFIERS: Record<string, ClassPvpModifier> = {
  ether_knight: {
    className: '에테르 기사',
    defenseMultiplier: 1.10,   // 방어 +10%
    attackMultiplier: 0.95,    // 공격 -5%
    magicMultiplier: 1.00,
    hpMultiplier: 1.00,
    critMultiplier: 1.00,
  },
  memory_mage: {
    className: '기억술사',
    defenseMultiplier: 1.00,
    attackMultiplier: 1.00,
    magicMultiplier: 1.05,     // 마법 +5%
    hpMultiplier: 0.90,        // HP -10%
    critMultiplier: 1.00,
  },
  shadow: {
    className: '그림자',
    defenseMultiplier: 0.85,   // 방어 -15%
    attackMultiplier: 1.00,
    magicMultiplier: 1.00,
    hpMultiplier: 1.00,
    critMultiplier: 1.15,      // 크리 +15%
  },
} as const;

/** 클래스 기본 조정값 (미등록 클래스용) */
const DEFAULT_CLASS_MODIFIER: ClassPvpModifier = {
  className: '기본',
  defenseMultiplier: 1.00,
  attackMultiplier: 1.00,
  magicMultiplier: 1.00,
  hpMultiplier: 1.00,
  critMultiplier: 1.00,
};

// ─── 장비 스코어 정규화 ─────────────────────────────────────

/**
 * 정규화 팩터 계산
 */
export function getNormalizeFactor(actualGearScore: number): number {
  if (actualGearScore <= 0) return 1.0;
  const raw = TARGET_GEAR_SCORE / actualGearScore;
  return Math.max(NORMALIZE_FACTOR_MIN, Math.min(NORMALIZE_FACTOR_MAX, raw));
}

/**
 * 개별 스탯 정규화
 *
 * @param baseStat   기본 스탯 (레벨/직업에 의한)
 * @param equipStat  장비에 의한 추가 스탯
 * @param actualGearScore 실제 장비 스코어
 * @returns 정규화된 스탯
 */
export function normalizeStat(baseStat: number, equipStat: number, actualGearScore: number): number {
  const factor = getNormalizeFactor(actualGearScore);
  return Math.round(baseStat + equipStat * factor);
}

// ─── 전체 스탯 정규화 ───────────────────────────────────────

export interface RawStats {
  hp: number;
  attack: number;
  defense: number;
  magic: number;
  crit: number;
  // 장비분
  equipHp: number;
  equipAttack: number;
  equipDefense: number;
  equipMagic: number;
  equipCrit: number;
  // 메타
  gearScore: number;
  classCode: string;
}

export interface NormalizedStats {
  hp: number;
  attack: number;
  defense: number;
  magic: number;
  crit: number;
  normalizeFactor: number;
  classModifier: ClassPvpModifier;
}

/**
 * 전체 PvP 스탯 정규화: 장비 스코어 정규화 + 클래스 조정 적용
 */
export function normalizeForPvp(raw: RawStats): NormalizedStats {
  const factor = getNormalizeFactor(raw.gearScore);
  const classMod = CLASS_PVP_MODIFIERS[raw.classCode] ?? DEFAULT_CLASS_MODIFIER;

  const hp = Math.round(
    (raw.hp + raw.equipHp * factor) * classMod.hpMultiplier,
  );
  const attack = Math.round(
    (raw.attack + raw.equipAttack * factor) * classMod.attackMultiplier,
  );
  const defense = Math.round(
    (raw.defense + raw.equipDefense * factor) * classMod.defenseMultiplier,
  );
  const magic = Math.round(
    (raw.magic + raw.equipMagic * factor) * classMod.magicMultiplier,
  );
  const crit = Math.round(
    (raw.crit + raw.equipCrit * factor) * classMod.critMultiplier,
  );

  return { hp, attack, defense, magic, crit, normalizeFactor: factor, classModifier: classMod };
}

// ─── 글로벌 PvP 값 보정 ────────────────────────────────────

/** PvP 데미지 보정 */
export function applyPvpDamage(baseDamage: number): number {
  return Math.round(baseDamage * PVP_GLOBAL_MODIFIERS.damageMultiplier);
}

/** PvP 힐 보정 */
export function applyPvpHeal(baseHeal: number): number {
  return Math.round(baseHeal * PVP_GLOBAL_MODIFIERS.healMultiplier);
}

/** PvP CC 지속시간 보정 (초 단위) */
export function applyPvpCcDuration(baseDuration: number): number {
  return baseDuration * PVP_GLOBAL_MODIFIERS.ccDurationMultiplier;
}

// ─── 디미니싱 리턴 (Diminishing Returns) ────────────────────

/** DR 단계: 1차(100%) → 2차(50%) → 3차(25%) → 면역(0%) */
const DR_SCALE = [1.0, 0.5, 0.25, 0.0] as const;

/** DR 상태 추적: targetId → ccType → 적용 횟수 */
const drTracker = new Map<string, Map<string, number>>();

/** DR 리셋 타이머: targetId → ccType → timeout */
const drTimers = new Map<string, Map<string, ReturnType<typeof setTimeout>>>();

/** DR 리셋 시간 (15초간 같은 CC 미적용 시 카운트 리셋) */
const DR_RESET_MS = 15_000;

/**
 * CC 지속시간에 디미니싱 리턴을 적용한다.
 *
 * @param targetId 대상 플레이어 ID
 * @param ccType   CC 유형 (stun, root, silence 등)
 * @param baseDuration 기본 지속시간 (초)
 * @returns 실제 적용 지속시간 (초), 0이면 면역
 */
export function applyDiminishingReturn(
  targetId: string,
  ccType: string,
  baseDuration: number,
): number {
  if (!drTracker.has(targetId)) {
    drTracker.set(targetId, new Map());
  }
  const targetDr = drTracker.get(targetId)!;

  const count = targetDr.get(ccType) ?? 0;
  const scaleIdx = Math.min(count, DR_SCALE.length - 1);
  const scale = DR_SCALE[scaleIdx];

  // 카운트 증가
  targetDr.set(ccType, count + 1);

  // 리셋 타이머 갱신
  if (!drTimers.has(targetId)) {
    drTimers.set(targetId, new Map());
  }
  const targetTimers = drTimers.get(targetId)!;
  const existingTimer = targetTimers.get(ccType);
  if (existingTimer) clearTimeout(existingTimer);

  targetTimers.set(
    ccType,
    setTimeout(() => {
      targetDr.delete(ccType);
      targetTimers.delete(ccType);
      // 빈 맵 정리
      if (targetDr.size === 0) drTracker.delete(targetId);
      if (targetTimers.size === 0) drTimers.delete(targetId);
    }, DR_RESET_MS),
  );

  // PvP CC 글로벌 감소 + DR 적용
  const pvpDuration = applyPvpCcDuration(baseDuration);
  return pvpDuration * scale;
}

/** 특정 대상의 DR 상태 초기화 (매치 종료 시) */
export function resetDiminishingReturn(targetId: string): void {
  const timers = drTimers.get(targetId);
  if (timers) {
    for (const t of timers.values()) clearTimeout(t);
    drTimers.delete(targetId);
  }
  drTracker.delete(targetId);
}

/** 전체 DR 상태 초기화 (서버 셧다운) */
export function resetAllDr(): void {
  for (const [, timers] of drTimers) {
    for (const t of timers.values()) clearTimeout(t);
  }
  drTimers.clear();
  drTracker.clear();
}
