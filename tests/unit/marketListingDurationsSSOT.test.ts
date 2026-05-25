/**
 * 유닛 테스트 — SYNC-249: SCENARIO_MARKET_LISTING_DURATIONS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_MARKET_LISTING_DURATIONS,
  getMarketListingDurationNarrative,
  listMarketListingDurations,
  type MarketListingDuration,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly MarketListingDuration[] = ['12h', '24h', '48h', '7d'];

describe('SCENARIO_MARKET_LISTING_DURATIONS', () => {
  test('4 기간 모두 정의', () => {
    expect(SCENARIO_MARKET_LISTING_DURATIONS.length).toBe(4);
    for (const d of ALL) {
      expect(getMarketListingDurationNarrative(d), d).toBeDefined();
    }
  });

  test('minutes 단조 증가 (12h < 24h < 48h < 7d)', () => {
    const order: readonly MarketListingDuration[] = ['12h', '24h', '48h', '7d'];
    for (let i = 1; i < order.length; i += 1) {
      const prev = getMarketListingDurationNarrative(order[i - 1])!;
      const cur = getMarketListingDurationNarrative(order[i])!;
      expect(cur.minutes, `${order[i - 1]}->${order[i]}`).toBeGreaterThan(prev.minutes);
    }
  });

  test('listingFeePercent 단조 증가', () => {
    const order: readonly MarketListingDuration[] = ['12h', '24h', '48h', '7d'];
    for (let i = 1; i < order.length; i += 1) {
      const prev = getMarketListingDurationNarrative(order[i - 1])!;
      const cur = getMarketListingDurationNarrative(order[i])!;
      expect(cur.listingFeePercent, `${order[i - 1]}->${order[i]}`).toBeGreaterThan(prev.listingFeePercent);
    }
  });

  test('minutes 양수', () => {
    for (const m of SCENARIO_MARKET_LISTING_DURATIONS) {
      expect(m.minutes, m.duration).toBeGreaterThan(0);
    }
  });

  test('duration 중복 없음', () => {
    const ks = SCENARIO_MARKET_LISTING_DURATIONS.map((m) => m.duration);
    expect(new Set(ks).size).toBe(ks.length);
  });

  test('listMarketListingDurations 4 항목', () => {
    expect(listMarketListingDurations().length).toBe(4);
  });
});
