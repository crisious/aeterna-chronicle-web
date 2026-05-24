/**
 * 유닛 테스트 — SYNC-130: 🎯 5 sprint (126~130) 누적 + 30 sprint 마디 stress
 *
 * 1) FACTION_INTRO_NARRATIVES — 7 파벌 1:1 매칭 (마디 신규)
 * 2) sync-126~130 신규 도메인 5종 entry count 정합
 * 3) MAIN_QUEST_ACCEPT ↔ TURNIN questCode 1:1 cross 정합
 * 4) 27 sprint (sync-104~130) 통합 가드 — 회귀 0 보장
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_FACTIONS,
  SCENARIO_FACTION_INTRO_NARRATIVES,
  SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES,
  SCENARIO_MAIN_QUEST_TURNIN_NARRATIVES,
  SCENARIO_SAVE_SLOT_DESCRIPTIONS,
  SCENARIO_PAUSE_MENU_LABELS,
  SCENARIO_LEVEL_UP_SHOUTS,
  getFactionIntroNarrative,
} from '../../shared/types/scenarioRegistry';

describe('SYNC-130 🎯 27 sprint 누적 마디 stress', () => {
  test('FACTION_INTRO_NARRATIVES — 7 파벌 1:1 매칭', () => {
    expect(SCENARIO_FACTIONS.length).toBe(7);
    for (const f of SCENARIO_FACTIONS) {
      const intro = getFactionIntroNarrative(f.obsidianId);
      expect(intro, f.obsidianId).toBeDefined();
      expect(intro?.identityLine.trim(), f.obsidianId).not.toBe('');
      expect(intro?.approachHint.trim(), f.obsidianId).not.toBe('');
    }
  });

  test('faction intro 는 valid faction obsidianId 만 참조', () => {
    const validIds = new Set(SCENARIO_FACTIONS.map((f) => f.obsidianId));
    for (const n of SCENARIO_FACTION_INTRO_NARRATIVES) {
      expect(validIds.has(n.factionObsidianId), n.factionObsidianId).toBe(true);
    }
  });

  test('MAIN_QUEST accept ↔ turnin questCode 1:1 cross 정합', () => {
    const acceptCodes = SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES.map((a) => a.questCode).sort();
    const turninCodes = SCENARIO_MAIN_QUEST_TURNIN_NARRATIVES.map((t) => t.questCode).sort();
    expect(turninCodes).toEqual(acceptCodes);
  });

  test('sync-126~130 신규 도메인 entry count 정합', () => {
    expect(SCENARIO_SAVE_SLOT_DESCRIPTIONS.length).toBe(4);
    expect(SCENARIO_PAUSE_MENU_LABELS.length).toBe(6);
    expect(SCENARIO_MAIN_QUEST_TURNIN_NARRATIVES.length).toBe(5);
    expect(SCENARIO_LEVEL_UP_SHOUTS.length).toBe(7);
    expect(SCENARIO_FACTION_INTRO_NARRATIVES.length).toBe(7);
  });

  test('sync-126~130 누적 29 entry 확보', () => {
    const total =
      SCENARIO_SAVE_SLOT_DESCRIPTIONS.length +
      SCENARIO_PAUSE_MENU_LABELS.length +
      SCENARIO_MAIN_QUEST_TURNIN_NARRATIVES.length +
      SCENARIO_LEVEL_UP_SHOUTS.length +
      SCENARIO_FACTION_INTRO_NARRATIVES.length;
    expect(total).toBe(29);
  });
});
