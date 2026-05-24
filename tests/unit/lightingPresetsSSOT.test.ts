/**
 * 유닛 테스트 — SYNC-171: SCENARIO_LIGHTING_PRESETS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_LIGHTING_PRESETS,
  getLightingPresetNarrative,
  listLightingPresets,
  type LightingPreset,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly LightingPreset[] = ['warm', 'cool', 'dim', 'bright'];

describe('SCENARIO_LIGHTING_PRESETS', () => {
  test('4 프리셋 모두 정의', () => {
    expect(SCENARIO_LIGHTING_PRESETS.length).toBe(4);
    for (const p of ALL) {
      expect(getLightingPresetNarrative(p), p).toBeDefined();
    }
  });

  test('toneHex 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const p of SCENARIO_LIGHTING_PRESETS) {
      expect(hex.test(p.toneHex), `${p.preset}:${p.toneHex}`).toBe(true);
    }
  });

  test('label/moodAnchor/recommendedZoneType 비어 있지 않음', () => {
    for (const p of SCENARIO_LIGHTING_PRESETS) {
      expect(p.label.trim(), p.preset).not.toBe('');
      expect(p.moodAnchor.trim(), p.preset).not.toBe('');
      expect(p.recommendedZoneType.trim(), p.preset).not.toBe('');
    }
  });

  test('preset 중복 없음', () => {
    const ps = SCENARIO_LIGHTING_PRESETS.map((p) => p.preset);
    expect(new Set(ps).size).toBe(ps.length);
  });

  test('listLightingPresets 는 4 프리셋', () => {
    expect(listLightingPresets()).toEqual(ALL);
  });
});
