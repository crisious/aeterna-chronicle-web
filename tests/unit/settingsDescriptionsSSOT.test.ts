/**
 * 유닛 테스트 — SYNC-138: SCENARIO_SETTINGS_DESCRIPTIONS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_SETTINGS_DESCRIPTIONS,
  getSettingsDescription,
  listSettingsByCategory,
  type SettingsCategory,
  type SettingsItemKey,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly SettingsItemKey[] = [
  'audio_master', 'audio_bgm', 'audio_sfx',
  'graphics_quality', 'graphics_fullscreen',
  'accessibility_colorblind', 'accessibility_subtitle', 'accessibility_reduce_motion',
];

const CATEGORIES: readonly SettingsCategory[] = ['audio', 'graphics', 'accessibility'];

describe('SCENARIO_SETTINGS_DESCRIPTIONS', () => {
  test('8 항목 모두 정의', () => {
    expect(SCENARIO_SETTINGS_DESCRIPTIONS.length).toBe(8);
    for (const k of ALL) {
      expect(getSettingsDescription(k), k).toBeDefined();
    }
  });

  test('카테고리별 합산은 전체와 일치', () => {
    let total = 0;
    for (const c of CATEGORIES) {
      total += listSettingsByCategory(c).length;
    }
    expect(total).toBe(SCENARIO_SETTINGS_DESCRIPTIONS.length);
  });

  test('category 는 3종 enum 안에 든다', () => {
    for (const s of SCENARIO_SETTINGS_DESCRIPTIONS) {
      expect(CATEGORIES, s.itemKey).toContain(s.category);
    }
  });

  test('label/defaultValue/description 비어 있지 않음', () => {
    for (const s of SCENARIO_SETTINGS_DESCRIPTIONS) {
      expect(s.label.trim(), s.itemKey).not.toBe('');
      expect(s.defaultValue.trim(), s.itemKey).not.toBe('');
      expect(s.description.trim(), s.itemKey).not.toBe('');
    }
  });

  test('itemKey 중복 없음', () => {
    const ks = SCENARIO_SETTINGS_DESCRIPTIONS.map((s) => s.itemKey);
    expect(new Set(ks).size).toBe(ks.length);
  });
});
