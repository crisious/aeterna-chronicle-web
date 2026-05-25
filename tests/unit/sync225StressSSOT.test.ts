/**
 * 유닛 테스트 — SYNC-225: 🎯 5 sprint (221~225) 누적 stress + TRANSACTION_ERROR_CODES
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_SEASON_CYCLE_PHASES,
  SCENARIO_GUILD_RAID_TIERS,
  SCENARIO_QUEST_REWARD_CURRENCIES,
  SCENARIO_PARTY_ROSTER_SIZES,
  SCENARIO_TRANSACTION_ERROR_CODES,
  getTransactionErrorCodeNarrative,
  listTransactionErrorCodes,
  type TransactionErrorCode,
} from '../../shared/types/scenarioRegistry';

const CODES: readonly TransactionErrorCode[] = ['insufficient_funds', 'item_locked', 'inventory_full', 'partner_offline', 'rate_limit'];

describe('SYNC-225 🎯 5 sprint 누적 stress', () => {
  test('TRANSACTION_ERROR_CODES — 5 코드 매칭', () => {
    expect(SCENARIO_TRANSACTION_ERROR_CODES.length).toBe(5);
    for (const c of CODES) {
      const n = getTransactionErrorCodeNarrative(c);
      expect(n, c).toBeDefined();
      expect(n?.label.trim(), c).not.toBe('');
      expect(n?.userMessage.trim(), c).not.toBe('');
      expect(n?.recoveryHint.trim(), c).not.toBe('');
    }
  });

  test('httpStatus 는 4xx 범위', () => {
    for (const c of SCENARIO_TRANSACTION_ERROR_CODES) {
      expect(c.httpStatus, c.code).toBeGreaterThanOrEqual(400);
      expect(c.httpStatus, c.code).toBeLessThan(500);
    }
  });

  test('sync-221~225 신규 도메인 5종 entry count 정합', () => {
    expect(SCENARIO_SEASON_CYCLE_PHASES.length).toBe(4);
    expect(SCENARIO_GUILD_RAID_TIERS.length).toBe(4);
    expect(SCENARIO_QUEST_REWARD_CURRENCIES.length).toBe(5);
    expect(SCENARIO_PARTY_ROSTER_SIZES.length).toBe(4);
    expect(SCENARIO_TRANSACTION_ERROR_CODES.length).toBe(5);
  });

  test('sync-221~225 누적 22 entry 확보', () => {
    const total =
      SCENARIO_SEASON_CYCLE_PHASES.length +
      SCENARIO_GUILD_RAID_TIERS.length +
      SCENARIO_QUEST_REWARD_CURRENCIES.length +
      SCENARIO_PARTY_ROSTER_SIZES.length +
      SCENARIO_TRANSACTION_ERROR_CODES.length;
    expect(total).toBe(22);
  });
});
