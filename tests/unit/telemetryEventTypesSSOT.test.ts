/**
 * 유닛 테스트 — SYNC-197: SCENARIO_TELEMETRY_EVENT_TYPES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_TELEMETRY_EVENT_TYPES,
  getTelemetryEventNarrative,
  listTelemetryEventsByPriority,
  type TelemetryEventType,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly TelemetryEventType[] = ['session_start', 'zone_enter', 'quest_complete', 'player_death', 'purchase'];

describe('SCENARIO_TELEMETRY_EVENT_TYPES', () => {
  test('5 이벤트 모두 정의', () => {
    expect(SCENARIO_TELEMETRY_EVENT_TYPES.length).toBe(5);
    for (const e of ALL) {
      expect(getTelemetryEventNarrative(e), e).toBeDefined();
    }
  });

  test('priority 양의 정수, payloadFieldsHint 비어있지 않음', () => {
    for (const e of SCENARIO_TELEMETRY_EVENT_TYPES) {
      expect(e.priority, e.event).toBeGreaterThan(0);
      expect(Number.isInteger(e.priority), e.event).toBe(true);
      expect(e.payloadFieldsHint.trim(), e.event).not.toBe('');
    }
  });

  test('listTelemetryEventsByPriority ascending', () => {
    const sorted = listTelemetryEventsByPriority();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].priority).toBeGreaterThanOrEqual(sorted[i - 1].priority);
    }
  });

  test('label 비어 있지 않음', () => {
    for (const e of SCENARIO_TELEMETRY_EVENT_TYPES) {
      expect(e.label.trim(), e.event).not.toBe('');
    }
  });

  test('event 중복 없음', () => {
    const es = SCENARIO_TELEMETRY_EVENT_TYPES.map((e) => e.event);
    expect(new Set(es).size).toBe(es.length);
  });
});
