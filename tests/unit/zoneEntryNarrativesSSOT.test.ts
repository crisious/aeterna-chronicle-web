/**
 * 유닛 테스트 — SYNC-103: SCENARIO_ZONE_ENTRY_NARRATIVES SSOT consistency
 *
 * 1) SCENARIO_ZONES 의 모든 zone obsidianId 는 진입 narrative 가 있다 (1:1 커버리지)
 * 2) 각 narrative 는 mood / suggestion 모두 비어 있지 않다
 * 3) 챕터별 lookup 헬퍼가 zone chapter 와 일치한다
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_ZONES,
  SCENARIO_ZONE_ENTRY_NARRATIVES,
  getZoneEntryNarrative,
  listZoneEntryNarrativesByChapter,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_ZONE_ENTRY_NARRATIVES', () => {
  test('SCENARIO_ZONES 의 모든 zone 은 진입 narrative 가 매칭된다', () => {
    for (const zone of SCENARIO_ZONES) {
      const narrative = getZoneEntryNarrative(zone.obsidianId);
      expect(narrative, zone.obsidianId).toBeDefined();
    }
  });

  test('진입 narrative 는 zone 외 obsidianId 를 참조하지 않는다', () => {
    const validZoneIds = new Set(SCENARIO_ZONES.map((z) => z.obsidianId));
    for (const narrative of SCENARIO_ZONE_ENTRY_NARRATIVES) {
      expect(validZoneIds.has(narrative.zoneObsidianId), narrative.zoneObsidianId).toBe(true);
    }
  });

  test('모든 narrative 는 mood/suggestion 이 비어 있지 않다', () => {
    for (const narrative of SCENARIO_ZONE_ENTRY_NARRATIVES) {
      expect(narrative.mood.trim(), narrative.zoneObsidianId).not.toBe('');
      expect(narrative.suggestion.trim(), narrative.zoneObsidianId).not.toBe('');
    }
  });

  test('zoneObsidianId 는 중복되지 않는다', () => {
    const ids = SCENARIO_ZONE_ENTRY_NARRATIVES.map((n) => n.zoneObsidianId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('listZoneEntryNarrativesByChapter 는 zone.chapter 와 일치한다', () => {
    for (let chapter = 1; chapter <= 5; chapter += 1) {
      const expected = new Set(
        SCENARIO_ZONES.filter((z) => z.chapter === chapter).map((z) => z.obsidianId),
      );
      const actual = listZoneEntryNarrativesByChapter(chapter).map((n) => n.zoneObsidianId);
      expect(new Set(actual), `chapter ${chapter}`).toEqual(expected);
    }
  });
});
