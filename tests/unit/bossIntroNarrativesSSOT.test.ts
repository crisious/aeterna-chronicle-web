/**
 * 유닛 테스트 — SYNC-108: SCENARIO_BOSS_INTRO_NARRATIVES SSOT consistency
 *
 * 1) SCENARIO_BOSSES 의 모든 obsidianId 에 intro narrative 가 매칭된다 (1:1)
 * 2) threatLine + 2 follow line 모두 비어 있지 않다
 * 3) orphan 참조 없음 (boss obsidianId 만 사용)
 * 4) 챕터 lookup 정합성
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_BOSSES,
  SCENARIO_BOSS_INTRO_NARRATIVES,
  getBossIntroNarrative,
  listBossIntroNarrativesByChapter,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_BOSS_INTRO_NARRATIVES', () => {
  test('SCENARIO_BOSSES 의 모든 obsidianId 에 intro narrative 가 매칭된다', () => {
    for (const boss of SCENARIO_BOSSES) {
      expect(getBossIntroNarrative(boss.obsidianId), boss.obsidianId).toBeDefined();
    }
  });

  test('intro narrative 는 boss obsidianId 외 항목을 참조하지 않는다', () => {
    const validBossIds = new Set(SCENARIO_BOSSES.map((b) => b.obsidianId));
    for (const n of SCENARIO_BOSS_INTRO_NARRATIVES) {
      expect(validBossIds.has(n.bossObsidianId), n.bossObsidianId).toBe(true);
    }
  });

  test('각 narrative 는 threatLine + 정확히 2 follow line 모두 비어 있지 않다', () => {
    for (const n of SCENARIO_BOSS_INTRO_NARRATIVES) {
      expect(n.threatLine.trim(), n.bossObsidianId).not.toBe('');
      expect(n.followLines.length, n.bossObsidianId).toBe(2);
      for (const line of n.followLines) {
        expect(line.trim(), n.bossObsidianId).not.toBe('');
      }
    }
  });

  test('bossObsidianId 는 중복되지 않는다', () => {
    const ids = SCENARIO_BOSS_INTRO_NARRATIVES.map((n) => n.bossObsidianId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('listBossIntroNarrativesByChapter 는 boss chapter 와 일치한다', () => {
    for (let chapter = 1; chapter <= 5; chapter += 1) {
      const expected = new Set(
        SCENARIO_BOSSES.filter((b) => b.chapter === chapter).map((b) => b.obsidianId),
      );
      const actual = listBossIntroNarrativesByChapter(chapter).map((n) => n.bossObsidianId);
      expect(new Set(actual), `chapter ${chapter}`).toEqual(expected);
    }
  });
});
