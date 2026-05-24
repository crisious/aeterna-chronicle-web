/**
 * 유닛 테스트 — SYNC-111: SCENARIO_BOSS_VICTORY_NARRATIVES SSOT consistency
 *
 * 1) SCENARIO_BOSSES 9개 모두 victory narrative 매칭 (boss intro 와 동일 커버리지)
 * 2) closingLine/rewardLine 비어 있지 않음, orphan 참조 없음
 * 3) 챕터 lookup 정합성
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_BOSSES,
  SCENARIO_BOSS_VICTORY_NARRATIVES,
  getBossVictoryNarrative,
  listBossVictoryNarrativesByChapter,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_BOSS_VICTORY_NARRATIVES', () => {
  test('SCENARIO_BOSSES 의 모든 obsidianId 에 victory narrative 가 매칭된다', () => {
    for (const boss of SCENARIO_BOSSES) {
      expect(getBossVictoryNarrative(boss.obsidianId), boss.obsidianId).toBeDefined();
    }
  });

  test('victory narrative 는 boss obsidianId 외 항목을 참조하지 않는다', () => {
    const validBossIds = new Set(SCENARIO_BOSSES.map((b) => b.obsidianId));
    for (const n of SCENARIO_BOSS_VICTORY_NARRATIVES) {
      expect(validBossIds.has(n.bossObsidianId), n.bossObsidianId).toBe(true);
    }
  });

  test('각 narrative 는 closingLine + rewardLine 모두 비어 있지 않다', () => {
    for (const n of SCENARIO_BOSS_VICTORY_NARRATIVES) {
      expect(n.closingLine.trim(), n.bossObsidianId).not.toBe('');
      expect(n.rewardLine.trim(), n.bossObsidianId).not.toBe('');
    }
  });

  test('bossObsidianId 는 중복되지 않는다', () => {
    const ids = SCENARIO_BOSS_VICTORY_NARRATIVES.map((n) => n.bossObsidianId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('listBossVictoryNarrativesByChapter 는 boss.chapter 와 일치한다', () => {
    for (let chapter = 1; chapter <= 5; chapter += 1) {
      const expected = new Set(
        SCENARIO_BOSSES.filter((b) => b.chapter === chapter).map((b) => b.obsidianId),
      );
      const actual = listBossVictoryNarrativesByChapter(chapter).map((n) => n.bossObsidianId);
      expect(new Set(actual), `chapter ${chapter}`).toEqual(expected);
    }
  });
});
