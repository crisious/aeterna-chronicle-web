/**
 * 유닛 테스트 — SYNC-242: SCENARIO_PARTY_HUD_LAYOUTS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_PARTY_HUD_LAYOUTS,
  getPartyHudLayoutNarrative,
  listPartyHudLayouts,
  type PartyHudLayout,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly PartyHudLayout[] = ['compact', 'standard', 'wide', 'minimal'];

describe('SCENARIO_PARTY_HUD_LAYOUTS', () => {
  test('4 레이아웃 모두 정의', () => {
    expect(SCENARIO_PARTY_HUD_LAYOUTS.length).toBe(4);
    for (const l of ALL) {
      expect(getPartyHudLayoutNarrative(l), l).toBeDefined();
    }
  });

  test('infoPerSlot 양수, occupancyPercent 0~100', () => {
    for (const l of SCENARIO_PARTY_HUD_LAYOUTS) {
      expect(l.infoPerSlot, l.layout).toBeGreaterThan(0);
      expect(l.screenOccupancyPercent, l.layout).toBeGreaterThan(0);
      expect(l.screenOccupancyPercent, l.layout).toBeLessThan(100);
    }
  });

  test('wide 는 minimal 보다 infoPerSlot 큼', () => {
    const wide = getPartyHudLayoutNarrative('wide')!;
    const minimal = getPartyHudLayoutNarrative('minimal')!;
    expect(wide.infoPerSlot).toBeGreaterThan(minimal.infoPerSlot);
    expect(wide.screenOccupancyPercent).toBeGreaterThan(minimal.screenOccupancyPercent);
  });

  test('listPartyHudLayouts 4 항목', () => {
    expect(listPartyHudLayouts().length).toBe(4);
  });

  test('layout 중복 없음', () => {
    const ks = SCENARIO_PARTY_HUD_LAYOUTS.map((l) => l.layout);
    expect(new Set(ks).size).toBe(ks.length);
  });
});
