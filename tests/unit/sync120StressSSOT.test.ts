/**
 * 유닛 테스트 — SYNC-120: 🎯 17 sprint 누적 narrative 도메인 stress test
 *
 * 1) SCENARIO_BATTLE_VICTORY_BARKS — 6 동료 1:1 (마디 진입 신규 도메인)
 * 2) sync-104~120 신규 도메인 17종 모두 export 되어 있고 entry count 정합
 * 3) opening barks ↔ victory barks 동일 companion 커버리지
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_BATTLE_OPENING_BARKS,
  SCENARIO_BATTLE_VICTORY_BARKS,
  SCENARIO_BGM_NARRATIVES,
  SCENARIO_AMBIENT_NARRATIVES,
  SCENARIO_LOAD_SCREEN_TIPS,
  SCENARIO_CHAPTER_OPENING_NARRATIVES,
  SCENARIO_BOSS_INTRO_NARRATIVES,
  SCENARIO_BOSS_VICTORY_NARRATIVES,
  SCENARIO_FRAGMENT_RECOVERY_NARRATIVES,
  SCENARIO_GAME_OVER_NARRATIVES,
  SCENARIO_CHAPTER_TRANSITIONS,
  SCENARIO_DEITY_NARRATIVES,
  SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES,
  SCENARIO_COMPANION_FAREWELL_NARRATIVES,
  SCENARIO_GAME_ENTRY_NARRATIVES,
  SCENARIO_CLASS_LEVEL_UP_NARRATIVES,
  SCENARIO_ITEM_RARITY_DESCRIPTIONS,
  SCENARIO_FIELD_NPC_DIALOGUE_TEMPLATES,
  SCENARIO_ZONE_ENTRY_NARRATIVES,
  SCENARIO_COMPANIONS,
  getBattleVictoryBark,
} from '../../shared/types/scenarioRegistry';

describe('SYNC-120 🎯 17 sprint 누적 narrative 도메인 stress', () => {
  test('SCENARIO_BATTLE_VICTORY_BARKS — 6 동료 1:1 매칭', () => {
    for (const c of SCENARIO_COMPANIONS) {
      const bark = getBattleVictoryBark(c.obsidianId);
      expect(bark, c.obsidianId).toBeDefined();
      expect(bark?.barkLine.trim(), c.obsidianId).not.toBe('');
    }
  });

  test('opening barks ↔ victory barks 동일 companion 커버리지', () => {
    const openingIds = new Set(SCENARIO_BATTLE_OPENING_BARKS.map((b) => b.companionObsidianId));
    const victoryIds = new Set(SCENARIO_BATTLE_VICTORY_BARKS.map((b) => b.companionObsidianId));
    expect(victoryIds).toEqual(openingIds);
  });

  test('sync-102~120 신규 narrative 도메인 17종 모두 entry 존재', () => {
    // (sync-102) field npc dialogue templates: 5 role + 1 npc = 6
    expect(SCENARIO_FIELD_NPC_DIALOGUE_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    // (sync-103) zone entry: 9
    expect(SCENARIO_ZONE_ENTRY_NARRATIVES.length).toBe(9);
    // (sync-104) bgm: 42
    expect(SCENARIO_BGM_NARRATIVES.length).toBeGreaterThanOrEqual(42);
    // (sync-105) ambient: 43
    expect(SCENARIO_AMBIENT_NARRATIVES.length).toBeGreaterThanOrEqual(43);
    // (sync-106) load screen tips: 15
    expect(SCENARIO_LOAD_SCREEN_TIPS.length).toBeGreaterThanOrEqual(15);
    // (sync-107) chapter opening: 5
    expect(SCENARIO_CHAPTER_OPENING_NARRATIVES.length).toBe(5);
    // (sync-108) boss intro: 9
    expect(SCENARIO_BOSS_INTRO_NARRATIVES.length).toBe(9);
    // (sync-109) fragment recovery: 4
    expect(SCENARIO_FRAGMENT_RECOVERY_NARRATIVES.length).toBe(4);
    // (sync-110) game over: 6
    expect(SCENARIO_GAME_OVER_NARRATIVES.length).toBeGreaterThanOrEqual(6);
    // (sync-111) boss victory: 9
    expect(SCENARIO_BOSS_VICTORY_NARRATIVES.length).toBe(9);
    // (sync-112) chapter transitions: 4
    expect(SCENARIO_CHAPTER_TRANSITIONS.length).toBe(4);
    // (sync-113) deity narratives: 12
    expect(SCENARIO_DEITY_NARRATIVES.length).toBe(12);
    // (sync-114) main quest accept: 5
    expect(SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES.length).toBeGreaterThanOrEqual(5);
    // (sync-115) companion farewell: 6
    expect(SCENARIO_COMPANION_FAREWELL_NARRATIVES.length).toBe(6);
    // (sync-116) game entry: 3
    expect(SCENARIO_GAME_ENTRY_NARRATIVES.length).toBe(3);
    // (sync-117) class level up: 18
    expect(SCENARIO_CLASS_LEVEL_UP_NARRATIVES.length).toBe(18);
    // (sync-118) item rarity: 5
    expect(SCENARIO_ITEM_RARITY_DESCRIPTIONS.length).toBe(5);
    // (sync-119) battle opening barks: 6
    expect(SCENARIO_BATTLE_OPENING_BARKS.length).toBe(6);
    // (sync-120) battle victory barks: 6
    expect(SCENARIO_BATTLE_VICTORY_BARKS.length).toBe(6);
  });

  test('17 sprint 누적 narrative 총 entry 200+ 확보', () => {
    const total =
      SCENARIO_FIELD_NPC_DIALOGUE_TEMPLATES.length +
      SCENARIO_ZONE_ENTRY_NARRATIVES.length +
      SCENARIO_BGM_NARRATIVES.length +
      SCENARIO_AMBIENT_NARRATIVES.length +
      SCENARIO_LOAD_SCREEN_TIPS.length +
      SCENARIO_CHAPTER_OPENING_NARRATIVES.length +
      SCENARIO_BOSS_INTRO_NARRATIVES.length +
      SCENARIO_FRAGMENT_RECOVERY_NARRATIVES.length +
      SCENARIO_GAME_OVER_NARRATIVES.length +
      SCENARIO_BOSS_VICTORY_NARRATIVES.length +
      SCENARIO_CHAPTER_TRANSITIONS.length +
      SCENARIO_DEITY_NARRATIVES.length +
      SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES.length +
      SCENARIO_COMPANION_FAREWELL_NARRATIVES.length +
      SCENARIO_GAME_ENTRY_NARRATIVES.length +
      SCENARIO_CLASS_LEVEL_UP_NARRATIVES.length +
      SCENARIO_ITEM_RARITY_DESCRIPTIONS.length +
      SCENARIO_BATTLE_OPENING_BARKS.length +
      SCENARIO_BATTLE_VICTORY_BARKS.length;
    expect(total).toBeGreaterThanOrEqual(200);
  });
});
