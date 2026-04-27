/**
 * Contract tests — combat/atb (Phase 54 / v1.0.0-rc.3)
 *
 * 본 모듈은 Build 단계 stub 상태 — 함수 본문은 NOT_IMPLEMENTED throw.
 * 본 테스트는:
 *   1) 상수 SSOT 정합성 (ATB_MAX, SPEED_TIER_SCALAR 등)
 *   2) stub 함수가 명시적으로 throw하는지 (실수로 silent 통과 방지)
 *   3) 공유 타입 (shared/types/atb) 계약 정합성
 * 만 검증한다. 실제 동작 검증은 구현 완료 후 별도 PR.
 */
import { describe, it, expect } from 'vitest';
import {
  ATB_MAX,
  ATB_BASE_CHARGE_PER_SEC,
  SPD_CLAMP,
  SPEED_TIER_SCALAR,
  createATBEntry,
  computeChargeDelta,
  advanceTick,
  toSnapshots,
  consumeGauge,
} from '../../../server/src/combat/atb/atbTimeline';
import {
  createWaitModeState,
  shouldFreezeTimeline,
  setMenuOpen,
  setTargetSelecting,
  switchMode,
} from '../../../server/src/combat/atb/waitMode';
import type { ATBMode, ATBSpeedTier } from '../../../shared/types/atb';

describe('atb contract — atbTimeline', () => {
  // ─── 상수 SSOT ───────────────────────────────────────────────
  describe('상수 SSOT', () => {
    it('ATB_MAX = 100 (FF6 레퍼런스 0~100 게이지)', () => {
      expect(ATB_MAX).toBe(100);
    });

    it('ATB_BASE_CHARGE_PER_SEC = 25 (spd=50 기준 4초 충전)', () => {
      expect(ATB_BASE_CHARGE_PER_SEC).toBe(25);
    });

    it('SPD_CLAMP { min: 1, max: 255 }', () => {
      expect(SPD_CLAMP).toEqual({ min: 1, max: 255 });
    });

    it('SPEED_TIER_SCALAR — 6 티어 모두 정의 (0.5 ~ 2.0)', () => {
      const tiers: ATBSpeedTier[] = [1, 2, 3, 4, 5, 6];
      for (const t of tiers) {
        expect(SPEED_TIER_SCALAR[t]).toBeGreaterThan(0);
        expect(SPEED_TIER_SCALAR[t]).toBeLessThanOrEqual(2.0);
      }
      // 단조 증가
      for (let i = 1; i < tiers.length; i++) {
        expect(SPEED_TIER_SCALAR[tiers[i]]).toBeGreaterThan(
          SPEED_TIER_SCALAR[tiers[i - 1]],
        );
      }
      // 티어 3 = 1.0 (기본 속도)
      expect(SPEED_TIER_SCALAR[3]).toBe(1.0);
    });
  });

  // ─── stub 함수 — 명시적 NOT_IMPLEMENTED ─────────────────────
  describe('stub 함수 명시적 throw (silent 우회 방지)', () => {
    it('createATBEntry: NOT_IMPLEMENTED', () => {
      expect(() => createATBEntry('a1', 50)).toThrow(/NOT_IMPLEMENTED/);
    });

    it('computeChargeDelta: NOT_IMPLEMENTED', () => {
      expect(() => computeChargeDelta(50, 1, 3, 100)).toThrow(/NOT_IMPLEMENTED/);
    });

    it('advanceTick: NOT_IMPLEMENTED', () => {
      expect(() => advanceTick([], [], 'ACTIVE', 3, 100, false)).toThrow(/NOT_IMPLEMENTED/);
    });

    it('toSnapshots: NOT_IMPLEMENTED', () => {
      expect(() => toSnapshots([], [])).toThrow(/NOT_IMPLEMENTED/);
    });

    it('consumeGauge: NOT_IMPLEMENTED', () => {
      expect(() => consumeGauge({} as any, 'attack')).toThrow(/NOT_IMPLEMENTED/);
    });
  });
});

describe('atb contract — waitMode', () => {
  describe('stub 함수 명시적 throw', () => {
    it('createWaitModeState: NOT_IMPLEMENTED', () => {
      expect(() => createWaitModeState('ACTIVE')).toThrow(/NOT_IMPLEMENTED/);
    });

    it('shouldFreezeTimeline: NOT_IMPLEMENTED', () => {
      expect(() => shouldFreezeTimeline({} as any)).toThrow(/NOT_IMPLEMENTED/);
    });

    it('setMenuOpen: NOT_IMPLEMENTED', () => {
      expect(() => setMenuOpen({} as any, true)).toThrow(/NOT_IMPLEMENTED/);
    });

    it('setTargetSelecting: NOT_IMPLEMENTED', () => {
      expect(() => setTargetSelecting({} as any, true)).toThrow(/NOT_IMPLEMENTED/);
    });

    it('switchMode: NOT_IMPLEMENTED', () => {
      const next: ATBMode = 'WAIT';
      expect(() => switchMode({} as any, next)).toThrow(/NOT_IMPLEMENTED/);
    });
  });
});
