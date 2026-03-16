/**
 * guildLevelManager.ts — 길드 레벨 & 경험치 관리 (P6-06)
 *
 * 경험치 획득 경로:
 *   - 멤버 던전 클리어 +50
 *   - 길드 퀘스트 완료  +100
 *   - 레이드 클리어     +200
 *   - 길드전 승리       +500
 *
 * 레벨 10단계: Lv.1(0)→Lv.2(1000)→...→Lv.10(100000)
 * 레벨업 혜택: 멤버 상한 증가, 스킬 슬롯 해금, 길드 창고 확장
 */
import { prisma } from '../db';

// ─── 경험치 테이블 ──────────────────────────────────────────
/** 각 레벨 도달에 필요한 누적 경험치 */
export const LEVEL_EXP_TABLE: readonly number[] = [
  0,       // Lv.1
  1000,    // Lv.2
  3000,    // Lv.3
  6000,    // Lv.4
  10000,   // Lv.5
  18000,   // Lv.6
  30000,   // Lv.7
  50000,   // Lv.8
  75000,   // Lv.9
  100000,  // Lv.10
] as const;

export const MAX_GUILD_LEVEL = 10;

// ─── 경험치 획득량 ──────────────────────────────────────────
export const XP_SOURCE = {
  DUNGEON_CLEAR: 50,
  GUILD_QUEST: 100,
  RAID_CLEAR: 200,
  WAR_WIN: 500,
} as const;

export type XpSource = keyof typeof XP_SOURCE;

// ─── 레벨별 혜택 ────────────────────────────────────────────
interface LevelBenefit {
  maxMembers: number;       // 길드 최대 인원
  skillSlots: number;       // 스킬 장착 슬롯
  storageTier: number;      // 길드 창고 티어 (확장)
}

const LEVEL_BENEFITS: readonly LevelBenefit[] = [
  { maxMembers: 30, skillSlots: 0, storageTier: 1 },  // Lv.1
  { maxMembers: 35, skillSlots: 1, storageTier: 1 },  // Lv.2
  { maxMembers: 40, skillSlots: 1, storageTier: 2 },  // Lv.3
  { maxMembers: 45, skillSlots: 2, storageTier: 2 },  // Lv.4
  { maxMembers: 50, skillSlots: 2, storageTier: 3 },  // Lv.5
  { maxMembers: 55, skillSlots: 3, storageTier: 3 },  // Lv.6
  { maxMembers: 60, skillSlots: 3, storageTier: 4 },  // Lv.7
  { maxMembers: 70, skillSlots: 4, storageTier: 4 },  // Lv.8
  { maxMembers: 80, skillSlots: 4, storageTier: 5 },  // Lv.9
  { maxMembers: 100, skillSlots: 5, storageTier: 5 }, // Lv.10
] as const;

/** 레벨에 대응하는 혜택 조회 */
export function getLevelBenefits(level: number): LevelBenefit {
  const idx = Math.max(0, Math.min(level - 1, LEVEL_BENEFITS.length - 1));
  return LEVEL_BENEFITS[idx];
}

// ─── 레벨 계산 ──────────────────────────────────────────────
/** 누적 경험치로부터 레벨 계산 */
export function calculateLevel(exp: number): number {
  for (let lv = LEVEL_EXP_TABLE.length - 1; lv >= 0; lv--) {
    if (exp >= LEVEL_EXP_TABLE[lv]) return lv + 1;
  }
  return 1;
}

/** 다음 레벨까지 남은 경험치 (만렙이면 0) */
export function expToNextLevel(exp: number): number {
  const level = calculateLevel(exp);
  if (level >= MAX_GUILD_LEVEL) return 0;
  return LEVEL_EXP_TABLE[level] - exp;
}

// ─── 길드 경험치 부여 ───────────────────────────────────────

export interface GuildXpResult {
  guildId: string;
  prevLevel: number;
  newLevel: number;
  prevExp: number;
  newExp: number;
  leveledUp: boolean;
  maxMembers: number;
}

/**
 * 길드에 경험치를 부여하고 레벨업 여부를 반환한다.
 *
 * @param guildId 길드 ID
 * @param source  경험치 획득 원인
 * @param multiplier 배율 (기본 1.0)
 */
export async function addGuildXp(
  guildId: string,
  source: XpSource,
  multiplier: number = 1.0,
): Promise<GuildXpResult> {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) throw new Error(`길드를 찾을 수 없습니다: ${guildId}`);

  const prevLevel = guild.level;
  const prevExp = guild.exp;

  // 만렙이면 경험치 추가 불필요
  if (prevLevel >= MAX_GUILD_LEVEL) {
    return {
      guildId,
      prevLevel,
      newLevel: prevLevel,
      prevExp,
      newExp: prevExp,
      leveledUp: false,
      maxMembers: guild.maxMembers,
    };
  }

  const xpGain = Math.round(XP_SOURCE[source] * multiplier);
  const newExp = prevExp + xpGain;
  const newLevel = calculateLevel(newExp);
  const leveledUp = newLevel > prevLevel;

  // 레벨업 시 혜택 반영
  const benefits = getLevelBenefits(newLevel);

  await prisma.guild.update({
    where: { id: guildId },
    data: {
      exp: newExp,
      level: newLevel,
      maxMembers: benefits.maxMembers,
    },
  });

  return {
    guildId,
    prevLevel,
    newLevel,
    prevExp,
    newExp,
    leveledUp,
    maxMembers: benefits.maxMembers,
  };
}

/**
 * 길드 레벨 정보 조회
 */
export async function getGuildLevelInfo(guildId: string) {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) throw new Error(`길드를 찾을 수 없습니다: ${guildId}`);

  const benefits = getLevelBenefits(guild.level);
  return {
    guildId,
    level: guild.level,
    exp: guild.exp,
    expToNext: expToNextLevel(guild.exp),
    maxLevel: MAX_GUILD_LEVEL,
    benefits,
  };
}
