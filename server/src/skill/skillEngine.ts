// ─── 스킬 트리 엔진 (P5-02) ────────────────────────────────────
// 스킬 포인트, 해금, 레벨업, 장착/해제, 리셋, 데미지 계산

import { prisma } from '../db';

// ─── 상수 ──────────────────────────────────────────────────────
const MAX_EQUIP_SLOTS = 6;                         // 장착 슬롯 최대 수
const SKILL_POINT_PER_LEVEL = 1;                   // 레벨업 당 스킬 포인트
const ADVANCEMENT_BONUS_POINTS = 3;                // 전직 시 보너스 포인트
const ADVANCEMENT_LEVELS = [30, 50, 80];           // 전직 레벨
const RESET_BASE_COST = 1000;                      // 리셋 기본 골드 비용
const RESET_COST_PER_LEVEL = 200;                  // 캐릭터 레벨 당 추가 비용

// ─── 타입 ──────────────────────────────────────────────────────
interface LevelScalingEntry {
  level: number;
  damageBonus: number;
  cooldownReduction: number;
  mpCostReduction: number;
}

interface SkillEffect {
  type: string;
  duration: number;
  value: number;
}

interface CalculatedDamage {
  baseDamage: number;
  scaledDamage: number;
  levelBonus: number;
  totalDamage: number;
}

// ─── 스킬 포인트 계산 ──────────────────────────────────────────

/** 특정 레벨에서 누적 획득 가능한 총 스킬 포인트 */
export function getTotalSkillPoints(characterLevel: number): number {
  // 레벨 1부터 포인트 지급 (레벨 1 = 0포인트, 레벨 2부터 1씩)
  let points = Math.max(0, characterLevel - 1) * SKILL_POINT_PER_LEVEL;

  // 전직 보너스
  for (const advLevel of ADVANCEMENT_LEVELS) {
    if (characterLevel >= advLevel) {
      points += ADVANCEMENT_BONUS_POINTS;
    }
  }

  return points;
}

/** 유저가 사용한 스킬 포인트 합산 */
async function getUsedSkillPoints(userId: string): Promise<number> {
  const playerSkills = await prisma.playerSkill.findMany({
    where: { userId },
    select: { level: true },
  });
  // 각 스킬의 (레벨 - 1)이 투자한 포인트 (해금 시 1포인트, 이후 레벨업마다 1포인트)
  // 해금 = 1포인트, 레벨업 = 포인트당 1레벨 → 총 = level 포인트
  return playerSkills.reduce((sum, ps) => sum + ps.level, 0);
}

/** 잔여 스킬 포인트 조회 */
export async function getRemainingSkillPoints(userId: string, characterLevel: number): Promise<number> {
  const total = getTotalSkillPoints(characterLevel);
  const used = await getUsedSkillPoints(userId);
  return total - used;
}

// ─── 스킬 해금 ─────────────────────────────────────────────────

export async function unlockSkill(
  userId: string,
  skillCode: string,
  characterLevel: number,
  characterClass: string,
): Promise<{ success: boolean; error?: string }> {
  // 1. 스킬 존재 확인
  const skill = await prisma.skill.findUnique({ where: { code: skillCode } });
  if (!skill) return { success: false, error: '존재하지 않는 스킬' };

  // 2. 클래스 일치 확인
  if (skill.class !== characterClass) {
    return { success: false, error: '해당 클래스의 스킬이 아님' };
  }

  // 3. 레벨 요구사항 확인
  if (characterLevel < skill.requiredLevel) {
    return { success: false, error: `레벨 ${skill.requiredLevel} 필요 (현재 ${characterLevel})` };
  }

  // 4. 이미 해금 여부
  const existing = await prisma.playerSkill.findUnique({
    where: { userId_skillId: { userId, skillId: skill.id } },
  });
  if (existing) return { success: false, error: '이미 해금된 스킬' };

  // 5. 선행 스킬 확인
  const prereqs = skill.prerequisites as string[];
  if (prereqs.length > 0) {
    const prereqSkills = await prisma.skill.findMany({
      where: { code: { in: prereqs } },
      select: { id: true },
    });
    const prereqIds = prereqSkills.map((s) => s.id);
    const unlockedPrereqs = await prisma.playerSkill.findMany({
      where: { userId, skillId: { in: prereqIds } },
    });
    if (unlockedPrereqs.length < prereqs.length) {
      return { success: false, error: '선행 스킬 미해금' };
    }
  }

  // 6. 스킬 포인트 확인 (해금 = 1포인트)
  const remaining = await getRemainingSkillPoints(userId, characterLevel);
  if (remaining < 1) {
    return { success: false, error: '스킬 포인트 부족' };
  }

  // 7. 해금
  await prisma.playerSkill.create({
    data: { userId, skillId: skill.id, level: 1 },
  });

  return { success: true };
}

// ─── 스킬 레벨업 ───────────────────────────────────────────────

export async function levelUpSkill(
  userId: string,
  skillCode: string,
  characterLevel: number,
): Promise<{ success: boolean; newLevel?: number; error?: string }> {
  const skill = await prisma.skill.findUnique({ where: { code: skillCode } });
  if (!skill) return { success: false, error: '존재하지 않는 스킬' };

  const playerSkill = await prisma.playerSkill.findUnique({
    where: { userId_skillId: { userId, skillId: skill.id } },
  });
  if (!playerSkill) return { success: false, error: '미해금 스킬' };

  if (playerSkill.level >= skill.maxLevel) {
    return { success: false, error: `이미 최대 레벨 (${skill.maxLevel})` };
  }

  // 포인트 확인
  const remaining = await getRemainingSkillPoints(userId, characterLevel);
  if (remaining < 1) {
    return { success: false, error: '스킬 포인트 부족' };
  }

  const updated = await prisma.playerSkill.update({
    where: { id: playerSkill.id },
    data: { level: playerSkill.level + 1 },
  });

  return { success: true, newLevel: updated.level };
}

// ─── 스킬 장착/해제 ────────────────────────────────────────────

export async function equipSkill(
  userId: string,
  skillCode: string,
  slotIndex: number,
): Promise<{ success: boolean; error?: string }> {
  if (slotIndex < 0 || slotIndex >= MAX_EQUIP_SLOTS) {
    return { success: false, error: `슬롯 범위 초과 (0~${MAX_EQUIP_SLOTS - 1})` };
  }

  const skill = await prisma.skill.findUnique({ where: { code: skillCode } });
  if (!skill) return { success: false, error: '존재하지 않는 스킬' };

  const playerSkill = await prisma.playerSkill.findUnique({
    where: { userId_skillId: { userId, skillId: skill.id } },
  });
  if (!playerSkill) return { success: false, error: '미해금 스킬' };

  // 해당 슬롯에 기존 스킬이 있으면 해제
  await prisma.playerSkill.updateMany({
    where: { userId, slotIndex, isEquipped: true },
    data: { isEquipped: false, slotIndex: null },
  });

  // 이미 다른 슬롯에 장착된 경우 해제
  if (playerSkill.isEquipped) {
    await prisma.playerSkill.update({
      where: { id: playerSkill.id },
      data: { isEquipped: false, slotIndex: null },
    });
  }

  // 장착
  await prisma.playerSkill.update({
    where: { id: playerSkill.id },
    data: { isEquipped: true, slotIndex },
  });

  return { success: true };
}

export async function unequipSkill(
  userId: string,
  skillCode: string,
): Promise<{ success: boolean; error?: string }> {
  const skill = await prisma.skill.findUnique({ where: { code: skillCode } });
  if (!skill) return { success: false, error: '존재하지 않는 스킬' };

  const playerSkill = await prisma.playerSkill.findUnique({
    where: { userId_skillId: { userId, skillId: skill.id } },
  });
  if (!playerSkill) return { success: false, error: '미해금 스킬' };

  if (!playerSkill.isEquipped) {
    return { success: false, error: '장착되지 않은 스킬' };
  }

  await prisma.playerSkill.update({
    where: { id: playerSkill.id },
    data: { isEquipped: false, slotIndex: null },
  });

  return { success: true };
}

// ─── 스킬 리셋 ─────────────────────────────────────────────────

export async function resetSkills(
  userId: string,
  characterLevel: number,
  currentGold: number,
): Promise<{ success: boolean; cost?: number; error?: string }> {
  const cost = RESET_BASE_COST + characterLevel * RESET_COST_PER_LEVEL;
  if (currentGold < cost) {
    return { success: false, error: `골드 부족 (필요: ${cost}, 보유: ${currentGold})` };
  }

  // 모든 플레이어 스킬 삭제
  await prisma.playerSkill.deleteMany({ where: { userId } });

  // 골드 차감 (User 테이블 업데이트)
  await prisma.user.update({
    where: { id: userId },
    data: { gold: { decrement: cost } },
  });

  return { success: true, cost };
}

// ─── 데미지 계산 ────────────────────────────────────────────────

/**
 * 스킬 데미지 계산
 * 공식: (baseStat × damageScale) × (1 + levelBonus)
 * baseStat = ATK (물리) 또는 INT (마법) — 호출 시 결정
 */
export function calculateSkillDamage(
  baseStat: number,
  skill: {
    damage: number;
    damageScale: number;
    levelScaling: unknown;
  },
  skillLevel: number,
): CalculatedDamage {
  const scaling = skill.levelScaling as LevelScalingEntry[];
  const entry = scaling.find((s) => s.level === skillLevel);
  const levelBonus = entry?.damageBonus ?? 0;

  const baseDamage = skill.damage;
  const scaledDamage = Math.floor(baseStat * skill.damageScale);
  const totalBeforeBonus = baseDamage + scaledDamage;
  const totalDamage = Math.floor(totalBeforeBonus * (1 + levelBonus / 100));

  return { baseDamage, scaledDamage, levelBonus, totalDamage };
}

// ─── 스킬 트리 조회 ────────────────────────────────────────────

/** 클래스별 스킬 트리 (tier 순 정렬) */
export async function getSkillTree(className: string) {
  return prisma.skill.findMany({
    where: { class: className },
    orderBy: [{ tier: 'asc' }, { requiredLevel: 'asc' }],
  });
}

/** 유저 보유 스킬 목록 (스킬 상세 포함) */
export async function getUserSkills(userId: string) {
  const playerSkills = await prisma.playerSkill.findMany({
    where: { userId },
  });

  if (playerSkills.length === 0) return [];

  const skillIds = playerSkills.map((ps) => ps.skillId);
  const skills = await prisma.skill.findMany({
    where: { id: { in: skillIds } },
  });

  const skillMap = new Map(skills.map((s) => [s.id, s]));

  return playerSkills.map((ps) => ({
    ...ps,
    skill: skillMap.get(ps.skillId) ?? null,
  }));
}

// ─── 쿨다운/MP 스케일링 유틸 ────────────────────────────────────

/** 레벨별 쿨다운 감소 적용 */
export function getEffectiveCooldown(
  baseCooldown: number,
  levelScaling: unknown,
  skillLevel: number,
): number {
  const scaling = levelScaling as LevelScalingEntry[];
  const entry = scaling.find((s) => s.level === skillLevel);
  const reduction = entry?.cooldownReduction ?? 0;
  return Math.max(0, baseCooldown * (1 - reduction / 100));
}

/** 레벨별 MP 비용 감소 적용 */
export function getEffectiveMpCost(
  baseMpCost: number,
  levelScaling: unknown,
  skillLevel: number,
): number {
  const scaling = levelScaling as LevelScalingEntry[];
  const entry = scaling.find((s) => s.level === skillLevel);
  const reduction = entry?.mpCostReduction ?? 0;
  return Math.max(0, Math.floor(baseMpCost * (1 - reduction / 100)));
}

// ─── Export 상수 (테스트/외부 참조용) ───────────────────────────
export const SKILL_CONSTANTS = {
  MAX_EQUIP_SLOTS,
  SKILL_POINT_PER_LEVEL,
  ADVANCEMENT_BONUS_POINTS,
  ADVANCEMENT_LEVELS,
  RESET_BASE_COST,
  RESET_COST_PER_LEVEL,
} as const;

// 미사용 방지용 타입 내보내기
export type { LevelScalingEntry, SkillEffect, CalculatedDamage };
