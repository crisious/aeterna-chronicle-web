/**
 * 유닛 테스트 — SYNC-157: SCENARIO_INPUT_DEVICE_NARRATIVES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_INPUT_DEVICE_NARRATIVES,
  getInputDeviceNarrative,
  listInputDevices,
  type InputDeviceKind,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly InputDeviceKind[] = ['keyboard', 'gamepad', 'touch'];

describe('SCENARIO_INPUT_DEVICE_NARRATIVES', () => {
  test('3 장치 모두 정의', () => {
    expect(SCENARIO_INPUT_DEVICE_NARRATIVES.length).toBe(3);
    for (const d of ALL) {
      expect(getInputDeviceNarrative(d), d).toBeDefined();
    }
  });

  test('label/detectionAnchor/recommendedHint/shortcutPrefix 비어 있지 않음', () => {
    for (const n of SCENARIO_INPUT_DEVICE_NARRATIVES) {
      expect(n.label.trim(), n.device).not.toBe('');
      expect(n.detectionAnchor.trim(), n.device).not.toBe('');
      expect(n.recommendedHint.trim(), n.device).not.toBe('');
      expect(n.shortcutPrefix.trim(), n.device).not.toBe('');
    }
  });

  test('device 중복 없음', () => {
    const ds = SCENARIO_INPUT_DEVICE_NARRATIVES.map((n) => n.device);
    expect(new Set(ds).size).toBe(ds.length);
  });

  test('listInputDevices 는 3 장치', () => {
    expect(listInputDevices()).toEqual(ALL);
  });
});
