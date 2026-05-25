/**
 * 유닛 테스트 — SYNC-251: SCENARIO_COSMETIC_SLOTS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_COSMETIC_SLOTS,
  getCosmeticSlotNarrative,
  listCosmeticSlots,
  type CosmeticSlot,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly CosmeticSlot[] = ['helm', 'armor', 'weapon_skin', 'back', 'aura'];
const ZONES = new Set(['머리', '몸통', '손', '등', '주변']);

describe('SCENARIO_COSMETIC_SLOTS', () => {
  test('5 슬롯 모두 정의', () => {
    expect(SCENARIO_COSMETIC_SLOTS.length).toBe(5);
    for (const s of ALL) {
      expect(getCosmeticSlotNarrative(s), s).toBeDefined();
    }
  });

  test('bodyZone 은 허용 셋 내 값', () => {
    for (const c of SCENARIO_COSMETIC_SLOTS) {
      expect(ZONES.has(c.bodyZone), `${c.slot}:${c.bodyZone}`).toBe(true);
    }
  });

  test('bodyZone 중복 없음 (각 부위당 1 슬롯)', () => {
    const zs = SCENARIO_COSMETIC_SLOTS.map((c) => c.bodyZone);
    expect(new Set(zs).size).toBe(zs.length);
  });

  test('weapon_skin, aura 는 canConflict=false', () => {
    expect(getCosmeticSlotNarrative('weapon_skin')?.canConflict).toBe(false);
    expect(getCosmeticSlotNarrative('aura')?.canConflict).toBe(false);
  });

  test('slot 중복 없음', () => {
    const ks = SCENARIO_COSMETIC_SLOTS.map((c) => c.slot);
    expect(new Set(ks).size).toBe(ks.length);
  });

  test('listCosmeticSlots 5 항목', () => {
    expect(listCosmeticSlots().length).toBe(5);
  });
});
