/**
 * 유닛 테스트 — SYNC-137: SCENARIO_KEYBIND_DESCRIPTIONS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_KEYBIND_DESCRIPTIONS,
  getKeybindDescription,
  listKeybindActions,
  type KeybindAction,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly KeybindAction[] = [
  'move_up', 'move_down', 'move_left', 'move_right',
  'interact', 'open_menu', 'quickslot_1', 'escape',
];

describe('SCENARIO_KEYBIND_DESCRIPTIONS', () => {
  test('8 action 모두 정의', () => {
    expect(SCENARIO_KEYBIND_DESCRIPTIONS.length).toBe(8);
    for (const a of ALL) {
      expect(getKeybindDescription(a), a).toBeDefined();
    }
  });

  test('label/defaultKey/description 비어 있지 않음', () => {
    for (const k of SCENARIO_KEYBIND_DESCRIPTIONS) {
      expect(k.label.trim(), k.action).not.toBe('');
      expect(k.defaultKey.trim(), k.action).not.toBe('');
      expect(k.description.trim(), k.action).not.toBe('');
    }
  });

  test('defaultKey 중복 없음 (충돌 방지)', () => {
    const keys = SCENARIO_KEYBIND_DESCRIPTIONS.map((k) => k.defaultKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('action 중복 없음', () => {
    const acts = SCENARIO_KEYBIND_DESCRIPTIONS.map((k) => k.action);
    expect(new Set(acts).size).toBe(acts.length);
  });

  test('listKeybindActions 는 SCENARIO order 반환', () => {
    expect(listKeybindActions().length).toBe(8);
  });
});
