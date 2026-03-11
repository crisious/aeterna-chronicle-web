/**
 * 유닛 테스트 — skillEngine (10 tests)
 * 스킬 포인트, 해금, 레벨업, 장착/해제, 리셋, 데미지 계산
 */
import { describe, test, expect } from 'vitest';

// ── 로직 재현 ───────────────────────────────────────────────

const MAX_EQUIP_SLOTS = 6;
const SKILL_POINT_PER_LEVEL = 1;
const ADVANCEMENT_BONUS_POINTS = 3;
const ADVANCEMENT_LEVELS = [30, 50, 80];
const RESET_BASE_COST = 1000;
const RESET_COST_PER_LEVEL = 200;

function getTotalSkillPoints(characterLevel: number): number {
  let points = Math.max(0, characterLevel - 1) * SKILL_POINT_PER_LEVEL;
  for (const advLevel of ADVANCEMENT_LEVELS) {
    if (characterLevel >= advLevel) points += ADVANCEMENT_BONUS_POINTS;
  }
  return points;
}

function getUsedSkillPoints(skills: { level: number }[]): number {
  return skills.reduce((sum, s) => sum + s.level, 0);
}

function getAvailablePoints(characterLevel: number, skills: { level: number }[]): number {
  return getTotalSkillPoints(characterLevel) - getUsedSkillPoints(skills);
}

function canUnlockSkill(characterLevel: number, skillRequiredLevel: number, prerequisitesMet: boolean): boolean {
  return characterLevel >= skillRequiredLevel && prerequisitesMet;
}

function getResetCost(characterLevel: number): number {
  return RESET_BASE_COST + RESET_COST_PER_LEVEL * characterLevel;
}

function calculateDamage(baseDamage: number, skillLevel: number, scalingPct: number, statValue: number): number {
  const levelBonus = baseDamage * (skillLevel - 1) * 0.1;
  const statScaling = statValue * (scalingPct / 100);
  return Math.floor(baseDamage + levelBonus + statScaling);
}

function canEquip(equippedCount: number): boolean {
  return equippedCount < MAX_EQUIP_SLOTS;
}

// ── 테스트 ──────────────────────────────────────────────────

describe('skillEngine', () => {
  // 1. 레벨 1 → 0 포인트
  test('1. 레벨 1은 스킬 포인트 0', () => {
    expect(getTotalSkillPoints(1)).toBe(0);
  });

  // 2. 레벨 10 → 9 포인트
  test('2. 레벨 10 = 9 포인트', () => {
    expect(getTotalSkillPoints(10)).toBe(9);
  });

  // 3. 전직 보너스 — 레벨 30 도달 시
  test('3. 레벨 30 = 29 + 3(전직보너스) = 32', () => {
    expect(getTotalSkillPoints(30)).toBe(32);
  });

  // 4. 레벨 80 — 전직 보너스 3회
  test('4. 레벨 80 = 79 + 9 = 88', () => {
    expect(getTotalSkillPoints(80)).toBe(88);
  });

  // 5. 사용 가능 포인트 계산
  test('5. 사용 가능 포인트 = 총 포인트 - 사용 포인트', () => {
    const skills = [{ level: 3 }, { level: 2 }, { level: 1 }]; // 사용 6
    expect(getAvailablePoints(10, skills)).toBe(3); // 9 - 6
  });

  // 6. 스킬 해금 조건 — 충족
  test('6. 스킬 해금 — 레벨 + 선행 충족 시 true', () => {
    expect(canUnlockSkill(10, 5, true)).toBe(true);
  });

  // 7. 스킬 해금 불가 — 레벨 부족
  test('7. 스킬 해금 불가 — 레벨 부족', () => {
    expect(canUnlockSkill(3, 10, true)).toBe(false);
  });

  // 8. 리셋 비용 계산
  test('8. 리셋 비용 — 레벨 50 = 1000 + 200*50 = 11000', () => {
    expect(getResetCost(50)).toBe(11000);
  });

  // 9. 데미지 계산
  test('9. 데미지 — baseDmg=100, Lv3, 스케일링 50%, stat=200', () => {
    const dmg = calculateDamage(100, 3, 50, 200);
    // 100 + 100*2*0.1 + 200*0.5 = 100 + 20 + 100 = 220
    expect(dmg).toBe(220);
  });

  // 10. 장착 슬롯 제한
  test('10. 장착 슬롯 6개 초과 시 false', () => {
    expect(canEquip(5)).toBe(true);
    expect(canEquip(6)).toBe(false);
  });
});
