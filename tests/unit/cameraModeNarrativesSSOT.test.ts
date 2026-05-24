/**
 * 유닛 테스트 — SYNC-167: SCENARIO_CAMERA_MODE_NARRATIVES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_CAMERA_MODE_NARRATIVES,
  getCameraModeNarrative,
  listCameraModes,
  type CameraMode,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly CameraMode[] = ['follow', 'free', 'cinematic'];

describe('SCENARIO_CAMERA_MODE_NARRATIVES', () => {
  test('3 모드 모두 정의', () => {
    expect(SCENARIO_CAMERA_MODE_NARRATIVES.length).toBe(3);
    for (const m of ALL) {
      expect(getCameraModeNarrative(m), m).toBeDefined();
    }
  });

  test('shortcutKey 중복 없음', () => {
    const ks = SCENARIO_CAMERA_MODE_NARRATIVES.map((c) => c.shortcutKey);
    expect(new Set(ks).size).toBe(ks.length);
  });

  test('label/enterAnchor/usageHint 비어 있지 않음', () => {
    for (const c of SCENARIO_CAMERA_MODE_NARRATIVES) {
      expect(c.label.trim(), c.mode).not.toBe('');
      expect(c.enterAnchor.trim(), c.mode).not.toBe('');
      expect(c.usageHint.trim(), c.mode).not.toBe('');
    }
  });

  test('mode 중복 없음', () => {
    const ms = SCENARIO_CAMERA_MODE_NARRATIVES.map((c) => c.mode);
    expect(new Set(ms).size).toBe(ms.length);
  });

  test('listCameraModes 는 3 모드', () => {
    expect(listCameraModes()).toEqual(ALL);
  });
});
