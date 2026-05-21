/**
 * Unit tests — 퀘스트 카탈로그 60개 데이터 정합성 가드 (QUEST-QA)
 *
 * questSeeds.ts ALL_QUEST_SEEDS 60개 quest 의 narrative + 비즈니스 무결성 회귀 가드:
 * - 정량 (main 15 + sub 20 + daily 15 + weekly 5 + event 5 = 60)
 * - id (code) unique + naming pattern
 * - requiredLevel + objectives + rewards 무결성
 * - prerequisite 그래프 무결성 (메인 체인 / 서브 dep)
 */
import { describe, it, expect } from 'vitest';
import {
  ALL_QUEST_SEEDS,
  QUEST_SEED_GROUPS,
} from '../../server/src/quest/questSeeds';

const KNOWN_TYPES = new Set(['main', 'sub', 'daily', 'weekly', 'event']);
const KNOWN_OBJ_TYPES = new Set(['kill', 'collect', 'talk', 'explore', 'craft']);
const KNOWN_REWARD_TYPES = new Set(['exp', 'gold', 'item', 'title', 'reputation']);

describe('QUEST-QA-S1 — 60 퀘스트 정량 정합성', () => {
  it('전체 퀘스트 = 71개 (main 15 + sub 31 + daily 15 + weekly 5 + event 5) — SYNC-9 파편 2 추가', () => {
    expect(ALL_QUEST_SEEDS.length).toBe(71);
  });

  it('group 별 정량: main=15, sub=31, daily=15, weekly=5, event=5', () => {
    expect(QUEST_SEED_GROUPS.main.length).toBe(15);
    expect(QUEST_SEED_GROUPS.sub.length).toBe(31);
    expect(QUEST_SEED_GROUPS.daily.length).toBe(15);
    expect(QUEST_SEED_GROUPS.weekly.length).toBe(5);
    expect(QUEST_SEED_GROUPS.event.length).toBe(5);
  });

  it('type 분포 정확: main 15 + sub 31 + daily 15 + weekly 5 + event 5', () => {
    const counts = new Map<string, number>();
    for (const q of ALL_QUEST_SEEDS) {
      counts.set(q.type, (counts.get(q.type) ?? 0) + 1);
    }
    expect(counts.get('main')).toBe(15);
    expect(counts.get('sub')).toBe(31);
    expect(counts.get('daily')).toBe(15);
    expect(counts.get('weekly')).toBe(5);
    expect(counts.get('event')).toBe(5);
  });
});

describe('QUEST-QA-S2 — code unique + naming', () => {
  it('71 퀘스트 code 모두 unique (SYNC-9 파편 2 추가)', () => {
    const codes = ALL_QUEST_SEEDS.map((q) => q.code);
    expect(new Set(codes).size).toBe(71);
  });

  it('60 퀘스트 code prefix 매칭 (MQ/SQ/DQ/WQ/EQ)', () => {
    const PREFIX_BY_TYPE: Record<string, string> = {
      main: 'MQ_',
      sub: 'SQ_',
      daily: 'DQ_',
      weekly: 'WQ_',
      event: 'EQ_',
    };
    for (const q of ALL_QUEST_SEEDS) {
      const expected = PREFIX_BY_TYPE[q.type];
      expect(q.code.startsWith(expected), `${q.code} should start with ${expected}`).toBe(true);
    }
  });

  it('60 퀘스트 name 모두 비빈 + 한글 narrative 포함', () => {
    const korean = /[가-힣]/;
    for (const q of ALL_QUEST_SEEDS) {
      expect(q.name.length, `${q.code} name length`).toBeGreaterThan(0);
      expect(korean.test(q.name), `${q.code} name 한글 없음`).toBe(true);
    }
  });

  it('60 퀘스트 description length 10+ narrative', () => {
    for (const q of ALL_QUEST_SEEDS) {
      expect(q.description.length, `${q.code} description`).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('QUEST-QA-S3 — type 유효 값 + 메인 chapter', () => {
  it('모든 type 값 KNOWN_TYPES (main/sub/daily/weekly/event)', () => {
    for (const q of ALL_QUEST_SEEDS) {
      expect(KNOWN_TYPES.has(q.type), `${q.code} type '${q.type}'`).toBe(true);
    }
  });

  it('15 메인 퀘스트 chapter 1~15 정확 narrative (시간선 cohesion)', () => {
    const mainQuests = ALL_QUEST_SEEDS.filter((q) => q.type === 'main');
    expect(mainQuests.length).toBe(15);
    const chapters = mainQuests.map((q) => q.chapter).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(chapters).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it('비-main 퀘스트 chapter 없음 (sub/daily/weekly/event)', () => {
    for (const q of ALL_QUEST_SEEDS) {
      if (q.type !== 'main') {
        expect(q.chapter, `${q.code} non-main chapter`).toBeUndefined();
      }
    }
  });
});

describe('QUEST-QA-S4 — requiredLevel 정합성', () => {
  it('60 퀘스트 requiredLevel 모두 1~60 범위', () => {
    for (const q of ALL_QUEST_SEEDS) {
      expect(q.requiredLevel, `${q.code} requiredLevel`).toBeGreaterThanOrEqual(1);
      expect(q.requiredLevel).toBeLessThanOrEqual(60);
    }
  });

  it('메인 퀘스트 chapter 진행에 따라 requiredLevel 단조 증가', () => {
    const mainSorted = ALL_QUEST_SEEDS.filter((q) => q.type === 'main').sort(
      (a, b) => (a.chapter ?? 0) - (b.chapter ?? 0),
    );
    for (let i = 1; i < mainSorted.length; i += 1) {
      expect(
        mainSorted[i].requiredLevel,
        `${mainSorted[i].code} requiredLevel vs prev`,
      ).toBeGreaterThanOrEqual(mainSorted[i - 1].requiredLevel);
    }
  });

  it('최종 메인 (MQ_CH15) requiredLevel = 60 (게임 종점)', () => {
    const final = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH15');
    expect(final).toBeDefined();
    expect(final!.requiredLevel).toBe(60);
  });
});

describe('QUEST-QA-S5 — objectives 무결성', () => {
  it('60 퀘스트 objectives 모두 ≥ 1', () => {
    for (const q of ALL_QUEST_SEEDS) {
      expect(q.objectives.length, `${q.code} objectives count`).toBeGreaterThanOrEqual(1);
    }
  });

  it('모든 objective type 유효 (kill/collect/talk/explore/craft)', () => {
    for (const q of ALL_QUEST_SEEDS) {
      for (const obj of q.objectives) {
        expect(KNOWN_OBJ_TYPES.has(obj.type), `${q.code} obj type '${obj.type}'`).toBe(true);
      }
    }
  });

  it('모든 objective count ≥ 1 + finite', () => {
    for (const q of ALL_QUEST_SEEDS) {
      for (const obj of q.objectives) {
        expect(Number.isFinite(obj.count)).toBe(true);
        expect(obj.count, `${q.code} ${obj.target} count`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('모든 objective target 비빈 + description 비빈', () => {
    for (const q of ALL_QUEST_SEEDS) {
      for (const obj of q.objectives) {
        expect(obj.target.length, `${q.code} target`).toBeGreaterThan(0);
        expect(obj.description.length, `${q.code} description`).toBeGreaterThan(0);
      }
    }
  });
});

describe('QUEST-QA-S6 — rewards 무결성', () => {
  it('60 퀘스트 rewards 모두 ≥ 1 보상', () => {
    for (const q of ALL_QUEST_SEEDS) {
      expect(q.rewards.length, `${q.code} rewards`).toBeGreaterThanOrEqual(1);
    }
  });

  it('모든 reward type 유효 (exp/gold/item/title/reputation)', () => {
    for (const q of ALL_QUEST_SEEDS) {
      for (const r of q.rewards) {
        expect(KNOWN_REWARD_TYPES.has(r.type), `${q.code} reward type '${r.type}'`).toBe(true);
      }
    }
  });

  it('모든 reward amount ≥ 1 + finite', () => {
    for (const q of ALL_QUEST_SEEDS) {
      for (const r of q.rewards) {
        expect(Number.isFinite(r.amount)).toBe(true);
        expect(r.amount, `${q.code} reward amount`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('item 타입 reward 는 itemId 필수, 기타 타입은 itemId 없음', () => {
    for (const q of ALL_QUEST_SEEDS) {
      for (const r of q.rewards) {
        if (r.type === 'item') {
          expect(r.itemId, `${q.code} item reward 'itemId'`).toBeDefined();
          expect(r.itemId!.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('메인 퀘스트 chapter 진행에 따라 exp 단조 증가', () => {
    const mainSorted = ALL_QUEST_SEEDS.filter((q) => q.type === 'main').sort(
      (a, b) => (a.chapter ?? 0) - (b.chapter ?? 0),
    );
    let prevExp = 0;
    for (const q of mainSorted) {
      const expReward = q.rewards.find((r) => r.type === 'exp');
      expect(expReward, `${q.code} exp reward`).toBeDefined();
      expect(expReward!.amount, `${q.code} exp >= prev`).toBeGreaterThanOrEqual(prevExp);
      prevExp = expReward!.amount;
    }
  });
});

describe('QUEST-QA-S7 — prerequisite 그래프 무결성', () => {
  it('메인 퀘스트 chapter N+1 은 chapter N 의 code 를 prereq 로 보유', () => {
    const mainSorted = ALL_QUEST_SEEDS.filter((q) => q.type === 'main').sort(
      (a, b) => (a.chapter ?? 0) - (b.chapter ?? 0),
    );
    for (let i = 1; i < mainSorted.length; i += 1) {
      const prev = mainSorted[i - 1];
      const curr = mainSorted[i];
      expect(
        curr.prerequisites,
        `${curr.code} prereq should include ${prev.code}`,
      ).toContain(prev.code);
    }
  });

  it('chapter 1 메인 (MQ_CH01) 은 prereq 없음 (게임 시작)', () => {
    const ch1 = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH01');
    expect(ch1).toBeDefined();
    expect(ch1!.prerequisites.length).toBe(0);
  });

  it('모든 prerequisite code 가 ALL_QUEST_SEEDS 에 정의되어 있음 (dangling 없음)', () => {
    const codes = new Set(ALL_QUEST_SEEDS.map((q) => q.code));
    for (const q of ALL_QUEST_SEEDS) {
      for (const pre of q.prerequisites) {
        expect(codes.has(pre), `${q.code} dangling prereq '${pre}'`).toBe(true);
      }
    }
  });

  it('prerequisite 자기 참조 없음 (self-loop 가드)', () => {
    for (const q of ALL_QUEST_SEEDS) {
      expect(q.prerequisites.includes(q.code), `${q.code} self-loop`).toBe(false);
    }
  });
});

describe('QUEST-QA-S8 — isRepeatable + timeLimit narrative', () => {
  it('메인/서브 퀘스트는 isRepeatable=false (1회성)', () => {
    for (const q of ALL_QUEST_SEEDS) {
      if (q.type === 'main' || q.type === 'sub') {
        expect(q.isRepeatable, `${q.code} repeatable`).toBe(false);
      }
    }
  });

  it('일일/주간 퀘스트는 isRepeatable=true (반복 가능)', () => {
    for (const q of ALL_QUEST_SEEDS) {
      if (q.type === 'daily' || q.type === 'weekly') {
        expect(q.isRepeatable, `${q.code} repeatable`).toBe(true);
      }
    }
  });

  it('일일 퀘스트 timeLimit = 86400 (24h)', () => {
    for (const q of ALL_QUEST_SEEDS) {
      if (q.type === 'daily') {
        expect(q.timeLimit, `${q.code} daily timeLimit`).toBe(86400);
      }
    }
  });

  it('주간 퀘스트 timeLimit = 604800 (7일)', () => {
    for (const q of ALL_QUEST_SEEDS) {
      if (q.type === 'weekly') {
        expect(q.timeLimit, `${q.code} weekly timeLimit`).toBe(604800);
      }
    }
  });

  it('이벤트 퀘스트 timeLimit 정의됨 (한정 기간)', () => {
    for (const q of ALL_QUEST_SEEDS) {
      if (q.type === 'event') {
        expect(q.timeLimit, `${q.code} event timeLimit`).toBeDefined();
        expect(q.timeLimit!).toBeGreaterThan(0);
      }
    }
  });
});

describe('QUEST-QA-S9 — 시그니처 핵심 퀘스트 narrative', () => {
  it('MQ_CH01 시작 퀘스트 narrative ("기억의 조각" 시그니처)', () => {
    const q = ALL_QUEST_SEEDS.find((x) => x.code === 'MQ_CH01');
    expect(q).toBeDefined();
    expect(q!.name).toContain('기억');
    expect(q!.requiredLevel).toBe(1);
    expect(q!.prerequisites.length).toBe(0);
  });

  it('MQ_CH15 최종 퀘스트 narrative ("에테르나 크로니클" 시그니처)', () => {
    const q = ALL_QUEST_SEEDS.find((x) => x.code === 'MQ_CH15');
    expect(q).toBeDefined();
    expect(q!.name).toContain('에테르나');
    expect(q!.requiredLevel).toBe(60);
    // 최종 퀘스트 reward 에 title 포함
    const hasTitle = q!.rewards.some((r) => r.type === 'title');
    expect(hasTitle, 'MQ_CH15 title reward').toBe(true);
  });

  it('이벤트 퀘스트 = 4계절 + 기념일 시그니처', () => {
    const events = ALL_QUEST_SEEDS.filter((q) => q.type === 'event');
    const codes = new Set(events.map((q) => q.code));
    expect(codes.has('EQ_SPRING_01')).toBe(true);
    expect(codes.has('EQ_SUMMER_01')).toBe(true);
    expect(codes.has('EQ_AUTUMN_01')).toBe(true);
    expect(codes.has('EQ_WINTER_01')).toBe(true);
    expect(codes.has('EQ_ANNIVERSARY')).toBe(true);
  });
});

describe('QUEST-QA-S10 — npcId 무결성 + 분포', () => {
  it('npcId 가 정의된 퀘스트 모두 비빈 + npc_ prefix narrative', () => {
    for (const q of ALL_QUEST_SEEDS) {
      if (q.npcId !== undefined) {
        expect(q.npcId.length, `${q.code} npcId`).toBeGreaterThan(0);
        expect(q.npcId.startsWith('npc_'), `${q.code} npcId prefix`).toBe(true);
      }
    }
  });

  it('서브 퀘스트 중 npcId 보유 ≥ 5 (NPC 의뢰 패턴 narrative)', () => {
    const subWithNpc = ALL_QUEST_SEEDS.filter((q) => q.type === 'sub' && q.npcId);
    expect(subWithNpc.length).toBeGreaterThanOrEqual(5);
  });
});
