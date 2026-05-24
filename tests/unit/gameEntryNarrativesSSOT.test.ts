/**
 * 유닛 테스트 — SYNC-116: SCENARIO_GAME_ENTRY_NARRATIVES SSOT consistency
 *
 * 1) 3 mode 모두 narrative 매칭 (new_game/continue/new_game_plus)
 * 2) primary/secondary line + modeLabel 비어 있지 않음, mode 중복 없음
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_GAME_ENTRY_NARRATIVES,
  getGameEntryNarrative,
  type GameEntryMode,
} from '../../shared/types/scenarioRegistry';

const MODES: readonly GameEntryMode[] = ['new_game', 'continue', 'new_game_plus'];

describe('SCENARIO_GAME_ENTRY_NARRATIVES', () => {
  test('3 mode 모두 정의되어 있다', () => {
    expect(SCENARIO_GAME_ENTRY_NARRATIVES.length).toBe(3);
    for (const mode of MODES) {
      expect(getGameEntryNarrative(mode), mode).toBeDefined();
    }
  });

  test('modeLabel + primary + secondary 모두 비어 있지 않다', () => {
    for (const n of SCENARIO_GAME_ENTRY_NARRATIVES) {
      expect(n.modeLabel.trim(), n.mode).not.toBe('');
      expect(n.primaryLine.trim(), n.mode).not.toBe('');
      expect(n.secondaryLine.trim(), n.mode).not.toBe('');
    }
  });

  test('mode 는 중복되지 않는다', () => {
    const modes = SCENARIO_GAME_ENTRY_NARRATIVES.map((n) => n.mode);
    expect(new Set(modes).size).toBe(modes.length);
  });

  test('alien mode 조회는 undefined 를 반환한다', () => {
    expect(getGameEntryNarrative('unknown_mode' as GameEntryMode)).toBeUndefined();
  });
});
