/**
 * Unit tests — 퀘스트 초기화 + 보상 카테고리 narrative (QUEST-QA-6)
 *
 * 1) 일일/주간 초기화 대상 상태 필터링 로직 검증 (in-memory mock)
 * 2) 60 퀘스트의 보상 카테고리 분포 narrative
 * 3) timeLimit 초 정확 값 (86400 / 604800) 검증
 */
import { describe, it, expect } from 'vitest';
import {
  ALL_QUEST_SEEDS,
  QUEST_SEED_GROUPS,
} from '../../server/src/quest/questSeeds';

// questEngine.ts:272-307 의 resetDailyQuests / resetWeeklyQuests 필터 재현
type Status = 'in_progress' | 'completed' | 'failed' | 'abandoned';
type QuestType = 'main' | 'sub' | 'daily' | 'weekly' | 'event';

interface ProgressRow {
  questId: string;
  type: QuestType;
  status: Status;
}

const RESET_TARGET_STATUSES: Status[] = ['completed', 'failed', 'abandoned'];

function filterResetTargets(rows: ProgressRow[], targetType: QuestType): ProgressRow[] {
  return rows.filter(
    (r) => r.type === targetType && RESET_TARGET_STATUSES.includes(r.status),
  );
}

describe('QUEST-QA-S14 — 일일 초기화 로직', () => {
  const rows: ProgressRow[] = [
    { questId: 'DQ_KILL_01', type: 'daily', status: 'completed' },
    { questId: 'DQ_KILL_02', type: 'daily', status: 'in_progress' },
    { questId: 'DQ_KILL_03', type: 'daily', status: 'abandoned' },
    { questId: 'DQ_KILL_ELITE', type: 'daily', status: 'failed' },
    { questId: 'MQ_CH01', type: 'main', status: 'completed' },
    { questId: 'WQ_KILL_MEGA', type: 'weekly', status: 'completed' },
  ];

  it('일일 초기화: 완료/포기/실패 daily 만 대상 (in_progress 보존)', () => {
    const targets = filterResetTargets(rows, 'daily');
    expect(targets.length).toBe(3);
    const ids = targets.map((t) => t.questId);
    expect(ids).toContain('DQ_KILL_01');
    expect(ids).toContain('DQ_KILL_03');
    expect(ids).toContain('DQ_KILL_ELITE');
    expect(ids).not.toContain('DQ_KILL_02');
  });

  it('일일 초기화: main/weekly 미포함 (type 격리)', () => {
    const targets = filterResetTargets(rows, 'daily');
    for (const t of targets) {
      expect(t.type).toBe('daily');
    }
  });
});

describe('QUEST-QA-S15 — 주간 초기화 로직', () => {
  const rows: ProgressRow[] = [
    { questId: 'WQ_KILL_MEGA', type: 'weekly', status: 'completed' },
    { questId: 'WQ_RAID_CLEAR', type: 'weekly', status: 'in_progress' },
    { questId: 'WQ_PVP_GLORY', type: 'weekly', status: 'failed' },
    { questId: 'DQ_KILL_01', type: 'daily', status: 'completed' },
  ];

  it('주간 초기화: 완료/실패 weekly 만 대상 (in_progress 보존)', () => {
    const targets = filterResetTargets(rows, 'weekly');
    expect(targets.length).toBe(2);
    const ids = targets.map((t) => t.questId);
    expect(ids).toContain('WQ_KILL_MEGA');
    expect(ids).toContain('WQ_PVP_GLORY');
    expect(ids).not.toContain('WQ_RAID_CLEAR');
  });

  it('주간 초기화: daily 미포함 (type 격리)', () => {
    const targets = filterResetTargets(rows, 'weekly');
    for (const t of targets) {
      expect(t.type).toBe('weekly');
    }
  });
});

describe('QUEST-QA-S16 — timeLimit 정확 값', () => {
  it('15 일일 퀘스트 모두 timeLimit = 86400 (24h)', () => {
    for (const q of QUEST_SEED_GROUPS.daily) {
      expect(q.timeLimit, `${q.code} daily timeLimit`).toBe(86400);
    }
  });

  it('5 주간 퀘스트 모두 timeLimit = 604800 (7일)', () => {
    for (const q of QUEST_SEED_GROUPS.weekly) {
      expect(q.timeLimit, `${q.code} weekly timeLimit`).toBe(604800);
    }
  });

  it('5 이벤트 퀘스트 timeLimit ≥ 604800 (1주 이상 한정)', () => {
    for (const q of QUEST_SEED_GROUPS.event) {
      expect(q.timeLimit, `${q.code} event timeLimit`).toBeDefined();
      expect(q.timeLimit!).toBeGreaterThanOrEqual(604800);
    }
  });

  it('main/sub 퀘스트 timeLimit 없음 (무한 시간)', () => {
    for (const q of [...QUEST_SEED_GROUPS.main, ...QUEST_SEED_GROUPS.sub]) {
      expect(q.timeLimit, `${q.code} non-time-limited`).toBeUndefined();
    }
  });
});

describe('QUEST-QA-S17 — 보상 카테고리 분포', () => {
  it('60 퀘스트 모두 exp 보상 포함 (경험치 필수 narrative)', () => {
    for (const q of ALL_QUEST_SEEDS) {
      const hasExp = q.rewards.some((r) => r.type === 'exp');
      expect(hasExp, `${q.code} exp reward`).toBe(true);
    }
  });

  it('메인 퀘스트 중 item 보상 ≥ 5 (장비 시그니처 narrative)', () => {
    const mainWithItem = QUEST_SEED_GROUPS.main.filter((q) =>
      q.rewards.some((r) => r.type === 'item'),
    );
    expect(mainWithItem.length).toBeGreaterThanOrEqual(5);
  });

  it('title 보상은 최종/이벤트 (MQ_CH15 + EQ_ANNIVERSARY) narrative', () => {
    const titleQuests = ALL_QUEST_SEEDS.filter((q) =>
      q.rewards.some((r) => r.type === 'title'),
    );
    const codes = titleQuests.map((q) => q.code);
    expect(codes).toContain('MQ_CH15');
    expect(codes).toContain('EQ_ANNIVERSARY');
  });

  it('reputation 보상 ≥ 1 (길드 명성 narrative)', () => {
    const repQuests = ALL_QUEST_SEEDS.filter((q) =>
      q.rewards.some((r) => r.type === 'reputation'),
    );
    expect(repQuests.length).toBeGreaterThanOrEqual(1);
  });

  it('이벤트 퀘스트 ≥ 4 item 보상 (4계절 코스튬/탈것/모자/목도리)', () => {
    const eventWithItem = QUEST_SEED_GROUPS.event.filter((q) =>
      q.rewards.some((r) => r.type === 'item'),
    );
    // 4계절 (봄/여름/가을/겨울) = 4 item, EQ_ANNIVERSARY = gold + title (item 없음)
    expect(eventWithItem.length).toBeGreaterThanOrEqual(4);
  });
});

describe('QUEST-QA-S18 — objective type 분포', () => {
  it('60 퀘스트 objective type 분포 ≥ 4 distinct (다양 game-loop)', () => {
    const types = new Set<string>();
    for (const q of ALL_QUEST_SEEDS) {
      for (const obj of q.objectives) {
        types.add(obj.type);
      }
    }
    expect(types.size).toBeGreaterThanOrEqual(4);
  });

  it('kill / collect / explore 모두 ≥ 5 퀘스트 등장 (핵심 game-loop)', () => {
    const counts = new Map<string, number>();
    for (const q of ALL_QUEST_SEEDS) {
      const seen = new Set<string>();
      for (const obj of q.objectives) {
        if (!seen.has(obj.type)) {
          counts.set(obj.type, (counts.get(obj.type) ?? 0) + 1);
          seen.add(obj.type);
        }
      }
    }
    expect((counts.get('kill') ?? 0)).toBeGreaterThanOrEqual(5);
    expect((counts.get('collect') ?? 0)).toBeGreaterThanOrEqual(5);
    expect((counts.get('explore') ?? 0)).toBeGreaterThanOrEqual(5);
  });

  it('craft / talk 도 ≥ 2 퀘스트 등장 (보조 game-loop)', () => {
    const counts = new Map<string, number>();
    for (const q of ALL_QUEST_SEEDS) {
      const seen = new Set<string>();
      for (const obj of q.objectives) {
        if (!seen.has(obj.type)) {
          counts.set(obj.type, (counts.get(obj.type) ?? 0) + 1);
          seen.add(obj.type);
        }
      }
    }
    expect((counts.get('craft') ?? 0)).toBeGreaterThanOrEqual(2);
    expect((counts.get('talk') ?? 0)).toBeGreaterThanOrEqual(2);
  });
});
