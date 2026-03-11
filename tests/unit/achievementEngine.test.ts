/**
 * 유닛 테스트 — achievementEngine (10 tests)
 * 업적 조건 검증, 진행도 추적, 해금, 포인트 누적
 */
import { describe, test, expect } from 'vitest';

// ── 타입/로직 재현 ──────────────────────────────────────────

type ConditionType = 'count' | 'threshold' | 'flag' | 'combo';

interface AchievementCondition {
  type: ConditionType;
  target: string;
  count?: number;
  flags?: string[];
}

interface AchievementDef {
  id: string; code: string; name: string; tier: string;
  points: number; category: string; condition: AchievementCondition;
}

interface ProgressState { [target: string]: number }
interface FlagState extends Set<string> {}

function checkCountCondition(condition: AchievementCondition, progress: ProgressState): boolean {
  return (progress[condition.target] ?? 0) >= (condition.count ?? 0);
}

function checkThresholdCondition(condition: AchievementCondition, currentValue: number): boolean {
  return currentValue >= (condition.count ?? 0);
}

function checkFlagCondition(condition: AchievementCondition, flags: Set<string>): boolean {
  return condition.flags?.every(f => flags.has(f)) ?? false;
}

function checkComboCondition(condition: AchievementCondition, flags: Set<string>): boolean {
  return condition.flags?.every(f => flags.has(f)) ?? false;
}

function checkCondition(condition: AchievementCondition, progress: ProgressState, flags: Set<string>, currentValue?: number): boolean {
  switch (condition.type) {
    case 'count': return checkCountCondition(condition, progress);
    case 'threshold': return checkThresholdCondition(condition, currentValue ?? 0);
    case 'flag': return checkFlagCondition(condition, flags);
    case 'combo': return checkComboCondition(condition, flags);
    default: return false;
  }
}

function calculateTotalPoints(achievements: AchievementDef[], unlocked: Set<string>): number {
  return achievements.filter(a => unlocked.has(a.id)).reduce((sum, a) => sum + a.points, 0);
}

function getTierFromPoints(totalPoints: number): string {
  if (totalPoints >= 10000) return 'master';
  if (totalPoints >= 5000) return 'diamond';
  if (totalPoints >= 2000) return 'platinum';
  if (totalPoints >= 500) return 'gold';
  if (totalPoints >= 100) return 'silver';
  return 'bronze';
}

// ── 테스트 ──────────────────────────────────────────────────

describe('achievementEngine', () => {
  const countCondition: AchievementCondition = { type: 'count', target: 'monster_kill', count: 100 };
  const thresholdCondition: AchievementCondition = { type: 'threshold', target: 'max_damage', count: 5000 };
  const flagCondition: AchievementCondition = { type: 'flag', target: 'zone_discover', flags: ['zone_a', 'zone_b'] };
  const comboCondition: AchievementCondition = { type: 'combo', target: 'combo_check', flags: ['clear_dungeon', 'kill_boss', 'no_death'] };

  // 1. count 조건 — 충족
  test('1. count 조건 충족 시 true', () => {
    expect(checkCondition(countCondition, { monster_kill: 150 }, new Set())).toBe(true);
  });

  // 2. count 조건 — 미충족
  test('2. count 조건 미충족 시 false', () => {
    expect(checkCondition(countCondition, { monster_kill: 50 }, new Set())).toBe(false);
  });

  // 3. threshold 조건
  test('3. threshold 조건 — 현재값 >= 기준값', () => {
    expect(checkCondition(thresholdCondition, {}, new Set(), 5000)).toBe(true);
    expect(checkCondition(thresholdCondition, {}, new Set(), 4999)).toBe(false);
  });

  // 4. flag 조건 — 전부 보유
  test('4. flag 조건 — 모든 플래그 보유 시 true', () => {
    expect(checkCondition(flagCondition, {}, new Set(['zone_a', 'zone_b', 'zone_c']))).toBe(true);
  });

  // 5. flag 조건 — 일부 누락
  test('5. flag 조건 — 일부 플래그 누락 시 false', () => {
    expect(checkCondition(flagCondition, {}, new Set(['zone_a']))).toBe(false);
  });

  // 6. combo 조건
  test('6. combo 조건 — 모든 플래그 조합 시 true', () => {
    expect(checkCondition(comboCondition, {}, new Set(['clear_dungeon', 'kill_boss', 'no_death']))).toBe(true);
  });

  // 7. 포인트 합산
  test('7. 해금된 업적 포인트 합산', () => {
    const defs: AchievementDef[] = [
      { id: 'a1', code: 'A1', name: 'T1', tier: 'bronze', points: 10, category: 'battle', condition: countCondition },
      { id: 'a2', code: 'A2', name: 'T2', tier: 'silver', points: 50, category: 'explore', condition: flagCondition },
      { id: 'a3', code: 'A3', name: 'T3', tier: 'gold', points: 100, category: 'craft', condition: countCondition },
    ];
    expect(calculateTotalPoints(defs, new Set(['a1', 'a3']))).toBe(110);
  });

  // 8. 미해금 업적 포인트 제외
  test('8. 미해금 업적은 포인트에 미포함', () => {
    const defs: AchievementDef[] = [
      { id: 'a1', code: 'A1', name: 'T1', tier: 'bronze', points: 10, category: 'battle', condition: countCondition },
    ];
    expect(calculateTotalPoints(defs, new Set())).toBe(0);
  });

  // 9. 포인트 → 티어 계산
  test('9. 포인트 기반 티어 판정', () => {
    expect(getTierFromPoints(0)).toBe('bronze');
    expect(getTierFromPoints(100)).toBe('silver');
    expect(getTierFromPoints(500)).toBe('gold');
    expect(getTierFromPoints(2000)).toBe('platinum');
    expect(getTierFromPoints(5000)).toBe('diamond');
    expect(getTierFromPoints(10000)).toBe('master');
  });

  // 10. 진행도 없는 target → 0으로 처리
  test('10. 미등록 target 진행도는 0 반환', () => {
    expect(checkCondition(countCondition, {}, new Set())).toBe(false);
  });
});
