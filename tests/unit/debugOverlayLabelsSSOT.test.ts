/**
 * 유닛 테스트 — SYNC-183: SCENARIO_DEBUG_OVERLAY_LABELS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_DEBUG_OVERLAY_LABELS,
  getDebugOverlayLabel,
  listDebugOverlayKeys,
  type DebugOverlayKey,
  type HudAnchor,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly DebugOverlayKey[] = ['fps', 'draw_calls', 'memory', 'atb_trace', 'zone_id', 'network'];
const VALID_ANCHORS: readonly HudAnchor[] = [
  'top_left', 'top_right', 'top_center', 'bottom_left', 'bottom_right', 'bottom_center',
];

describe('SCENARIO_DEBUG_OVERLAY_LABELS', () => {
  test('6 라벨 모두 정의', () => {
    expect(SCENARIO_DEBUG_OVERLAY_LABELS.length).toBe(6);
    for (const k of ALL) {
      expect(getDebugOverlayLabel(k), k).toBeDefined();
    }
  });

  test('anchor 는 HudAnchor 6종 enum 안에 든다', () => {
    for (const d of SCENARIO_DEBUG_OVERLAY_LABELS) {
      expect(VALID_ANCHORS, d.key).toContain(d.anchor);
    }
  });

  test('toggleShortcut 중복 없음 (Shift+F1~F6)', () => {
    const ss = SCENARIO_DEBUG_OVERLAY_LABELS.map((d) => d.toggleShortcut);
    expect(new Set(ss).size).toBe(ss.length);
  });

  test('label/description 비어 있지 않음', () => {
    for (const d of SCENARIO_DEBUG_OVERLAY_LABELS) {
      expect(d.label.trim(), d.key).not.toBe('');
      expect(d.description.trim(), d.key).not.toBe('');
    }
  });

  test('key 중복 없음, listDebugOverlayKeys 정합', () => {
    const ks = SCENARIO_DEBUG_OVERLAY_LABELS.map((d) => d.key);
    expect(new Set(ks).size).toBe(ks.length);
    expect(listDebugOverlayKeys()).toEqual(ALL);
  });
});
