/**
 * 유닛 테스트 — SYNC-206: SCENARIO_CHEAT_CODES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_CHEAT_CODES,
  getCheatCodeNarrative,
  listCheatCodeKeys,
  type CheatCodeKey,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly CheatCodeKey[] = ['god_mode', 'instant_kill', 'teleport', 'give_item', 'skip_dialogue'];

describe('SCENARIO_CHEAT_CODES', () => {
  test('5 치트 모두 정의', () => {
    expect(SCENARIO_CHEAT_CODES.length).toBe(5);
    for (const c of ALL) {
      expect(getCheatCodeNarrative(c), c).toBeDefined();
    }
  });

  test('command 는 cheat. prefix 로 시작', () => {
    for (const c of SCENARIO_CHEAT_CODES) {
      expect(c.command.startsWith('cheat.'), c.cheat).toBe(true);
    }
  });

  test('label/effectDescription/activationRequirement 비어 있지 않음', () => {
    for (const c of SCENARIO_CHEAT_CODES) {
      expect(c.label.trim(), c.cheat).not.toBe('');
      expect(c.effectDescription.trim(), c.cheat).not.toBe('');
      expect(c.activationRequirement.trim(), c.cheat).not.toBe('');
    }
  });

  test('모든 치트는 DEV_MODE 활성화 요구', () => {
    for (const c of SCENARIO_CHEAT_CODES) {
      expect(c.activationRequirement, c.cheat).toContain('DEV_MODE');
    }
  });

  test('cheat 중복 없음, listCheatCodeKeys 정합', () => {
    const cs = SCENARIO_CHEAT_CODES.map((c) => c.cheat);
    expect(new Set(cs).size).toBe(cs.length);
    expect(listCheatCodeKeys()).toEqual(ALL);
  });
});
