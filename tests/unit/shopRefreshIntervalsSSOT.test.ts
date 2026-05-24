/**
 * 유닛 테스트 — SYNC-219: SCENARIO_SHOP_REFRESH_INTERVALS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_SHOP_REFRESH_INTERVALS,
  getShopRefreshIntervalNarrative,
  listShopRefreshIntervals,
  type ShopRefreshInterval,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly ShopRefreshInterval[] = ['hourly', 'daily', 'weekly', 'event'];

describe('SCENARIO_SHOP_REFRESH_INTERVALS', () => {
  test('4 주기 모두 정의', () => {
    expect(SCENARIO_SHOP_REFRESH_INTERVALS.length).toBe(4);
    for (const i of ALL) {
      expect(getShopRefreshIntervalNarrative(i), i).toBeDefined();
    }
  });

  test('refreshMinutes 정수, inventorySize 양수', () => {
    for (const i of SCENARIO_SHOP_REFRESH_INTERVALS) {
      expect(Number.isInteger(i.refreshMinutes), i.interval).toBe(true);
      expect(i.refreshMinutes, i.interval).toBeGreaterThanOrEqual(0);
      expect(i.inventorySize, i.interval).toBeGreaterThan(0);
    }
  });

  test('event 만 refreshMinutes 0 (수동 종료)', () => {
    expect(getShopRefreshIntervalNarrative('event')?.refreshMinutes).toBe(0);
  });

  test('label/uiHint 비어 있지 않음', () => {
    for (const i of SCENARIO_SHOP_REFRESH_INTERVALS) {
      expect(i.label.trim(), i.interval).not.toBe('');
      expect(i.uiHint.trim(), i.interval).not.toBe('');
    }
  });

  test('interval 중복 없음', () => {
    const is = SCENARIO_SHOP_REFRESH_INTERVALS.map((i) => i.interval);
    expect(new Set(is).size).toBe(is.length);
  });
});
