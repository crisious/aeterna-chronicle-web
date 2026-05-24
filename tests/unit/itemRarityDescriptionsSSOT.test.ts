/**
 * 유닛 테스트 — SYNC-118: SCENARIO_ITEM_RARITY_DESCRIPTIONS SSOT consistency
 *
 * 1) 5 등급 모두 정의 (common ~ legendary)
 * 2) label/flavor/pickupAnchor 비어 있지 않음, uiColor 는 #rrggbb 형식
 * 3) listItemRaritiesAscending 은 정확히 5 등급 ascending 순서
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_ITEM_RARITY_DESCRIPTIONS,
  getItemRarityDescription,
  listItemRaritiesAscending,
  type ItemRarity,
} from '../../shared/types/scenarioRegistry';

const ASCENDING: readonly ItemRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

describe('SCENARIO_ITEM_RARITY_DESCRIPTIONS', () => {
  test('5 등급 모두 정의되어 있다', () => {
    expect(SCENARIO_ITEM_RARITY_DESCRIPTIONS.length).toBe(5);
    for (const rarity of ASCENDING) {
      expect(getItemRarityDescription(rarity), rarity).toBeDefined();
    }
  });

  test('label/flavor/pickupAnchor 모두 비어 있지 않다', () => {
    for (const r of SCENARIO_ITEM_RARITY_DESCRIPTIONS) {
      expect(r.label.trim(), r.rarity).not.toBe('');
      expect(r.flavor.trim(), r.rarity).not.toBe('');
      expect(r.pickupAnchor.trim(), r.rarity).not.toBe('');
    }
  });

  test('uiColor 는 #rrggbb 형식이다', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    for (const r of SCENARIO_ITEM_RARITY_DESCRIPTIONS) {
      expect(hexPattern.test(r.uiColor), `${r.rarity}: ${r.uiColor}`).toBe(true);
    }
  });

  test('listItemRaritiesAscending 은 정확히 5 등급 ascending', () => {
    expect(listItemRaritiesAscending()).toEqual(ASCENDING);
  });

  test('rarity 는 중복되지 않는다', () => {
    const rarities = SCENARIO_ITEM_RARITY_DESCRIPTIONS.map((r) => r.rarity);
    expect(new Set(rarities).size).toBe(rarities.length);
  });
});
