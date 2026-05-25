/**
 * 유닛 테스트 — SYNC-223: SCENARIO_QUEST_REWARD_CURRENCIES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_QUEST_REWARD_CURRENCIES,
  getRewardCurrencyNarrative,
  listRewardCurrencies,
  type RewardCurrencyKind,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly RewardCurrencyKind[] = ['gold', 'honor', 'seal', 'aether_crystal', 'seasonal_token'];

describe('SCENARIO_QUEST_REWARD_CURRENCIES', () => {
  test('5 화폐 모두 정의', () => {
    expect(SCENARIO_QUEST_REWARD_CURRENCIES.length).toBe(5);
    for (const c of ALL) {
      expect(getRewardCurrencyNarrative(c), c).toBeDefined();
    }
  });

  test('symbol/label/primarySource/primarySink 비어 있지 않음', () => {
    for (const c of SCENARIO_QUEST_REWARD_CURRENCIES) {
      expect(c.symbol.trim(), c.currency).not.toBe('');
      expect(c.label.trim(), c.currency).not.toBe('');
      expect(c.primarySource.trim(), c.currency).not.toBe('');
      expect(c.primarySink.trim(), c.currency).not.toBe('');
    }
  });

  test('symbol 중복 없음 (UI 구분)', () => {
    const symbols = SCENARIO_QUEST_REWARD_CURRENCIES.map((c) => c.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  test('currency 중복 없음', () => {
    const cs = SCENARIO_QUEST_REWARD_CURRENCIES.map((c) => c.currency);
    expect(new Set(cs).size).toBe(cs.length);
  });

  test('listRewardCurrencies 는 5 화폐', () => {
    expect(listRewardCurrencies()).toEqual(ALL);
  });
});
