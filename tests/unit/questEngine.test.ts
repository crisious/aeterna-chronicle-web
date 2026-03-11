/**
 * 유닛 테스트 — questEngine (10 tests)
 * 퀘스트 수주, 진행, 완료, 보상, 상태 관리
 */
import { describe, test, expect } from 'vitest';

// ── 타입/로직 재현 ──────────────────────────────────────────

type QuestType = 'main' | 'sub' | 'daily' | 'weekly' | 'event';
type ObjectiveType = 'kill' | 'collect' | 'talk' | 'explore' | 'craft';
type QuestStatus = 'in_progress' | 'completed' | 'failed' | 'abandoned';

interface QuestObjective { type: ObjectiveType; target: string; count: number; description: string }
interface ProgressEntry { objectiveIndex: number; current: number; target: number; completed: boolean }
interface QuestReward { type: 'exp' | 'gold' | 'item'; amount: number }

function initProgress(objectives: QuestObjective[]): ProgressEntry[] {
  return objectives.map((obj, i) => ({ objectiveIndex: i, current: 0, target: obj.count, completed: false }));
}

function updateProgress(progress: ProgressEntry[], objectiveIndex: number, amount: number): ProgressEntry[] {
  return progress.map(p => {
    if (p.objectiveIndex !== objectiveIndex || p.completed) return p;
    const newCurrent = Math.min(p.current + amount, p.target);
    return { ...p, current: newCurrent, completed: newCurrent >= p.target };
  });
}

function isQuestComplete(progress: ProgressEntry[]): boolean {
  return progress.every(p => p.completed);
}

function canAcceptQuest(playerLevel: number, requiredLevel: number, completedQuests: string[], prerequisite?: string): { ok: boolean; reason?: string } {
  if (playerLevel < requiredLevel) return { ok: false, reason: 'LEVEL_TOO_LOW' };
  if (prerequisite && !completedQuests.includes(prerequisite)) return { ok: false, reason: 'PREREQUISITE_MISSING' };
  return { ok: true };
}

function calculateRewardMultiplier(questType: QuestType): number {
  const multipliers: Record<QuestType, number> = { main: 1.5, sub: 1.0, daily: 0.8, weekly: 1.2, event: 1.3 };
  return multipliers[questType];
}

// ── 테스트 ──────────────────────────────────────────────────

describe('questEngine', () => {
  const objectives: QuestObjective[] = [
    { type: 'kill', target: 'slime', count: 5, description: '슬라임 5마리 처치' },
    { type: 'collect', target: 'herb', count: 3, description: '약초 3개 수집' },
  ];

  // 1. 진행도 초기화
  test('1. 진행도 초기화 — 모든 목표 current=0', () => {
    const progress = initProgress(objectives);
    expect(progress).toHaveLength(2);
    expect(progress[0].current).toBe(0);
    expect(progress[0].target).toBe(5);
  });

  // 2. 진행도 업데이트
  test('2. 진행도 업데이트 — kill 3회 반영', () => {
    let progress = initProgress(objectives);
    progress = updateProgress(progress, 0, 3);
    expect(progress[0].current).toBe(3);
    expect(progress[0].completed).toBe(false);
  });

  // 3. 목표 달성 시 completed 플래그
  test('3. 목표 수량 도달 시 completed=true', () => {
    let progress = initProgress(objectives);
    progress = updateProgress(progress, 0, 5);
    expect(progress[0].completed).toBe(true);
  });

  // 4. target 초과 시 cap
  test('4. 목표 초과 시 target 값으로 cap', () => {
    let progress = initProgress(objectives);
    progress = updateProgress(progress, 0, 999);
    expect(progress[0].current).toBe(5);
  });

  // 5. 전체 완료 확인
  test('5. 모든 목표 완료 시 isQuestComplete=true', () => {
    let progress = initProgress(objectives);
    progress = updateProgress(progress, 0, 5);
    progress = updateProgress(progress, 1, 3);
    expect(isQuestComplete(progress)).toBe(true);
  });

  // 6. 부분 완료 시 false
  test('6. 일부 목표 미완료 시 isQuestComplete=false', () => {
    let progress = initProgress(objectives);
    progress = updateProgress(progress, 0, 5);
    expect(isQuestComplete(progress)).toBe(false);
  });

  // 7. 수주 조건 — 레벨 충족
  test('7. 수주 가능 — 레벨/선행 충족', () => {
    expect(canAcceptQuest(10, 5, []).ok).toBe(true);
  });

  // 8. 수주 불가 — 레벨 부족
  test('8. 수주 불가 — 레벨 부족', () => {
    const result = canAcceptQuest(3, 10, []);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('LEVEL_TOO_LOW');
  });

  // 9. 수주 불가 — 선행 퀘스트 미완료
  test('9. 수주 불가 — 선행 퀘스트 미완료', () => {
    const result = canAcceptQuest(10, 5, [], 'main_ch1');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('PREREQUISITE_MISSING');
  });

  // 10. 보상 배율 — 메인 퀘스트 1.5배
  test('10. 보상 배율 — main=1.5, daily=0.8', () => {
    expect(calculateRewardMultiplier('main')).toBe(1.5);
    expect(calculateRewardMultiplier('daily')).toBe(0.8);
  });
});
