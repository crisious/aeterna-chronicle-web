/**
 * 유닛 테스트 — SYNC-216: SCENARIO_TRADE_OFFER_STATUSES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_TRADE_OFFER_STATUSES,
  getTradeOfferStatusNarrative,
  listTradeOfferStatuses,
  type TradeOfferStatus,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly TradeOfferStatus[] = ['pending', 'accepted', 'rejected', 'cancelled'];

describe('SCENARIO_TRADE_OFFER_STATUSES', () => {
  test('4 상태 모두 정의', () => {
    expect(SCENARIO_TRADE_OFFER_STATUSES.length).toBe(4);
    for (const s of ALL) {
      expect(getTradeOfferStatusNarrative(s), s).toBeDefined();
    }
  });

  test('pending 만 accept/reject/cancel 가능', () => {
    const pending = getTradeOfferStatusNarrative('pending')!;
    expect(pending.allowedActions).toContain('accept');
    expect(pending.allowedActions).toContain('reject');
    expect(pending.allowedActions).toContain('cancel');
  });

  test('indicatorColor 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const s of SCENARIO_TRADE_OFFER_STATUSES) {
      expect(hex.test(s.indicatorColor), `${s.status}:${s.indicatorColor}`).toBe(true);
    }
  });

  test('label/displayMessage 비어 있지 않음', () => {
    for (const s of SCENARIO_TRADE_OFFER_STATUSES) {
      expect(s.label.trim(), s.status).not.toBe('');
      expect(s.displayMessage.trim(), s.status).not.toBe('');
    }
  });

  test('status 중복 없음', () => {
    const ss = SCENARIO_TRADE_OFFER_STATUSES.map((s) => s.status);
    expect(new Set(ss).size).toBe(ss.length);
  });
});
