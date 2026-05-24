/**
 * 유닛 테스트 — SYNC-182: SCENARIO_GAMEPAD_BUTTON_MAPPINGS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_GAMEPAD_BUTTON_MAPPINGS,
  SCENARIO_KEYBIND_DESCRIPTIONS,
  getGamepadButtonMapping,
  listGamepadButtons,
  type GamepadButton,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly GamepadButton[] = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT'];

describe('SCENARIO_GAMEPAD_BUTTON_MAPPINGS', () => {
  test('8 버튼 모두 정의', () => {
    expect(SCENARIO_GAMEPAD_BUTTON_MAPPINGS.length).toBe(8);
    for (const b of ALL) {
      expect(getGamepadButtonMapping(b), b).toBeDefined();
    }
  });

  test('defaultAction 은 SCENARIO_KEYBIND_DESCRIPTIONS.action 내 존재', () => {
    const validActions = new Set(SCENARIO_KEYBIND_DESCRIPTIONS.map((k) => k.action));
    for (const m of SCENARIO_GAMEPAD_BUTTON_MAPPINGS) {
      expect(validActions.has(m.defaultAction), `${m.button}:${m.defaultAction}`).toBe(true);
    }
  });

  test('psLabel/keyboardEquivalent 비어 있지 않음', () => {
    for (const m of SCENARIO_GAMEPAD_BUTTON_MAPPINGS) {
      expect(m.psLabel.trim(), m.button).not.toBe('');
      expect(m.keyboardEquivalent.trim(), m.button).not.toBe('');
    }
  });

  test('button 중복 없음', () => {
    const bs = SCENARIO_GAMEPAD_BUTTON_MAPPINGS.map((m) => m.button);
    expect(new Set(bs).size).toBe(bs.length);
  });

  test('listGamepadButtons 는 8 버튼', () => {
    expect(listGamepadButtons()).toEqual(ALL);
  });
});
