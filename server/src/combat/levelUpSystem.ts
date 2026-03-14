// ─── 레벨업 + 스탯 분배 시스템 (P24-10/11) ────────────────────
// 경험치 테이블, 클래스별 성장률, 전직 연동

import { prisma } from '../db';
import { getRequiredExp } from './rewardEngine';

// ─── 클래스 ID ─────────────────────────────────────────────────

export type BaseClassId =
  | 'ether_knight'
  | 'memory_weaver'
  | 'shadow_weaver'
  | 'memory_breaker'
  | 'time_guardian'
  | 'void_wanderer';

// ─── 스탯 구조 ─────────────────────────────────────────────────

export interface CharacterStats {
  hp: number;
  mp: number;
  atk: number;
  def: number;
  matk: number;
  mdef: number;
  spd: number;
  crit: number;
}

// ─── 클래스별 자동 성장률 (레벨당 증가) ────────────────────────

const CLASS_GROWTH_RATES: Record<string, CharacterStats> = {
  ether_knight:    { hp: 25, mp: 5,  atk: 4, def: 4, matk: 1, mdef: 2, spd: 2, crit: 0.2 },
  memory_weaver:   { hp: 12, mp: 15, atk: 1, def: 2, matk: 5, mdef: 4, spd: 2, crit: 0.3 },
  shadow_weaver:   { hp: 15, mp: 10, atk: 3, def: 2, matk: 3, mdef: 2, spd: 4, crit: 0.5 },
  memory_breaker:  { hp: 20, mp: 8,  atk: 5, def: 3, matk: 2, mdef: 2, spd: 3, crit: 0.4 },
  time_guardian:   { hp: 22, mp: 12, atk: 2, def: 5, matk: 3, mdef: 5, spd: 1, crit: 0.1 },
  void_wanderer:   { hp: 14, mp: 12, atk: 3, def: 2, matk: 4, mdef: 3, spd: 3, crit: 0.3 },
  // 전직 클래스 (베이스와 동일 성장률 사용)
  guardian:            { hp: 28, mp: 5,  atk: 4, def: 5, matk: 1, mdef: 3, spd: 2, crit: 0.2 },
  destroyer:           { hp: 22, mp: 5,  atk: 6, def: 3, matk: 1, mdef: 2, spd: 3, crit: 0.3 },
  ether_berserker:     { hp: 25, mp: 5,  atk: 5, def: 4, matk: 1, mdef: 2, spd: 3, crit: 0.4 },
  time_tuner:          { hp: 14, mp: 18, atk: 1, def: 2, matk: 6, mdef: 5, spd: 2, crit: 0.3 },
  memory_lord:         { hp: 12, mp: 20, atk: 1, def: 2, matk: 7, mdef: 4, spd: 2, crit: 0.3 },
  memory_weaver_adv:   { hp: 13, mp: 17, atk: 1, def: 2, matk: 6, mdef: 5, spd: 2, crit: 0.3 },
  illusionist:         { hp: 16, mp: 12, atk: 3, def: 2, matk: 4, mdef: 2, spd: 5, crit: 0.6 },
  soul_reaper:         { hp: 15, mp: 10, atk: 4, def: 2, matk: 3, mdef: 2, spd: 4, crit: 0.7 },
  void_lord:           { hp: 18, mp: 10, atk: 3, def: 3, matk: 3, mdef: 3, spd: 3, crit: 0.5 },
};

// ─── 상수 ──────────────────────────────────────────────────────

/** 레벨당 자유 스탯 포인트 */
const FREE_STAT_POINTS_PER_LEVEL = 3;
/** 최대 레벨 */
const MAX_LEVEL = 100;
/** 전직 요구 레벨 */
const ADVANCEMENT_LEVELS = [30, 60, 80];

// ─── 레벨업 결과 ───────────────────────────────────────────────

export interface LevelUpResult {
  leveled: boolean;
  newLevel: number;
  /** 이번 레벨업으로 얻은 자유 스탯 포인트 */
  freeStatPoints: number;
  /** 자동 증가된 스탯 */
  statIncrease: CharacterStats;
  /** 남은 경험치 (오버플로우) */
  remainingExp: number;
  /** 전직 가능 여부 */
  advancementAvailable: boolean;
  /** 해금된 스킬 ID 목록 */
  unlockedSkills: string[];
}

// ─── 레벨업 검사 + 적용 ────────────────────────────────────────

/**
 * 경험치 추가 후 레벨업 판정
 * (다중 레벨업 지원)
 */
export function checkLevelUp(
  currentLevel: number,
  currentExp: number,
  addedExp: number,
  classId: string,
): LevelUpResult {
  let level = currentLevel;
  let exp = currentExp + addedExp;
  let totalFreePoints = 0;
  const totalStatIncrease: CharacterStats = {
    hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0, crit: 0,
  };

  while (level < MAX_LEVEL) {
    const required = getRequiredExp(level);
    if (exp < required) break;

    exp -= required;
    level++;
    totalFreePoints += FREE_STAT_POINTS_PER_LEVEL;

    const growth = CLASS_GROWTH_RATES[classId] ?? CLASS_GROWTH_RATES['ether_knight'];
    totalStatIncrease.hp += growth.hp;
    totalStatIncrease.mp += growth.mp;
    totalStatIncrease.atk += growth.atk;
    totalStatIncrease.def += growth.def;
    totalStatIncrease.matk += growth.matk;
    totalStatIncrease.mdef += growth.mdef;
    totalStatIncrease.spd += growth.spd;
    totalStatIncrease.crit += growth.crit;
  }

  const leveled = level > currentLevel;
  const advancementAvailable = ADVANCEMENT_LEVELS.includes(level);

  return {
    leveled,
    newLevel: level,
    freeStatPoints: totalFreePoints,
    statIncrease: totalStatIncrease,
    remainingExp: exp,
    advancementAvailable,
    unlockedSkills: [], // 스킬 해금은 DB 조회 필요 → applyLevelUp에서 처리
  };
}

// ─── DB 적용 ───────────────────────────────────────────────────

/**
 * 레벨업 결과를 DB에 반영
 */
export async function applyLevelUp(
  characterId: string,
  result: LevelUpResult,
): Promise<void> {
  if (!result.leveled) return;

  await prisma.character.update({
    where: { id: characterId },
    data: {
      level: result.newLevel,
      // 경험치: 남은 경험치로 갱신
      // 스탯: 자동 증가분 반영 (기존 + 증가)
      // 자유 포인트: 기존 + 추가
    },
  });
}

// ─── 자유 스탯 분배 ────────────────────────────────────────────

export type StatKey = 'hp' | 'mp' | 'atk' | 'def' | 'matk' | 'mdef' | 'spd' | 'crit';

export interface StatAllocation {
  stat: StatKey;
  points: number;
}

/**
 * 자유 스탯 포인트 분배
 * @returns 분배 성공 여부
 */
export function validateStatAllocation(
  allocations: StatAllocation[],
  availablePoints: number,
): { valid: boolean; error?: string } {
  const totalPoints = allocations.reduce((sum, a) => sum + a.points, 0);

  if (totalPoints > availablePoints) {
    return { valid: false, error: `사용 가능한 포인트(${availablePoints})를 초과했습니다.` };
  }

  if (allocations.some(a => a.points < 0)) {
    return { valid: false, error: '음수 포인트는 할당할 수 없습니다.' };
  }

  const validStats: StatKey[] = ['hp', 'mp', 'atk', 'def', 'matk', 'mdef', 'spd', 'crit'];
  if (allocations.some(a => !validStats.includes(a.stat))) {
    return { valid: false, error: '유효하지 않은 스탯입니다.' };
  }

  return { valid: true };
}

// ─── 전직 검증 ─────────────────────────────────────────────────

export interface AdvancementCheck {
  eligible: boolean;
  requiredLevel: number;
  currentLevel: number;
  availableClasses: string[];
}

/**
 * 전직 가능 여부 확인
 */
export function checkAdvancementEligibility(
  currentLevel: number,
  currentClassId: string,
): AdvancementCheck {
  // 전직 단계 결정
  let requiredLevel = 0;
  for (const lvl of ADVANCEMENT_LEVELS) {
    if (currentLevel >= lvl) requiredLevel = lvl;
  }

  if (requiredLevel === 0) {
    return {
      eligible: false,
      requiredLevel: ADVANCEMENT_LEVELS[0],
      currentLevel,
      availableClasses: [],
    };
  }

  // 클래스별 전직 경로
  const advancementPaths: Record<string, Record<number, string[]>> = {
    ether_knight:   { 30: ['guardian', 'destroyer'], 60: ['ether_berserker'], 80: [] },
    memory_weaver:  { 30: ['time_tuner', 'memory_lord'], 60: ['memory_weaver_adv'], 80: [] },
    shadow_weaver:  { 30: ['illusionist', 'soul_reaper'], 60: ['void_lord'], 80: [] },
    memory_breaker: { 30: ['guardian', 'destroyer'], 60: [], 80: [] },
    time_guardian:   { 30: ['time_tuner', 'guardian'], 60: [], 80: [] },
    void_wanderer:  { 30: ['illusionist', 'void_lord'], 60: [], 80: [] },
  };

  const paths = advancementPaths[currentClassId] ?? {};
  const availableClasses = paths[requiredLevel] ?? [];

  return {
    eligible: availableClasses.length > 0,
    requiredLevel,
    currentLevel,
    availableClasses,
  };
}
