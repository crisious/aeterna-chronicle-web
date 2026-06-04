import { describe, expect, test, vi } from 'vitest';

import {
  SCENARIO_QUEST_OBJECTIVE_GUIDES,
  getQuestObjectiveGuideNarrative,
  listQuestObjectiveKinds,
  buildQuestGuide,
  type QuestObjectiveKind,
} from '../../shared/types/scenarioRegistry';

// ALL_QUEST_SEEDS 는 questSeeds.ts 에 있고 그 모듈이 `../db`(prisma)를 import 하므로 목킹해 디커플링.
vi.mock('../../server/src/db', () => ({ prisma: {} }));
import { ALL_QUEST_SEEDS } from '../../server/src/quest/questSeeds';

/**
 * 유닛 테스트 — SYNC-258: SCENARIO_QUEST_OBJECTIVE_GUIDES SSOT + buildQuestGuide.
 *
 * "모든 퀘스트에 가이드 기능" 의 핵심 불변식을 박제한다:
 *  (1) 5종 objective 가이드 narrative 망라/형식/일관성,
 *  (2) buildQuestGuide 가 objective {type,description} → 행동 안내를 올바로 파생,
 *  (3) 실제 71개 전 퀘스트가 빠짐없이 비어있지 않은 가이드를 얻는다(커버리지).
 */
describe('SCENARIO_QUEST_OBJECTIVE_GUIDES SSOT', () => {
  const ALL: readonly QuestObjectiveKind[] = ['kill', 'collect', 'talk', 'explore', 'craft'];

  test('망라성 — 5종 전수 1:1', () => {
    expect(SCENARIO_QUEST_OBJECTIVE_GUIDES.length).toBe(5);
    for (const k of ALL) {
      expect(getQuestObjectiveGuideNarrative(k), k).toBeDefined();
    }
  });

  test('list 가 ALL 과 정확히 일치', () => {
    expect(new Set(listQuestObjectiveKinds())).toEqual(new Set(ALL));
    expect(new Set(SCENARIO_QUEST_OBJECTIVE_GUIDES.map((g) => g.kind))).toEqual(new Set(ALL));
  });

  test('키 중복 없음', () => {
    const ks = SCENARIO_QUEST_OBJECTIVE_GUIDES.map((g) => g.kind);
    expect(new Set(ks).size).toBe(ks.length);
  });

  test('형식 — label/icon 비어있지 않고 guideTemplate 은 {what} 토큰 포함', () => {
    for (const g of SCENARIO_QUEST_OBJECTIVE_GUIDES) {
      expect(g.label.trim(), g.kind).not.toBe('');
      expect(g.icon.trim(), g.kind).not.toBe('');
      expect(g.guideTemplate.includes('{what}'), g.kind).toBe(true);
      expect(typeof g.opensMap, g.kind).toBe('boolean');
    }
  });

  test('opensMap 정책 — 월드 활동(explore/talk/kill/collect)=true, craft=false', () => {
    const opens = (k: QuestObjectiveKind) => getQuestObjectiveGuideNarrative(k)!.opensMap;
    expect(opens('explore')).toBe(true);
    expect(opens('talk')).toBe(true);
    expect(opens('kill')).toBe(true);
    expect(opens('collect')).toBe(true);
    expect(opens('craft')).toBe(false);
  });
});

describe('buildQuestGuide', () => {
  test('각 종류가 description 을 치환한 비어있지 않은 actionHint 를 만든다', () => {
    for (const kind of ['kill', 'collect', 'talk', 'explore', 'craft'] as QuestObjectiveKind[]) {
      const g = buildQuestGuide([{ type: kind, description: '표식테스트설명', target: 't_x', count: 1 }]);
      expect(g.actionHint, kind).toContain('표식테스트설명');
      expect(g.actionHint.trim(), kind).not.toBe('');
      expect(g.steps).toHaveLength(1);
      expect(g.steps[0].kind, kind).toBe(kind);
    }
  });

  test('opensMap 인 종류는 mapTarget 을 target 으로 채우고, craft 는 채우지 않는다', () => {
    const explore = buildQuestGuide([{ type: 'explore', description: '안개 빈터 도달', target: 'zone_fog_clearing' }]);
    expect(explore.opensMap).toBe(true);
    expect(explore.mapTarget).toBe('zone_fog_clearing');

    const craft = buildQuestGuide([{ type: 'craft', description: '시계태엽 제작', target: 'clockwork_gear' }]);
    expect(craft.opensMap).toBe(false);
    expect(craft.mapTarget).toBeUndefined();
  });

  test('첫 미완료 objective 를 현재 안내로 고른다(완료된 앞 단계는 건너뜀)', () => {
    const g = buildQuestGuide([
      { type: 'talk', description: '완료된 대화', target: 'npc_a', completed: true },
      { type: 'kill', description: '다음 토벌', target: 'mob_b', completed: false },
    ]);
    expect(g.actionHint).toContain('다음 토벌');
    expect(g.mapTarget).toBe('mob_b');
  });

  test('전부 완료면 첫 objective 로 폴백, objective 가 없으면 빈 actionHint', () => {
    const allDone = buildQuestGuide([{ type: 'kill', description: '처치 완료', target: 'mob_x', completed: true }]);
    expect(allDone.actionHint).toContain('처치 완료');
    const empty = buildQuestGuide([]);
    expect(empty.actionHint).toBe('');
    expect(empty.steps).toEqual([]);
  });

  test('미지의 objective 타입은 description 으로 폴백(크래시 금지)', () => {
    const g = buildQuestGuide([{ type: 'pvp_win', description: '아레나 승리', target: 'pvp_win' }]);
    expect(g.actionHint).toContain('아레나 승리');
    expect(g.steps[0].kind).toBe('unknown');
  });
});

describe('가이드 커버리지 — ALL_QUEST_SEEDS 71개 전수', () => {
  test('모든 퀘스트가 ≥1 objective 를 갖고 비어있지 않은 actionHint 를 얻는다', () => {
    expect(ALL_QUEST_SEEDS.length).toBe(71);
    const missing: string[] = [];
    for (const q of ALL_QUEST_SEEDS) {
      const objectives = (q.objectives ?? []) as { type: string; description?: string; target?: string }[];
      const guide = buildQuestGuide(objectives);
      if (objectives.length === 0 || guide.actionHint.trim() === '') {
        missing.push(q.code);
      }
    }
    expect(missing).toEqual([]);
  });

  test('실제 퀘스트의 모든 objective 가 알려진 5종(unknown 폴백 0건)', () => {
    const unknownSteps: string[] = [];
    for (const q of ALL_QUEST_SEEDS) {
      const objectives = (q.objectives ?? []) as { type: string; description?: string }[];
      const guide = buildQuestGuide(objectives);
      guide.steps.forEach((s, i) => {
        if (s.kind === 'unknown') unknownSteps.push(`${q.code}[${i}]:${objectives[i]?.type}`);
      });
    }
    expect(unknownSteps).toEqual([]);
  });
});
