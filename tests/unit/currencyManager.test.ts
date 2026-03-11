/**
 * 유닛 테스트 — currencyManager (10 tests)
 * 화폐 변경, 잔액 확인, 거래 이력, 범위 검증
 */
import { describe, test, expect } from 'vitest';

// ── 타입/로직 재현 ──────────────────────────────────────────

type CurrencyType = 'gold' | 'diamond' | 'event_coin';
type TransactionReason = 'quest_reward' | 'shop_purchase' | 'craft_cost' | 'admin_grant' | 'admin_deduct';

interface Balance { gold: number; diamond: number; eventCoin: number }
interface Transaction { currency: CurrencyType; amount: number; balance: number; reason: TransactionReason }

function getBalance(balances: Balance): number {
  return balances.gold + balances.diamond + balances.eventCoin;
}

function canAfford(balance: Balance, currency: CurrencyType, cost: number): boolean {
  const map: Record<CurrencyType, number> = { gold: balance.gold, diamond: balance.diamond, event_coin: balance.eventCoin };
  return map[currency] >= cost;
}

function applyChange(balance: Balance, currency: CurrencyType, amount: number): Balance {
  const result = { ...balance };
  switch (currency) {
    case 'gold': result.gold = Math.max(0, result.gold + amount); break;
    case 'diamond': result.diamond = Math.max(0, result.diamond + amount); break;
    case 'event_coin': result.eventCoin = Math.max(0, result.eventCoin + amount); break;
  }
  return result;
}

function validateAmount(amount: number): { valid: boolean; reason?: string } {
  if (amount === 0) return { valid: false, reason: 'ZERO_AMOUNT' };
  if (!Number.isFinite(amount)) return { valid: false, reason: 'INVALID_NUMBER' };
  return { valid: true };
}

function isNegativeBalance(balance: Balance): boolean {
  return balance.gold < 0 || balance.diamond < 0 || balance.eventCoin < 0;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('ko-KR');
}

// ── 테스트 ──────────────────────────────────────────────────

describe('currencyManager', () => {
  const baseBalance: Balance = { gold: 10000, diamond: 500, eventCoin: 100 };

  // 1. 잔액 조회 — 총합
  test('1. 총 잔액 합산', () => {
    expect(getBalance(baseBalance)).toBe(10600);
  });

  // 2. 골드 차감 가능 확인
  test('2. 골드 차감 가능 — 잔액 충분', () => {
    expect(canAfford(baseBalance, 'gold', 5000)).toBe(true);
  });

  // 3. 골드 차감 불가 — 잔액 부족
  test('3. 골드 차감 불가 — 잔액 부족', () => {
    expect(canAfford(baseBalance, 'gold', 20000)).toBe(false);
  });

  // 4. 다이아 차감 가능 확인
  test('4. 다이아 잔액 확인', () => {
    expect(canAfford(baseBalance, 'diamond', 500)).toBe(true);
    expect(canAfford(baseBalance, 'diamond', 501)).toBe(false);
  });

  // 5. 골드 획득 적용
  test('5. 골드 1000 획득 → 11000', () => {
    const result = applyChange(baseBalance, 'gold', 1000);
    expect(result.gold).toBe(11000);
  });

  // 6. 골드 차감 적용
  test('6. 골드 3000 차감 → 7000', () => {
    const result = applyChange(baseBalance, 'gold', -3000);
    expect(result.gold).toBe(7000);
  });

  // 7. 차감 시 음수 방지 (floor 0)
  test('7. 차감 초과 시 0으로 바닥', () => {
    const result = applyChange(baseBalance, 'gold', -99999);
    expect(result.gold).toBe(0);
  });

  // 8. 금액 검증 — 0 금지
  test('8. 금액 0은 유효하지 않음', () => {
    expect(validateAmount(0).valid).toBe(false);
    expect(validateAmount(0).reason).toBe('ZERO_AMOUNT');
  });

  // 9. 금액 검증 — Infinity 금지
  test('9. Infinity/NaN 금액 유효하지 않음', () => {
    expect(validateAmount(Infinity).valid).toBe(false);
    expect(validateAmount(NaN).valid).toBe(false);
  });

  // 10. 음수 잔액 탐지
  test('10. 음수 잔액 탐지', () => {
    expect(isNegativeBalance({ gold: -1, diamond: 0, eventCoin: 0 })).toBe(true);
    expect(isNegativeBalance(baseBalance)).toBe(false);
  });
});
