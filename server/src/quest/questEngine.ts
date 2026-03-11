/**
 * 퀘스트 엔진 — 수주/진행/완료/보상/초기화
 * P4-06: 퀘스트 시스템
 */
import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────
export type QuestType = 'main' | 'sub' | 'daily' | 'weekly' | 'event';
export type ObjectiveType = 'kill' | 'collect' | 'talk' | 'explore' | 'craft';
export type QuestStatus = 'in_progress' | 'completed' | 'failed' | 'abandoned';

export interface QuestObjective {
  type: ObjectiveType;
  target: string;
  count: number;
  description: string;
}

export interface QuestReward {
  type: 'exp' | 'gold' | 'item' | 'title' | 'reputation';
  itemId?: string;
  amount: number;
  description: string;
}

export interface ProgressEntry {
  objectiveIndex: number;
  current: number;
  target: number;
  completed: boolean;
}

// ─── 에러 클래스 ────────────────────────────────────────────────
export class QuestError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'NOT_FOUND'
      | 'ALREADY_ACCEPTED'
      | 'LEVEL_TOO_LOW'
      | 'PREREQUISITE_MISSING'
      | 'NOT_IN_PROGRESS'
      | 'NOT_COMPLETE'
      | 'ALREADY_COMPLETED'
  ) {
    super(message);
    this.name = 'QuestError';
  }
}

// ════════════════════════════════════════════════════════════════
// 퀘스트 수주
// ════════════════════════════════════════════════════════════════

/**
 * 퀘스트 수주 — 레벨/선행조건 검증 후 QuestProgress 생성
 */
export async function acceptQuest(
  userId: string,
  questId: string,
  playerLevel: number
): Promise<{ progressId: string; objectives: ProgressEntry[] }> {
  // 1) 퀘스트 존재 확인
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest) {
    throw new QuestError('퀘스트를 찾을 수 없습니다.', 'NOT_FOUND');
  }

  // 2) 레벨 검증
  if (playerLevel < quest.requiredLevel) {
    throw new QuestError(
      `레벨이 부족합니다. (필요: ${quest.requiredLevel}, 현재: ${playerLevel})`,
      'LEVEL_TOO_LOW'
    );
  }

  // 3) 선행 퀘스트 검증
  const prerequisites = quest.prerequisites as unknown as string[];
  if (prerequisites.length > 0) {
    const completedQuests = await prisma.questProgress.findMany({
      where: {
        userId,
        status: 'completed',
      },
    });
    const completedQuestIds = new Set(completedQuests.map((qp) => qp.questId));

    // 선행 퀘스트가 code 기반 → Quest 테이블에서 id 역조회
    const prereqQuests = await prisma.quest.findMany({
      where: { code: { in: prerequisites } },
    });
    for (const prereq of prereqQuests) {
      if (!completedQuestIds.has(prereq.id)) {
        throw new QuestError(
          `선행 퀘스트 미완료: ${prereq.name} (${prereq.code})`,
          'PREREQUISITE_MISSING'
        );
      }
    }
  }

  // 4) 중복 수주 검사
  const existing = await prisma.questProgress.findUnique({
    where: { userId_questId: { userId, questId } },
  });
  if (existing) {
    if (existing.status === 'in_progress') {
      throw new QuestError('이미 진행 중인 퀘스트입니다.', 'ALREADY_ACCEPTED');
    }
    if (existing.status === 'completed' && !quest.isRepeatable) {
      throw new QuestError('이미 완료한 퀘스트입니다.', 'ALREADY_COMPLETED');
    }
    // 포기/실패/반복 가능 → 기존 레코드 삭제 후 재생성
    await prisma.questProgress.delete({
      where: { userId_questId: { userId, questId } },
    });
  }

  // 5) 목표 초기 progress 생성
  const objectives = quest.objectives as unknown as QuestObjective[];
  const initialProgress: ProgressEntry[] = objectives.map((obj, idx) => ({
    objectiveIndex: idx,
    current: 0,
    target: obj.count,
    completed: false,
  }));

  // 6) QuestProgress 생성
  const progress = await prisma.questProgress.create({
    data: {
      userId,
      questId,
      status: 'in_progress',
      progress: initialProgress as unknown as object,
    },
  });

  return { progressId: progress.id, objectives: initialProgress };
}

// ════════════════════════════════════════════════════════════════
// 목표 진행 업데이트 (이벤트 기반)
// ════════════════════════════════════════════════════════════════

/**
 * 특정 이벤트 발생 시 관련 퀘스트 목표 자동 업데이트
 * @param userId 플레이어 ID
 * @param eventType kill | collect | talk | explore | craft
 * @param target 대상 식별자 (몬스터 ID, 아이템 ID, NPC ID 등)
 * @param count 이벤트 횟수 (기본 1)
 * @returns 업데이트된 퀘스트 진행 목록
 */
export async function updateQuestProgress(
  userId: string,
  eventType: ObjectiveType,
  target: string,
  count: number = 1
): Promise<Array<{ questId: string; progress: ProgressEntry[]; allComplete: boolean }>> {
  // 진행 중인 퀘스트 전체 조회
  const activeProgresses = await prisma.questProgress.findMany({
    where: { userId, status: 'in_progress' },
  });

  const results: Array<{ questId: string; progress: ProgressEntry[]; allComplete: boolean }> = [];

  for (const qp of activeProgresses) {
    const quest = await prisma.quest.findUnique({ where: { id: qp.questId } });
    if (!quest) continue;

    const objectives = quest.objectives as unknown as QuestObjective[];
    const progressEntries = qp.progress as unknown as ProgressEntry[];

    let updated = false;

    for (let i = 0; i < objectives.length; i++) {
      const obj = objectives[i];
      const entry = progressEntries[i];

      if (obj.type === eventType && obj.target === target && !entry.completed) {
        entry.current = Math.min(entry.current + count, entry.target);
        entry.completed = entry.current >= entry.target;
        updated = true;
      }
    }

    if (updated) {
      await prisma.questProgress.update({
        where: { id: qp.id },
        data: { progress: progressEntries as unknown as object },
      });

      const allComplete = progressEntries.every((e) => e.completed);
      results.push({ questId: qp.questId, progress: progressEntries, allComplete });
    }
  }

  return results;
}

// ════════════════════════════════════════════════════════════════
// 완료 판정 + 보상 지급
// ════════════════════════════════════════════════════════════════

/**
 * 퀘스트 완료 처리 — 모든 목표 달성 확인 후 보상 반환
 * (실제 보상 지급은 호출측에서 인벤토리/경험치 시스템 연동)
 */
export async function completeQuest(
  userId: string,
  questId: string
): Promise<{ rewards: QuestReward[] }> {
  const qp = await prisma.questProgress.findUnique({
    where: { userId_questId: { userId, questId } },
  });

  if (!qp) {
    throw new QuestError('진행 중인 퀘스트가 없습니다.', 'NOT_IN_PROGRESS');
  }
  if (qp.status !== 'in_progress') {
    throw new QuestError(`퀘스트 상태 이상: ${qp.status}`, 'NOT_IN_PROGRESS');
  }

  const progressEntries = qp.progress as unknown as ProgressEntry[];
  const allComplete = progressEntries.every((e) => e.completed);
  if (!allComplete) {
    throw new QuestError('모든 목표를 달성하지 않았습니다.', 'NOT_COMPLETE');
  }

  // 상태를 completed로 변경
  await prisma.questProgress.update({
    where: { id: qp.id },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
  });

  // 보상 반환
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  const rewards = (quest?.rewards ?? []) as unknown as QuestReward[];

  return { rewards };
}

// ════════════════════════════════════════════════════════════════
// 포기 처리
// ════════════════════════════════════════════════════════════════

export async function abandonQuest(userId: string, questId: string): Promise<void> {
  const qp = await prisma.questProgress.findUnique({
    where: { userId_questId: { userId, questId } },
  });

  if (!qp || qp.status !== 'in_progress') {
    throw new QuestError('포기할 수 있는 퀘스트가 없습니다.', 'NOT_IN_PROGRESS');
  }

  await prisma.questProgress.update({
    where: { id: qp.id },
    data: { status: 'abandoned' },
  });
}

// ════════════════════════════════════════════════════════════════
// 일일/주간 초기화 스케줄러
// ════════════════════════════════════════════════════════════════

/**
 * 일일 퀘스트 초기화 — 완료/포기된 daily 퀘스트의 progress 삭제
 * 서버 시작 시 또는 cron에서 호출
 */
export async function resetDailyQuests(): Promise<number> {
  const dailyQuests = await prisma.quest.findMany({ where: { type: 'daily' } });
  const dailyQuestIds = dailyQuests.map((q) => q.id);

  if (dailyQuestIds.length === 0) return 0;

  const result = await prisma.questProgress.deleteMany({
    where: {
      questId: { in: dailyQuestIds },
      status: { in: ['completed', 'failed', 'abandoned'] },
    },
  });

  console.log(`[QuestEngine] 일일 퀘스트 초기화: ${result.count}건 삭제`);
  return result.count;
}

/**
 * 주간 퀘스트 초기화 — 완료/포기된 weekly 퀘스트의 progress 삭제
 */
export async function resetWeeklyQuests(): Promise<number> {
  const weeklyQuests = await prisma.quest.findMany({ where: { type: 'weekly' } });
  const weeklyQuestIds = weeklyQuests.map((q) => q.id);

  if (weeklyQuestIds.length === 0) return 0;

  const result = await prisma.questProgress.deleteMany({
    where: {
      questId: { in: weeklyQuestIds },
      status: { in: ['completed', 'failed', 'abandoned'] },
    },
  });

  console.log(`[QuestEngine] 주간 퀘스트 초기화: ${result.count}건 삭제`);
  return result.count;
}

// ─── 초기화 스케줄러 (setInterval 기반, 경량) ───────────────────
let dailyTimer: ReturnType<typeof setInterval> | null = null;
let weeklyTimer: ReturnType<typeof setInterval> | null = null;

/**
 * 퀘스트 초기화 스케줄러 시작
 * - 일일: 매 24시간
 * - 주간: 매 7일
 */
export function startQuestResetScheduler(): void {
  // 일일 초기화 (24시간 간격)
  const DAILY_MS = 24 * 60 * 60 * 1000;
  dailyTimer = setInterval(() => {
    void resetDailyQuests();
  }, DAILY_MS);

  // 주간 초기화 (7일 간격)
  const WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;
  weeklyTimer = setInterval(() => {
    void resetWeeklyQuests();
  }, WEEKLY_MS);

  console.log('[QuestEngine] 초기화 스케줄러 시작 (daily: 24h, weekly: 7d)');
}

export function stopQuestResetScheduler(): void {
  if (dailyTimer) {
    clearInterval(dailyTimer);
    dailyTimer = null;
  }
  if (weeklyTimer) {
    clearInterval(weeklyTimer);
    weeklyTimer = null;
  }
  console.log('[QuestEngine] 초기화 스케줄러 정지');
}
