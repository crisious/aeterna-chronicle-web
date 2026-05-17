/**
 * Unit tests — 퀘스트 플레이 가능 여부 narrative 시나리오 (QUEST-QA-8)
 *
 * 플레이어 레벨/진행도별 수주 가능 퀘스트 분포 narrative cross-check:
 * - 신규 (lv1): 메인 1 + 일일 일부 + 이벤트 (4계절+기념일) 즉시 가능
 * - 중급 (lv30): 메인 9/15 + 서브/일일/주간 다수
 * - 고급 (lv60): 모든 퀘스트 가능
 * - 메인 체인 진행도에 따른 lock/unlock narrative
 */
import { describe, it, expect } from 'vitest';
import {
  ALL_QUEST_SEEDS,
  QUEST_SEED_GROUPS,
  type QuestSeedData,
} from '../../server/src/quest/questSeeds';

/** 플레이어가 수주 가능한 퀘스트 필터 — 레벨 + 선행 완료 + 이미 완료된 non-repeatable 제외 */
function questsAvailableTo(
  playerLevel: number,
  completedCodes: Set<string>,
): QuestSeedData[] {
  return ALL_QUEST_SEEDS.filter((q) => {
    if (playerLevel < q.requiredLevel) return false;
    // 이미 완료된 non-repeatable 은 재수주 불가
    if (!q.isRepeatable && completedCodes.has(q.code)) return false;
    for (const pre of q.prerequisites) {
      if (!completedCodes.has(pre)) return false;
    }
    return true;
  });
}

describe('QUEST-QA-S19 — 신규 플레이어 (lv1) 즉시 가능 퀘스트', () => {
  const playerLevel = 1;
  const completed = new Set<string>();

  it('lv1 신규: MQ_CH01 (게임 시작 메인) 즉시 가능', () => {
    const available = questsAvailableTo(playerLevel, completed);
    const codes = available.map((q) => q.code);
    expect(codes).toContain('MQ_CH01');
  });

  it('lv1 신규: 이벤트 5종 (4계절+기념일) 모두 즉시 가능', () => {
    const available = questsAvailableTo(playerLevel, completed);
    const codes = available.map((q) => q.code);
    expect(codes).toContain('EQ_SPRING_01');
    expect(codes).toContain('EQ_SUMMER_01');
    expect(codes).toContain('EQ_AUTUMN_01');
    expect(codes).toContain('EQ_WINTER_01');
    expect(codes).toContain('EQ_ANNIVERSARY');
  });

  it('lv1 신규: 일일 NPC 인사 (DQ_TALK_01) + 일일 사냥 초급 (DQ_KILL_01) 가능', () => {
    const available = questsAvailableTo(playerLevel, completed);
    const codes = available.map((q) => q.code);
    expect(codes).toContain('DQ_TALK_01');
    expect(codes).toContain('DQ_KILL_01');
  });

  it('lv1 신규: 고급 메인 (MQ_CH15) 잠금 (lv 부족 + prereq 미완)', () => {
    const available = questsAvailableTo(playerLevel, completed);
    const codes = available.map((q) => q.code);
    expect(codes).not.toContain('MQ_CH15');
  });
});

describe('QUEST-QA-S20 — 중급 플레이어 (lv30) 가능 퀘스트', () => {
  const playerLevel = 30;
  // 메인 9개 완료 가정 (CH01~CH09)
  const completed = new Set([
    'MQ_CH01', 'MQ_CH02', 'MQ_CH03', 'MQ_CH04', 'MQ_CH05',
    'MQ_CH06', 'MQ_CH07', 'MQ_CH08', 'MQ_CH09',
  ]);

  it('lv30 중급: 메인 9번째 완료 후 MQ_CH10 (lv35) 잠금 — lv 부족 narrative', () => {
    const available = questsAvailableTo(playerLevel, completed);
    const codes = available.map((q) => q.code);
    // MQ_CH10 requiredLevel=35, 중급 lv30 → 잠금
    expect(codes).not.toContain('MQ_CH10');
  });

  it('lv30 중급: 메인 11번째 (MQ_CH11 lv40) 잠금 (lv 부족)', () => {
    const available = questsAvailableTo(playerLevel, completed);
    const codes = available.map((q) => q.code);
    expect(codes).not.toContain('MQ_CH11');
  });

  it('lv30 중급: 서브 ≥ 10 (요구 lv 30 이하 모두 가능)', () => {
    const available = questsAvailableTo(playerLevel, completed);
    const subCount = available.filter((q) => q.type === 'sub').length;
    expect(subCount).toBeGreaterThanOrEqual(10);
  });

  it('lv30 중급: 모든 일일 퀘스트 가능 (최대 lv25)', () => {
    const available = questsAvailableTo(playerLevel, completed);
    const dailyCount = available.filter((q) => q.type === 'daily').length;
    expect(dailyCount).toBe(15);
  });
});

describe('QUEST-QA-S21 — 고급 플레이어 (lv60) 가능 퀘스트', () => {
  const playerLevel = 60;
  // 메인 14개 완료 (CH01~CH14)
  const completed = new Set(
    Array.from({ length: 14 }, (_, i) => `MQ_CH${String(i + 1).padStart(2, '0')}`),
  );

  it('lv60 고급: 최종 메인 (MQ_CH15) 수주 가능', () => {
    const available = questsAvailableTo(playerLevel, completed);
    const codes = available.map((q) => q.code);
    expect(codes).toContain('MQ_CH15');
  });

  it('lv60 고급: 모든 일일/주간 가용', () => {
    const available = questsAvailableTo(playerLevel, completed);
    expect(available.filter((q) => q.type === 'daily').length).toBe(15);
    expect(available.filter((q) => q.type === 'weekly').length).toBe(5);
  });

  it('lv60 고급: 모든 서브 가용 (lv 25 이하 + prereq 만족)', () => {
    const available = questsAvailableTo(playerLevel, completed);
    const subAvailable = available.filter((q) => q.type === 'sub');
    // SQ_FA_02 는 SQ_FA_01 prereq 필요 — completed 에 없으면 잠김
    // 일반적으로 ≥ 19 (SQ_FA_02 제외 다른 모든 sub)
    expect(subAvailable.length).toBeGreaterThanOrEqual(19);
  });
});

describe('QUEST-QA-S22 — 메인 체인 락 narrative', () => {
  it('완료 없이는 MQ_CH02~MQ_CH15 모두 잠김 (체인 시작 잠금)', () => {
    const completed = new Set<string>();
    const available = questsAvailableTo(60, completed);
    const codes = available.map((q) => q.code);
    expect(codes).toContain('MQ_CH01');
    for (let i = 2; i <= 15; i += 1) {
      const code = `MQ_CH${String(i).padStart(2, '0')}`;
      expect(codes).not.toContain(code);
    }
  });

  it('MQ_CH01 만 완료해도 MQ_CH03~MQ_CH15 잠김 (single step 진행)', () => {
    const completed = new Set(['MQ_CH01']);
    const available = questsAvailableTo(60, completed);
    const codes = available.map((q) => q.code);
    expect(codes).toContain('MQ_CH02');
    for (let i = 3; i <= 15; i += 1) {
      const code = `MQ_CH${String(i).padStart(2, '0')}`;
      expect(codes).not.toContain(code);
    }
  });

  it('각 chapter 진행마다 다음 chapter unlock narrative (15 step)', () => {
    let completed = new Set<string>();
    for (let i = 1; i <= 15; i += 1) {
      const code = `MQ_CH${String(i).padStart(2, '0')}`;
      const available = questsAvailableTo(60, completed);
      const availableCodes = available.map((q) => q.code);
      expect(availableCodes, `step ${i}`).toContain(code);
      completed.add(code);
    }
    // 모두 완료 후 다시 available
    const final = questsAvailableTo(60, completed);
    expect(final.filter((q) => q.type === 'main').length).toBe(0);  // 모든 메인 완료 (isRepeatable=false)
  });
});

describe('QUEST-QA-S23 — 서브 퀘스트 체인 narrative', () => {
  it('SQ_FA_02 는 SQ_FA_01 prereq 필요 (서브 체인)', () => {
    const sq02 = ALL_QUEST_SEEDS.find((q) => q.code === 'SQ_FA_02');
    expect(sq02).toBeDefined();
    expect(sq02!.prerequisites).toContain('SQ_FA_01');
  });

  it('SQ_FA_01 완료 전 SQ_FA_02 잠금', () => {
    const available = questsAvailableTo(60, new Set());
    const codes = available.map((q) => q.code);
    expect(codes).not.toContain('SQ_FA_02');
  });

  it('SQ_FA_01 완료 후 SQ_FA_02 unlock', () => {
    const available = questsAvailableTo(60, new Set(['SQ_FA_01']));
    const codes = available.map((q) => q.code);
    expect(codes).toContain('SQ_FA_02');
  });
});

describe('QUEST-QA-S24 — 게임 종료 시나리오 (lv60 + 모두 완료)', () => {
  it('lv60 + 메인 15 완료: 재수주 가능 퀘스트 = repeatable (daily 15 + weekly 5)', () => {
    const allMainCodes = Array.from(
      { length: 15 },
      (_, i) => `MQ_CH${String(i + 1).padStart(2, '0')}`,
    );
    const completed = new Set(allMainCodes);
    // isRepeatable=false 한 sub/event 도 모두 완료 한다고 가정 X
    // 실제 게임 종료 시 repeatable 만 재수주
    const repeatable = ALL_QUEST_SEEDS.filter((q) => q.isRepeatable);
    expect(repeatable.length).toBe(20);  // daily 15 + weekly 5
  });

  it('repeatable 퀘스트 모두 daily/weekly 타입 (long-tail 플레이 narrative)', () => {
    for (const q of ALL_QUEST_SEEDS) {
      if (q.isRepeatable) {
        expect(['daily', 'weekly'], `${q.code} repeatable type`).toContain(q.type);
      }
    }
  });
});
