/**
 * P28-01: 전투 밸런스 패스 — 통합 밸런스 설정
 *
 * 몬스터 HP/ATK/DEF 곡선, 보상 경험치/골드, 스킬 데미지 계수 일괄 관리.
 * 기존 balanceTable.ts의 경제 곡선과 연동.
 */

// ─── 몬스터 레벨 곡선 (1~100) ────────────────────────────────

export interface MonsterStatCurve {
  level: number;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  expReward: number;
  goldReward: number;
}

/**
 * 몬스터 스탯 곡선 생성
 * 설계:
 *   HP  = 80 + lv^1.8 × 12      (1레벨 92, 50레벨 ~20K, 100레벨 ~60K)
 *   ATK = 8  + lv^1.5 × 2.5     (완만 → 고레벨 가파름)
 *   DEF = 3  + lv^1.3 × 1.8
 *   EXP = 15 + lv^1.6 × 3       (레벨업 소요 시간 40분 → 2시간 증가)
 *   Gold= 5  + lv^1.35 × 2      (경제 밸런스와 동기화)
 */
export function generateMonsterStatCurves(): MonsterStatCurve[] {
  const curves: MonsterStatCurve[] = [];
  for (let lv = 1; lv <= 100; lv++) {
    curves.push({
      level: lv,
      baseHp:     Math.round(80  + Math.pow(lv, 1.8) * 12),
      baseAtk:    Math.round(8   + Math.pow(lv, 1.5) * 2.5),
      baseDef:    Math.round(3   + Math.pow(lv, 1.3) * 1.8),
      expReward:  Math.round(15  + Math.pow(lv, 1.6) * 3),
      goldReward: Math.round(5   + Math.pow(lv, 1.35) * 2),
    });
  }
  return curves;
}

// ─── 보스 배율 ────────────────────────────────────────────────

export interface BossMultiplier {
  tier: 'field_boss' | 'dungeon_boss' | 'raid_boss' | 'world_boss';
  hpMultiplier: number;
  atkMultiplier: number;
  defMultiplier: number;
  expMultiplier: number;
  goldMultiplier: number;
}

export const BOSS_MULTIPLIERS: Record<string, BossMultiplier> = {
  field_boss:   { tier: 'field_boss',   hpMultiplier: 5,   atkMultiplier: 2,   defMultiplier: 1.5, expMultiplier: 8,   goldMultiplier: 10 },
  dungeon_boss: { tier: 'dungeon_boss', hpMultiplier: 10,  atkMultiplier: 2.5, defMultiplier: 2,   expMultiplier: 15,  goldMultiplier: 20 },
  raid_boss:    { tier: 'raid_boss',    hpMultiplier: 50,  atkMultiplier: 3,   defMultiplier: 2.5, expMultiplier: 50,  goldMultiplier: 50 },
  world_boss:   { tier: 'world_boss',   hpMultiplier: 100, atkMultiplier: 4,   defMultiplier: 3,   expMultiplier: 100, goldMultiplier: 100 },
};

// ─── 경험치 곡선 (레벨업 필요 EXP) ──────────────────────────────

/**
 * 레벨업 필요 경험치 = 100 + (lv - 1)^2.2 × 25
 * lv 1→2:  100
 * lv 10→11: ~4,500
 * lv 50→51: ~120,000
 * lv 99→100: ~700,000
 */
export function expToNextLevel(level: number): number {
  if (level >= 100) return Infinity;
  return Math.round(100 + Math.pow(level - 1, 2.2) * 25);
}

/**
 * 누적 경험치 테이블 (1~100)
 */
export function generateExpTable(): { level: number; required: number; cumulative: number }[] {
  const table: { level: number; required: number; cumulative: number }[] = [];
  let cumulative = 0;
  for (let lv = 1; lv <= 100; lv++) {
    const req = expToNextLevel(lv);
    table.push({ level: lv, required: req, cumulative });
    cumulative += req;
  }
  return table;
}

// ─── 스킬 데미지 계수 (6클래스) ─────────────────────────────────

export type ClassId =
  | 'ether_knight'
  | 'memory_weaver'
  | 'shadow_weaver'
  | 'memory_breaker'
  | 'time_guardian'
  | 'void_wanderer';

export interface SkillCoefficient {
  skillId: string;
  classId: ClassId;
  name: string;
  damageCoeff: number;       // ATK 대비 배율
  cooldownSec: number;
  manaCost: number;
  /** 1: 단일, 2: 범위(최대 3), 3: 전체 */
  targetType: 1 | 2 | 3;
  unlockLevel: number;
}

/** P28 밸런스 패스 — 클래스별 스킬 계수 (핵심 스킬 4개씩) */
export const SKILL_COEFFICIENTS: SkillCoefficient[] = [
  // ── 에테르 기사 ────────────────────────────────
  { skillId: 'ek_strike',    classId: 'ether_knight',   name: '에테르 강타',     damageCoeff: 1.8,  cooldownSec: 3,  manaCost: 15,  targetType: 1, unlockLevel: 1  },
  { skillId: 'ek_shield',    classId: 'ether_knight',   name: '에테르 방벽',     damageCoeff: 0,    cooldownSec: 12, manaCost: 25,  targetType: 1, unlockLevel: 5  },
  { skillId: 'ek_charge',    classId: 'ether_knight',   name: '돌진 베기',       damageCoeff: 2.5,  cooldownSec: 8,  manaCost: 30,  targetType: 1, unlockLevel: 15 },
  { skillId: 'ek_ult',       classId: 'ether_knight',   name: '에테르 폭주',     damageCoeff: 4.2,  cooldownSec: 30, manaCost: 80,  targetType: 2, unlockLevel: 30 },

  // ── 기억술사 ──────────────────────────────────
  { skillId: 'mw_bolt',      classId: 'memory_weaver',  name: '기억 화살',       damageCoeff: 2.0,  cooldownSec: 2,  manaCost: 12,  targetType: 1, unlockLevel: 1  },
  { skillId: 'mw_weave',     classId: 'memory_weaver',  name: '기억 직조',       damageCoeff: 2.8,  cooldownSec: 6,  manaCost: 25,  targetType: 2, unlockLevel: 10 },
  { skillId: 'mw_recall',    classId: 'memory_weaver',  name: '기억 소환',       damageCoeff: 3.5,  cooldownSec: 15, manaCost: 45,  targetType: 2, unlockLevel: 20 },
  { skillId: 'mw_ult',       classId: 'memory_weaver',  name: '시간 역행',       damageCoeff: 5.0,  cooldownSec: 35, manaCost: 90,  targetType: 3, unlockLevel: 30 },

  // ── 그림자 직조사 ─────────────────────────────
  { skillId: 'sw_stab',      classId: 'shadow_weaver',  name: '그림자 찌르기',   damageCoeff: 2.2,  cooldownSec: 2,  manaCost: 10,  targetType: 1, unlockLevel: 1  },
  { skillId: 'sw_stealth',   classId: 'shadow_weaver',  name: '은신',           damageCoeff: 0,    cooldownSec: 15, manaCost: 20,  targetType: 1, unlockLevel: 8  },
  { skillId: 'sw_poison',    classId: 'shadow_weaver',  name: '독 칼날',         damageCoeff: 1.5,  cooldownSec: 5,  manaCost: 18,  targetType: 1, unlockLevel: 15 },
  { skillId: 'sw_ult',       classId: 'shadow_weaver',  name: '영혼 수확',       damageCoeff: 4.8,  cooldownSec: 30, manaCost: 75,  targetType: 2, unlockLevel: 30 },

  // ── 기억 파괴자 ───────────────────────────────
  { skillId: 'mb_crush',     classId: 'memory_breaker', name: '기억 분쇄',       damageCoeff: 2.4,  cooldownSec: 3,  manaCost: 15,  targetType: 1, unlockLevel: 1  },
  { skillId: 'mb_shatter',   classId: 'memory_breaker', name: '파편 폭발',       damageCoeff: 3.0,  cooldownSec: 8,  manaCost: 30,  targetType: 2, unlockLevel: 12 },
  { skillId: 'mb_drain',     classId: 'memory_breaker', name: '기억 흡수',       damageCoeff: 1.8,  cooldownSec: 10, manaCost: 22,  targetType: 1, unlockLevel: 20 },
  { skillId: 'mb_ult',       classId: 'memory_breaker', name: '망각의 파동',     damageCoeff: 5.2,  cooldownSec: 35, manaCost: 85,  targetType: 3, unlockLevel: 30 },

  // ── 시간 수호자 ───────────────────────────────
  { skillId: 'tg_smite',     classId: 'time_guardian',  name: '시간 타격',       damageCoeff: 1.6,  cooldownSec: 3,  manaCost: 12,  targetType: 1, unlockLevel: 1  },
  { skillId: 'tg_slow',      classId: 'time_guardian',  name: '시간 감속',       damageCoeff: 0.5,  cooldownSec: 10, manaCost: 20,  targetType: 2, unlockLevel: 10 },
  { skillId: 'tg_heal',      classId: 'time_guardian',  name: '시간 역류 치유',   damageCoeff: 0,    cooldownSec: 8,  manaCost: 35,  targetType: 2, unlockLevel: 18 },
  { skillId: 'tg_ult',       classId: 'time_guardian',  name: '시간 정지',       damageCoeff: 3.8,  cooldownSec: 40, manaCost: 100, targetType: 3, unlockLevel: 30 },

  // ── 공허 방랑자 ───────────────────────────────
  { skillId: 'vw_rift',      classId: 'void_wanderer',  name: '공허 균열',       damageCoeff: 2.0,  cooldownSec: 3,  manaCost: 14,  targetType: 1, unlockLevel: 1  },
  { skillId: 'vw_blink',     classId: 'void_wanderer',  name: '차원 도약',       damageCoeff: 1.2,  cooldownSec: 6,  manaCost: 18,  targetType: 1, unlockLevel: 8  },
  { skillId: 'vw_vortex',    classId: 'void_wanderer',  name: '공허 소용돌이',   damageCoeff: 3.2,  cooldownSec: 12, manaCost: 40,  targetType: 2, unlockLevel: 22 },
  { skillId: 'vw_ult',       classId: 'void_wanderer',  name: '차원 붕괴',       damageCoeff: 5.5,  cooldownSec: 35, manaCost: 90,  targetType: 3, unlockLevel: 30 },
];

// ─── DPS 시뮬레이션 유틸 ──────────────────────────────────────

export interface DpsSimResult {
  classId: ClassId;
  level: number;
  baseDps: number;
  burstDps: number;  // 쿨타임 무시 순간 DPS
  sustainDps: number; // 마나 제한 고려 지속 DPS
}

/**
 * 특정 클래스/레벨의 DPS 시뮬레이션
 * @param classId 클래스 식별자
 * @param level 캐릭터 레벨
 * @param baseAtk 기본 공격력
 */
export function simulateDps(classId: ClassId, level: number, baseAtk: number): DpsSimResult {
  const skills = SKILL_COEFFICIENTS.filter(
    s => s.classId === classId && s.unlockLevel <= level && s.damageCoeff > 0,
  );

  if (skills.length === 0) {
    return { classId, level, baseDps: baseAtk, burstDps: baseAtk, sustainDps: baseAtk };
  }

  // Burst DPS: 모든 스킬 동시 사용 가정 (10초 윈도우)
  const burstWindow = 10;
  let burstTotal = baseAtk * burstWindow; // 기본 공격
  for (const s of skills) {
    const casts = Math.floor(burstWindow / s.cooldownSec) + 1;
    burstTotal += s.damageCoeff * baseAtk * casts;
  }
  const burstDps = Math.round(burstTotal / burstWindow);

  // Sustain DPS: 마나 제한 (초당 마나 회복 = 2 + lv * 0.3)
  const manaRegen = 2 + level * 0.3;
  const totalManaPerSec = skills.reduce((sum, s) => sum + s.manaCost / s.cooldownSec, 0);
  const manaRatio = Math.min(1, manaRegen / totalManaPerSec);

  let sustainTotal = baseAtk * 60;
  for (const s of skills) {
    const castsPerMin = (60 / s.cooldownSec) * manaRatio;
    sustainTotal += s.damageCoeff * baseAtk * castsPerMin;
  }
  const sustainDps = Math.round(sustainTotal / 60);

  return { classId, level, baseDps: baseAtk, burstDps, sustainDps };
}

// ─── 밸런스 검증: 레벨 구간별 전투 시간 목표 ──────────────────────

/**
 * 일반 몬스터 처치 예상 시간 (초)
 * 목표: 10~15초 (저레벨), 15~25초 (중레벨), 20~35초 (고레벨)
 */
export function expectedKillTimeSec(playerLevel: number, playerAtk: number): number {
  const monster = generateMonsterStatCurves().find(m => m.level === playerLevel);
  if (!monster) return 0;
  const effectiveAtk = Math.max(1, playerAtk - monster.baseDef * 0.4);
  return Math.round(monster.baseHp / effectiveAtk);
}

// ─── 장비 등급별 스탯 곡선 (P28-02) ──────────────────────────────

export type EquipGrade = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface EquipStatCurve {
  grade: EquipGrade;
  /** ATK 배율 (레벨 기준 기본 ATK 대비) */
  atkMultiplier: number;
  /** DEF 배율 */
  defMultiplier: number;
  /** HP 보너스 비율 */
  hpBonusRatio: number;
  /** 세트 효과 여부 */
  hasSetBonus: boolean;
  /** 드롭 가중치 (높을수록 잘 나옴) */
  dropWeight: number;
}

export const EQUIP_STAT_CURVES: Record<EquipGrade, EquipStatCurve> = {
  common:    { grade: 'common',    atkMultiplier: 1.0, defMultiplier: 1.0, hpBonusRatio: 0,    hasSetBonus: false, dropWeight: 1000 },
  uncommon:  { grade: 'uncommon',  atkMultiplier: 1.3, defMultiplier: 1.2, hpBonusRatio: 0.02, hasSetBonus: false, dropWeight: 500 },
  rare:      { grade: 'rare',      atkMultiplier: 1.7, defMultiplier: 1.5, hpBonusRatio: 0.05, hasSetBonus: true,  dropWeight: 200 },
  epic:      { grade: 'epic',      atkMultiplier: 2.2, defMultiplier: 2.0, hpBonusRatio: 0.08, hasSetBonus: true,  dropWeight: 50 },
  legendary: { grade: 'legendary', atkMultiplier: 3.0, defMultiplier: 2.8, hpBonusRatio: 0.12, hasSetBonus: true,  dropWeight: 10 },
  mythic:    { grade: 'mythic',    atkMultiplier: 4.0, defMultiplier: 3.5, hpBonusRatio: 0.18, hasSetBonus: true,  dropWeight: 1 },
};

/**
 * 장비의 실제 스탯 계산
 * @param grade 장비 등급
 * @param itemLevel 아이템 레벨
 */
export function calculateEquipStats(grade: EquipGrade, itemLevel: number) {
  const curve = EQUIP_STAT_CURVES[grade];
  const baseAtk = 5 + itemLevel * 2;
  const baseDef = 3 + itemLevel * 1.5;
  const baseHp = 50 + itemLevel * 10;

  return {
    atk: Math.round(baseAtk * curve.atkMultiplier),
    def: Math.round(baseDef * curve.defMultiplier),
    hpBonus: Math.round(baseHp * curve.hpBonusRatio),
    grade,
    itemLevel,
  };
}

// ─── 드롭률 테이블 (P28-02) ──────────────────────────────────────

export interface DropRateEntry {
  monsterTier: 'normal' | 'elite' | 'boss' | 'raid_boss';
  /** 기본 드롭 확률 (0~1) */
  baseDropChance: number;
  /** 등급별 가중치 적용 후 최종 확률 계산 */
  gradeWeights: Record<EquipGrade, number>;
}

export const DROP_RATE_TABLE: DropRateEntry[] = [
  {
    monsterTier: 'normal',
    baseDropChance: 0.15,
    gradeWeights: { common: 70, uncommon: 25, rare: 4.5, epic: 0.45, legendary: 0.05, mythic: 0 },
  },
  {
    monsterTier: 'elite',
    baseDropChance: 0.35,
    gradeWeights: { common: 40, uncommon: 35, rare: 18, epic: 6, legendary: 0.9, mythic: 0.1 },
  },
  {
    monsterTier: 'boss',
    baseDropChance: 1.0,
    gradeWeights: { common: 10, uncommon: 25, rare: 35, epic: 22, legendary: 7, mythic: 1 },
  },
  {
    monsterTier: 'raid_boss',
    baseDropChance: 1.0,
    gradeWeights: { common: 0, uncommon: 5, rare: 25, epic: 40, legendary: 25, mythic: 5 },
  },
];

// ─── 강화 확률 밸런스 (P28-02) ────────────────────────────────────

export interface EnhancementBalance {
  level: number;       // +1 ~ +20
  goldCost: number;
  successRate: number; // 0~1
  destroyRate: number; // 0~1 (+10 이상)
  downgradeRate: number; // 실패 시 -1 확률 (+7 이상)
  protectionCostGold: number; // 파괴 보호 비용 (0이면 보호 불가)
}

export const ENHANCEMENT_BALANCE: EnhancementBalance[] = [
  { level: 1,  goldCost: 100,      successRate: 1.00, destroyRate: 0,    downgradeRate: 0,    protectionCostGold: 0 },
  { level: 2,  goldCost: 200,      successRate: 0.95, destroyRate: 0,    downgradeRate: 0,    protectionCostGold: 0 },
  { level: 3,  goldCost: 400,      successRate: 0.90, destroyRate: 0,    downgradeRate: 0,    protectionCostGold: 0 },
  { level: 4,  goldCost: 800,      successRate: 0.85, destroyRate: 0,    downgradeRate: 0,    protectionCostGold: 0 },
  { level: 5,  goldCost: 1500,     successRate: 0.80, destroyRate: 0,    downgradeRate: 0,    protectionCostGold: 0 },
  { level: 6,  goldCost: 3000,     successRate: 0.70, destroyRate: 0,    downgradeRate: 0,    protectionCostGold: 0 },
  { level: 7,  goldCost: 5000,     successRate: 0.60, destroyRate: 0,    downgradeRate: 0.10, protectionCostGold: 0 },
  { level: 8,  goldCost: 8000,     successRate: 0.50, destroyRate: 0,    downgradeRate: 0.15, protectionCostGold: 0 },
  { level: 9,  goldCost: 12000,    successRate: 0.40, destroyRate: 0,    downgradeRate: 0.20, protectionCostGold: 0 },
  { level: 10, goldCost: 20000,    successRate: 0.30, destroyRate: 0.02, downgradeRate: 0.25, protectionCostGold: 50000 },
  { level: 11, goldCost: 35000,    successRate: 0.25, destroyRate: 0.05, downgradeRate: 0.30, protectionCostGold: 80000 },
  { level: 12, goldCost: 50000,    successRate: 0.20, destroyRate: 0.08, downgradeRate: 0.35, protectionCostGold: 120000 },
  { level: 13, goldCost: 80000,    successRate: 0.15, destroyRate: 0.10, downgradeRate: 0.40, protectionCostGold: 200000 },
  { level: 14, goldCost: 120000,   successRate: 0.10, destroyRate: 0.15, downgradeRate: 0.45, protectionCostGold: 350000 },
  { level: 15, goldCost: 200000,   successRate: 0.05, destroyRate: 0.20, downgradeRate: 0.50, protectionCostGold: 600000 },
  { level: 16, goldCost: 350000,   successRate: 0.03, destroyRate: 0.25, downgradeRate: 0.50, protectionCostGold: 1000000 },
  { level: 17, goldCost: 500000,   successRate: 0.02, destroyRate: 0.30, downgradeRate: 0.50, protectionCostGold: 1500000 },
  { level: 18, goldCost: 800000,   successRate: 0.015,destroyRate: 0.35, downgradeRate: 0.50, protectionCostGold: 2500000 },
  { level: 19, goldCost: 1200000,  successRate: 0.01, destroyRate: 0.40, downgradeRate: 0.50, protectionCostGold: 4000000 },
  { level: 20, goldCost: 2000000,  successRate: 0.005,destroyRate: 0.50, downgradeRate: 0.50, protectionCostGold: 8000000 },
];

// ─── 밸런스 시뮬레이션 리포트 ─────────────────────────────────

export function generateBalanceReport(): string {
  const lines: string[] = ['=== P28 밸런스 시뮬레이션 리포트 ===', ''];

  // 몬스터 스탯 샘플
  const samples = [1, 10, 25, 50, 75, 100];
  const curves = generateMonsterStatCurves();
  lines.push('## 몬스터 스탯 곡선 (샘플)');
  lines.push('Lv  |  HP      |  ATK   |  DEF   |  EXP    |  Gold');
  lines.push('----|----------|--------|--------|---------|------');
  for (const lv of samples) {
    const m = curves[lv - 1];
    lines.push(
      `${String(lv).padStart(3)} | ${String(m.baseHp).padStart(8)} | ${String(m.baseAtk).padStart(6)} | ${String(m.baseDef).padStart(6)} | ${String(m.expReward).padStart(7)} | ${String(m.goldReward).padStart(5)}`,
    );
  }

  // DPS 시뮬레이션 (레벨 50 기준)
  lines.push('', '## DPS 시뮬레이션 (Lv.50, BaseATK=200)');
  const classIds: ClassId[] = ['ether_knight', 'memory_weaver', 'shadow_weaver', 'memory_breaker', 'time_guardian', 'void_wanderer'];
  for (const cid of classIds) {
    const sim = simulateDps(cid, 50, 200);
    lines.push(`  ${cid}: burst=${sim.burstDps}, sustain=${sim.sustainDps}`);
  }

  // 장비 스탯 샘플
  lines.push('', '## 장비 스탯 (Lv.50 아이템)');
  const grades: EquipGrade[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  for (const g of grades) {
    const stats = calculateEquipStats(g, 50);
    lines.push(`  ${g}: ATK=${stats.atk}, DEF=${stats.def}, HP+=${stats.hpBonus}`);
  }

  return lines.join('\n');
}
