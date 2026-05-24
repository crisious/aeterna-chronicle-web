/**
 * 유닛 테스트 — SYNC-166: SCENARIO_HUD_COMPONENT_LABELS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_HUD_COMPONENT_LABELS,
  getHudComponentLabel,
  listHudComponentsByAnchor,
  type HudComponentKey,
  type HudAnchor,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly HudComponentKey[] = [
  'status_bar', 'quick_slots', 'dialogue', 'minimap', 'quest_tracker', 'notifications',
];

const VALID_ANCHORS: readonly HudAnchor[] = [
  'top_left', 'top_right', 'top_center', 'bottom_left', 'bottom_right', 'bottom_center',
];

describe('SCENARIO_HUD_COMPONENT_LABELS', () => {
  test('6 컴포넌트 모두 정의', () => {
    expect(SCENARIO_HUD_COMPONENT_LABELS.length).toBe(6);
    for (const k of ALL) {
      expect(getHudComponentLabel(k), k).toBeDefined();
    }
  });

  test('anchor 는 6 종 enum 안에 든다', () => {
    for (const c of SCENARIO_HUD_COMPONENT_LABELS) {
      expect(VALID_ANCHORS, c.key).toContain(c.anchor);
    }
  });

  test('label/description 비어 있지 않음', () => {
    for (const c of SCENARIO_HUD_COMPONENT_LABELS) {
      expect(c.label.trim(), c.key).not.toBe('');
      expect(c.description.trim(), c.key).not.toBe('');
    }
  });

  test('key 중복 없음, anchor 합산은 전체와 일치', () => {
    const ks = SCENARIO_HUD_COMPONENT_LABELS.map((c) => c.key);
    expect(new Set(ks).size).toBe(ks.length);

    let total = 0;
    for (const a of VALID_ANCHORS) {
      total += listHudComponentsByAnchor(a).length;
    }
    expect(total).toBe(SCENARIO_HUD_COMPONENT_LABELS.length);
  });
});
