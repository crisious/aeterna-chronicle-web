/**
 * 유닛 테스트 — SYNC-188: SCENARIO_LOG_LEVELS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_LOG_LEVELS,
  getLogLevelNarrative,
  listLogLevelsByPriority,
  type LogLevel,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];

describe('SCENARIO_LOG_LEVELS', () => {
  test('5 레벨 모두 정의', () => {
    expect(SCENARIO_LOG_LEVELS.length).toBe(5);
    for (const l of ALL) {
      expect(getLogLevelNarrative(l), l).toBeDefined();
    }
  });

  test('priority 0~4 중복 없음', () => {
    const ps = SCENARIO_LOG_LEVELS.map((l) => l.priority).sort((a, b) => a - b);
    expect(ps).toEqual([0, 1, 2, 3, 4]);
  });

  test('consoleColor 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const l of SCENARIO_LOG_LEVELS) {
      expect(hex.test(l.consoleColor), `${l.level}:${l.consoleColor}`).toBe(true);
    }
  });

  test('label/whenToUse 비어 있지 않음', () => {
    for (const l of SCENARIO_LOG_LEVELS) {
      expect(l.label.trim(), l.level).not.toBe('');
      expect(l.whenToUse.trim(), l.level).not.toBe('');
    }
  });

  test('listLogLevelsByPriority ascending', () => {
    const sorted = listLogLevelsByPriority();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].priority).toBeGreaterThan(sorted[i - 1].priority);
    }
  });
});
