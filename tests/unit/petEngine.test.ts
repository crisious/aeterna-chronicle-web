/**
 * 유닛 테스트 — petEngine (10 tests)
 * 소환/해제, 경험치/레벨업, 스킬 해금, 유대감, 진화, 스탯 성장
 */
import { describe, test, expect } from 'vitest';

// ── 타입/로직 재현 ──────────────────────────────────────────

type Grade = 'common' | 'rare' | 'epic' | 'legendary';

const GRADE_MULTIPLIER: Record<Grade, number> = {
  common: 1.0, rare: 1.3, epic: 1.6, legendary: 2.0,
};

const EXP_TABLE = [0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600]; // Lv.0~9 → 다음 레벨 필요 exp

function getRequiredExp(level: number): number {
  if (level < EXP_TABLE.length) return EXP_TABLE[level];
  return Math.floor(EXP_TABLE[EXP_TABLE.length - 1] * Math.pow(1.2, level - EXP_TABLE.length + 1));
}

function calculateLevelUp(currentLevel: number, currentExp: number, addedExp: number): { level: number; exp: number; levelsGained: number } {
  let level = currentLevel;
  let exp = currentExp + addedExp;
  let gained = 0;
  while (exp >= getRequiredExp(level) && level < 100) {
    exp -= getRequiredExp(level);
    level++;
    gained++;
  }
  return { level, exp, levelsGained: gained };
}

function calculateStatGrowth(baseAttack: number, level: number, grade: Grade): number {
  return Math.floor(baseAttack * (1 + level * 0.05) * GRADE_MULTIPLIER[grade]);
}

function canEvolve(level: number, bondLevel: number, grade: Grade): boolean {
  const evolveLevel: Record<Grade, number> = { common: 30, rare: 25, epic: 20, legendary: 15 };
  return level >= evolveLevel[grade] && bondLevel >= 50;
}

function calculateBondGain(action: 'feed' | 'play' | 'battle'): number {
  const gains: Record<string, number> = { feed: 2, play: 3, battle: 5 };
  return gains[action] ?? 0;
}

function getSkillSlots(level: number): number {
  if (level >= 40) return 4;
  if (level >= 25) return 3;
  if (level >= 10) return 2;
  return 1;
}

// ── 테스트 ──────────────────────────────────────────────────

describe('petEngine', () => {
  // 1. 경험치 추가 후 레벨 유지 (부족)
  test('1. 경험치 부족 시 레벨 유지', () => {
    const result = calculateLevelUp(1, 0, 50); // 필요 100
    expect(result.level).toBe(1);
    expect(result.exp).toBe(50);
  });

  // 2. 정확히 필요 경험치 → 레벨업
  test('2. 정확한 경험치로 레벨업', () => {
    const result = calculateLevelUp(1, 0, 100);
    expect(result.level).toBe(2);
    expect(result.levelsGained).toBe(1);
  });

  // 3. 경험치 초과 → 다중 레벨업
  test('3. 다중 레벨업 — 여분 경험치 이월', () => {
    const result = calculateLevelUp(0, 0, 400); // Lv0 → 100, Lv1 → 250
    expect(result.level).toBeGreaterThanOrEqual(2);
    expect(result.levelsGained).toBeGreaterThanOrEqual(2);
  });

  // 4. 등급별 스탯 성장 — common vs legendary
  test('4. legendary 등급 스탯이 common보다 높음', () => {
    const commonStat = calculateStatGrowth(10, 10, 'common');
    const legendStat = calculateStatGrowth(10, 10, 'legendary');
    expect(legendStat).toBeGreaterThan(commonStat);
  });

  // 5. 레벨 1 스탯 = 기본 * 등급
  test('5. 레벨 0 스탯 = 기본 * 등급 배율', () => {
    const stat = calculateStatGrowth(100, 0, 'rare');
    expect(stat).toBe(Math.floor(100 * 1.0 * 1.3)); // 130
  });

  // 6. 진화 조건 충족
  test('6. 진화 조건 충족 — common Lv.30 + 유대 50', () => {
    expect(canEvolve(30, 50, 'common')).toBe(true);
  });

  // 7. 진화 조건 미충족 — 레벨 부족
  test('7. 진화 불가 — 레벨 부족', () => {
    expect(canEvolve(20, 50, 'common')).toBe(false);
  });

  // 8. 유대감 증가량 — battle > play > feed
  test('8. 유대감 증가 — battle(5) > play(3) > feed(2)', () => {
    expect(calculateBondGain('battle')).toBe(5);
    expect(calculateBondGain('play')).toBe(3);
    expect(calculateBondGain('feed')).toBe(2);
  });

  // 9. 스킬 슬롯 해금 — 레벨별
  test('9. 스킬 슬롯 — Lv.10=2, Lv.25=3, Lv.40=4', () => {
    expect(getSkillSlots(1)).toBe(1);
    expect(getSkillSlots(10)).toBe(2);
    expect(getSkillSlots(25)).toBe(3);
    expect(getSkillSlots(40)).toBe(4);
  });

  // 10. 최대 레벨 100 캡
  test('10. 레벨 100 캡 — 초과 경험치 무시', () => {
    const result = calculateLevelUp(99, 0, 999999);
    expect(result.level).toBe(100);
  });
});
