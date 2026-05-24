/**
 * 유닛 테스트 — SYNC-191: SCENARIO_BUILD_PRESETS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_BUILD_PRESETS,
  SCENARIO_CLASS_LEVEL_UP_NARRATIVES,
  SCENARIO_PASSIVE_EFFECT_LABELS,
  getBuildPresetNarrative,
  listBuildPresetClassKeys,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_BUILD_PRESETS', () => {
  test('6 클래스 모두 빌드 프리셋 매칭', () => {
    expect(SCENARIO_BUILD_PRESETS.length).toBe(6);
    for (const c of SCENARIO_CLASS_LEVEL_UP_NARRATIVES) {
      expect(getBuildPresetNarrative(c.classKey), c.classKey).toBeDefined();
    }
  });

  test('recommendedSkillFamilies 는 정확히 6개 (6 슬롯)', () => {
    for (const b of SCENARIO_BUILD_PRESETS) {
      expect(b.recommendedSkillFamilies.length, b.classKey).toBe(6);
      for (const f of b.recommendedSkillFamilies) {
        expect(f.trim(), `${b.classKey}:family`).not.toBe('');
      }
    }
  });

  test('recommendedPassive 는 SCENARIO_PASSIVE_EFFECT_LABELS 내 존재', () => {
    const validPassives = new Set(SCENARIO_PASSIVE_EFFECT_LABELS.map((p) => p.effectType));
    for (const b of SCENARIO_BUILD_PRESETS) {
      expect(validPassives.has(b.recommendedPassive), `${b.classKey}:${b.recommendedPassive}`).toBe(true);
    }
  });

  test('targetLevel 은 10/20/30 안에 든다', () => {
    for (const b of SCENARIO_BUILD_PRESETS) {
      expect([10, 20, 30], b.classKey).toContain(b.targetLevel);
    }
  });

  test('presetName/flavorSummary 비어 있지 않음, classKey 중복 없음', () => {
    for (const b of SCENARIO_BUILD_PRESETS) {
      expect(b.presetName.trim(), b.classKey).not.toBe('');
      expect(b.flavorSummary.trim(), b.classKey).not.toBe('');
    }
    const cks = listBuildPresetClassKeys();
    expect(new Set(cks).size).toBe(cks.length);
  });
});
