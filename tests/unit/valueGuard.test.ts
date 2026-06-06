/**
 * 유닛 테스트 — SECURITY: clampValue (클라 damage/exp/score 위생처리)
 *
 * NaN/Infinity(HP 오염 DoS·즉시 클리어)·음수(HP 회복 악용)·비숫자 → null(거부),
 * 정상 양수 → [0, maxPerHit] 클램프(1회 솔로 처치 차단).
 */
import { describe, expect, test } from 'vitest';
import { clampValue } from '../../server/src/security/valueGuard';

describe('SECURITY: clampValue', () => {
  test('정상 양수 통과 + 상한 클램프', () => {
    expect(clampValue(50, 100)).toBe(50);
    expect(clampValue(150, 100)).toBe(100); // 상한 초과 → 클램프
    expect(clampValue(0, 100)).toBe(0);
    expect(clampValue(100, 100)).toBe(100);
    expect(clampValue(0.5, 100)).toBe(0.5);
  });

  test('NaN/Infinity/비숫자 → null(거부)', () => {
    expect(clampValue(NaN, 100)).toBeNull();
    expect(clampValue(Infinity, 100)).toBeNull();
    expect(clampValue(-Infinity, 100)).toBeNull();
    expect(clampValue('100' as unknown, 100)).toBeNull();
    expect(clampValue(undefined, 100)).toBeNull();
    expect(clampValue(null, 100)).toBeNull();
    expect(clampValue({} as unknown, 100)).toBeNull();
  });

  test('음수 → null(거부)', () => {
    expect(clampValue(-1, 100)).toBeNull();
    expect(clampValue(-0.0001, 100)).toBeNull();
  });

  test('유효하지 않은 상한(NaN/음수) → null', () => {
    expect(clampValue(50, NaN)).toBeNull();
    expect(clampValue(50, Infinity)).toBeNull();
    expect(clampValue(50, -10)).toBeNull();
  });
});
