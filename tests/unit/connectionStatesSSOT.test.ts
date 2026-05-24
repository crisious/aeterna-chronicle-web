/**
 * 유닛 테스트 — SYNC-196: SCENARIO_CONNECTION_STATES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_CONNECTION_STATES,
  getConnectionStateNarrative,
  listConnectionStates,
  type ConnectionState,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly ConnectionState[] = ['connected', 'connecting', 'disconnected', 'reconnecting'];

describe('SCENARIO_CONNECTION_STATES', () => {
  test('4 상태 모두 정의', () => {
    expect(SCENARIO_CONNECTION_STATES.length).toBe(4);
    for (const s of ALL) {
      expect(getConnectionStateNarrative(s), s).toBeDefined();
    }
  });

  test('indicatorColor 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const s of SCENARIO_CONNECTION_STATES) {
      expect(hex.test(s.indicatorColor), `${s.state}:${s.indicatorColor}`).toBe(true);
    }
  });

  test('label/statusMessage 비어 있지 않음', () => {
    for (const s of SCENARIO_CONNECTION_STATES) {
      expect(s.label.trim(), s.state).not.toBe('');
      expect(s.statusMessage.trim(), s.state).not.toBe('');
    }
  });

  test('state 중복 없음', () => {
    const ss = SCENARIO_CONNECTION_STATES.map((s) => s.state);
    expect(new Set(ss).size).toBe(ss.length);
  });

  test('listConnectionStates 는 4 상태', () => {
    expect(listConnectionStates()).toEqual(ALL);
  });
});
