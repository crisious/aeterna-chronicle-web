/**
 * guildSkills.ts — 길드 스킬 시스템 (P6-06)
 *
 * 5종 길드 스킬:
 *   guild_exp_boost   — 멤버 전투 경험치 +5%/레벨  (해금 Lv.2)
 *   guild_gold_boost  — 멤버 골드 획득 +3%/레벨    (해금 Lv.3)
 *   guild_craft_boost — 제작 성공률 +2%/레벨       (해금 Lv.5)
 *   guild_hp_boost    — 멤버 최대 HP +2%/레벨      (해금 Lv.7)
 *   guild_drop_boost  — 아이템 드롭률 +1%/레벨     (해금 Lv.9)
 *
 * 스킬 레벨업 비용: 길드 골드 소모 (레벨별 증가)
 *
 * NOTE: prisma generate 실행 전까지 GuildSkill 모델이 Prisma 타입에
 *       반영되지 않으므로 일부 as any 캐스팅이 존재한다.
 *       마이그레이션 + prisma generate 후 제거 가능.
 */
import { prisma } from '../db';

// ─── 스킬 정의 ──────────────────────────────────────────────

export interface GuildSkillDef {
  code: string;
  name: string;
  description: string;
  effectPerLevel: number;   // 레벨당 효과 (%)
  unlockGuildLevel: number; // 해금에 필요한 길드 레벨
  maxLevel: number;         // 스킬 최대 레벨
}

export const GUILD_SKILL_DEFS: readonly GuildSkillDef[] = [
  {
    code: 'guild_exp_boost',
    name: '경험치 부스터',
    description: '길드원 전투 경험치 +5%/레벨',
    effectPerLevel: 5,
    unlockGuildLevel: 2,
    maxLevel: 5,
  },
  {
    code: 'guild_gold_boost',
    name: '골드 부스터',
    description: '길드원 골드 획득 +3%/레벨',
    effectPerLevel: 3,
    unlockGuildLevel: 3,
    maxLevel: 5,
  },
  {
    code: 'guild_craft_boost',
    name: '제작 부스터',
    description: '제작 성공률 +2%/레벨',
    effectPerLevel: 2,
    unlockGuildLevel: 5,
    maxLevel: 5,
  },
  {
    code: 'guild_hp_boost',
    name: '생명력 증가',
    description: '길드원 최대 HP +2%/레벨',
    effectPerLevel: 2,
    unlockGuildLevel: 7,
    maxLevel: 5,
  },
  {
    code: 'guild_drop_boost',
    name: '드롭률 증가',
    description: '아이템 드롭률 +1%/레벨',
    effectPerLevel: 1,
    unlockGuildLevel: 9,
    maxLevel: 5,
  },
] as const;

/** 스킬 코드 → 정의 맵 */
const SKILL_MAP = new Map<string, GuildSkillDef>(
  GUILD_SKILL_DEFS.map((s) => [s.code, s]),
);

/** 스킬 레벨업 비용 (길드 골드) */
export function getUpgradeCost(currentLevel: number): number {
  // Lv.1→2: 500, Lv.2→3: 1000, Lv.3→4: 2000, Lv.4→5: 4000
  return 500 * Math.pow(2, currentLevel - 1);
}

// ─── Prisma 동적 접근 헬퍼 (prisma generate 전 호환) ────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const guildSkillModel = (prisma as any).guildSkill as {
  findMany: (args: Record<string, unknown>) => Promise<GuildSkillRecord[]>;
  findUnique: (args: Record<string, unknown>) => Promise<GuildSkillRecord | null>;
  createMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
  update: (args: Record<string, unknown>) => Promise<GuildSkillRecord>;
};

interface GuildSkillRecord {
  id: string;
  guildId: string;
  skillCode: string;
  level: number;
  unlockedAt: Date;
}

// ─── 스킬 해금 ──────────────────────────────────────────────

export interface UnlockResult {
  success: boolean;
  error?: string;
  skillCode?: string;
  level?: number;
}

/**
 * 길드 스킬 해금 (자동: 길드 레벨이 해금 조건 충족 시)
 * 이미 해금된 스킬은 무시한다.
 */
export async function unlockAvailableSkills(guildId: string): Promise<string[]> {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) return [];

  const existing = await guildSkillModel.findMany({ where: { guildId } });
  const existingCodes = new Set(existing.map((s: GuildSkillRecord) => s.skillCode));

  const toUnlock = GUILD_SKILL_DEFS.filter(
    (def) => guild.level >= def.unlockGuildLevel && !existingCodes.has(def.code),
  );

  if (toUnlock.length === 0) return [];

  await guildSkillModel.createMany({
    data: toUnlock.map((def) => ({
      guildId,
      skillCode: def.code,
      level: 1,
    })),
    skipDuplicates: true,
  });

  return toUnlock.map((d) => d.code);
}

// ─── 스킬 레벨업 ────────────────────────────────────────────

export interface UpgradeResult {
  success: boolean;
  error?: string;
  skillCode: string;
  prevLevel: number;
  newLevel: number;
  cost: number;
}

/**
 * 길드 스킬 레벨업
 * (비용 차감은 호출부에서 길드 골드 잔액을 확인 후 처리)
 */
export async function upgradeGuildSkill(
  guildId: string,
  skillCode: string,
): Promise<UpgradeResult> {
  const def = SKILL_MAP.get(skillCode);
  if (!def) {
    return { success: false, error: '존재하지 않는 스킬 코드', skillCode, prevLevel: 0, newLevel: 0, cost: 0 };
  }

  const skill = await guildSkillModel.findUnique({
    where: { guildId_skillCode: { guildId, skillCode } },
  });
  if (!skill) {
    return { success: false, error: '해금되지 않은 스킬', skillCode, prevLevel: 0, newLevel: 0, cost: 0 };
  }

  if (skill.level >= def.maxLevel) {
    return { success: false, error: '이미 최대 레벨', skillCode, prevLevel: skill.level, newLevel: skill.level, cost: 0 };
  }

  const cost = getUpgradeCost(skill.level);

  // TODO: 길드 골드 차감 로직 연동 (currencyManager)

  await guildSkillModel.update({
    where: { guildId_skillCode: { guildId, skillCode } },
    data: { level: skill.level + 1 },
  });

  return {
    success: true,
    skillCode,
    prevLevel: skill.level,
    newLevel: skill.level + 1,
    cost,
  };
}

// ─── 스킬 효과 조회 ─────────────────────────────────────────

export interface GuildSkillEffect {
  code: string;
  name: string;
  level: number;
  effectPercent: number; // 현재 효과 (%)
}

/**
 * 길드의 활성 스킬 효과 목록 반환
 */
export async function getActiveSkillEffects(guildId: string): Promise<GuildSkillEffect[]> {
  const skills: GuildSkillRecord[] = await guildSkillModel.findMany({ where: { guildId } });

  return skills
    .map((skill: GuildSkillRecord) => {
      const def = SKILL_MAP.get(skill.skillCode);
      if (!def) return null;
      return {
        code: skill.skillCode,
        name: def.name,
        level: skill.level,
        effectPercent: def.effectPerLevel * skill.level,
      };
    })
    .filter((s): s is GuildSkillEffect => s !== null);
}

/**
 * 특정 스킬의 효과 배율(multiplier)을 반환한다. (1.0 = 기본)
 */
export async function getSkillMultiplier(guildId: string, skillCode: string): Promise<number> {
  const skill = await guildSkillModel.findUnique({
    where: { guildId_skillCode: { guildId, skillCode } },
  });
  if (!skill) return 1.0;

  const def = SKILL_MAP.get(skillCode);
  if (!def) return 1.0;

  return 1.0 + (def.effectPerLevel * skill.level) / 100;
}

/**
 * 길드 전체 스킬 목록 (해금 상태 포함) 조회
 */
export async function getGuildSkillsInfo(guildId: string) {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) throw new Error(`길드를 찾을 수 없습니다: ${guildId}`);

  const skills: GuildSkillRecord[] = await guildSkillModel.findMany({ where: { guildId } });
  const unlockedMap = new Map(skills.map((s: GuildSkillRecord) => [s.skillCode, s]));

  return GUILD_SKILL_DEFS.map((def) => {
    const skill = unlockedMap.get(def.code);
    return {
      code: def.code,
      name: def.name,
      description: def.description,
      unlockGuildLevel: def.unlockGuildLevel,
      maxLevel: def.maxLevel,
      effectPerLevel: def.effectPerLevel,
      unlocked: !!skill,
      currentLevel: skill?.level ?? 0,
      currentEffect: skill ? def.effectPerLevel * skill.level : 0,
      upgradeCost: skill && skill.level < def.maxLevel ? getUpgradeCost(skill.level) : null,
    };
  });
}
