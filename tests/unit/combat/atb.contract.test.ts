/**
 * Contract tests — combat/atb
 *
 * FF6 레퍼런스 ATB 코어의 서버 SSOT 테스트.
 * - 속도 스탯 → 게이지 충전량
 * - Active/Wait/Semi 모드 정지 규칙
 * - ready 큐 순서와 행동 소비 규칙
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

  describe('동작 계약', () => {
    it('createATBEntry는 speed를 안전 범위로 clamp하고 기본 상태를 만든다', () => {
      expect(createATBEntry('hero', 999)).toEqual({
        actorId: 'hero',
        gauge: 0,
        spd: SPD_CLAMP.max,
        speedMultiplier: 1,
        frozen: false,
        alive: true,
        readyAtTick: null,
      });

      expect(createATBEntry('slow', -10).spd).toBe(SPD_CLAMP.min);
    });

    it('computeChargeDelta는 FF6식 속도/배속/티어 스칼라로 게이지를 계산한다', () => {
      expect(computeChargeDelta(50, 1, 3, 1000)).toBe(25);
      expect(computeChargeDelta(100, 1, 3, 1000)).toBe(50);
      expect(computeChargeDelta(50, 2, 6, 1000)).toBe(100);
      expect(computeChargeDelta(50, 1, 3, -100)).toBe(0);
    });

    it('advanceTick는 생존/비동결 유닛만 충전하고 ready 큐를 한 번만 등록한다', () => {
      const hero = { ...createATBEntry('hero', 50), gauge: 90 };
      const frozen = { ...createATBEntry('frozen', 50), gauge: 90, frozen: true };
      const dead = { ...createATBEntry('dead', 50), gauge: 90, alive: false };
      const entries = [hero, frozen, dead];

      const result = advanceTick(entries, [], 'ACTIVE', 3, 1000, false);

      expect(result.newlyReady).toEqual(['hero']);
      expect(hero.gauge).toBe(ATB_MAX);
      expect(hero.readyAtTick).toBe(1);
      expect(frozen.gauge).toBe(90);
      expect(dead.gauge).toBe(90);

      const second = advanceTick(entries, [], 'ACTIVE', 3, 1000, false);
      expect(second.newlyReady).toEqual([]);
      expect(hero.readyAtTick).toBe(1);
    });

    it('advanceTick는 WAIT 모드에서 메뉴가 열려 있으면 타임라인을 정지한다', () => {
      const hero = { ...createATBEntry('hero', 50), gauge: 50 };
      const result = advanceTick([hero], [], 'WAIT', 3, 1000, true);

      expect(result.newlyReady).toEqual([]);
      expect(hero.gauge).toBe(50);
    });

    it('toSnapshots는 readyAtTick 순서로 queueIndex를 부여하고 캐스트 잔여치를 반영한다', () => {
      const later = { ...createATBEntry('later', 50), gauge: 100, readyAtTick: 5 };
      const first = { ...createATBEntry('first', 50), gauge: 100, readyAtTick: 2 };
      const charging = { ...createATBEntry('charging', 50), gauge: 30 };

      expect(toSnapshots([later, first, charging], [{
        actorId: 'charging',
        skillId: 'fire',
        targetId: 'later',
        startedAtTick: 10,
        completesAtTick: 14,
        interruptible: true,
      }])).toEqual([
        { actorId: 'later', gauge: 100, ready: true, queueIndex: 1, castingRemainMs: null },
        { actorId: 'first', gauge: 100, ready: true, queueIndex: 0, castingRemainMs: null },
        { actorId: 'charging', gauge: 30, ready: false, queueIndex: null, castingRemainMs: 4 },
      ]);
    });

    it('consumeGauge는 커맨드 종류별 ATB 소비를 적용한다', () => {
      const hero = { ...createATBEntry('hero', 50), gauge: 100, readyAtTick: 1 };
      consumeGauge(hero, 'defend');
      expect(hero.gauge).toBe(50);
      expect(hero.readyAtTick).toBeNull();

      consumeGauge(hero, 'attack');
      expect(hero.gauge).toBe(0);
    });
  });
});

describe('atb contract — waitMode', () => {
  describe('동작 계약', () => {
    it('createWaitModeState는 모드와 UI 게이트 기본값을 만든다', () => {
      expect(createWaitModeState('WAIT')).toEqual({
        mode: 'WAIT',
        menuOpen: false,
        targetSelecting: false,
        subMenuDepth: 0,
      });
    });

    it('shouldFreezeTimeline은 ACTIVE/WAIT/SEMI 규칙을 구분한다', () => {
      expect(shouldFreezeTimeline({ ...createWaitModeState('ACTIVE'), menuOpen: true, targetSelecting: true })).toBe(false);
      expect(shouldFreezeTimeline({ ...createWaitModeState('WAIT'), menuOpen: true })).toBe(true);
      expect(shouldFreezeTimeline({ ...createWaitModeState('WAIT'), targetSelecting: true })).toBe(true);
      expect(shouldFreezeTimeline({ ...createWaitModeState('SEMI'), menuOpen: true })).toBe(false);
      expect(shouldFreezeTimeline({ ...createWaitModeState('SEMI'), targetSelecting: true })).toBe(true);
    });

    it('setMenuOpen/setTargetSelecting/switchMode는 원본을 보존하고 새 상태를 반환한다', () => {
      const base = createWaitModeState('ACTIVE');
      const menu = setMenuOpen(base, true);
      const target = setTargetSelecting(menu, true);
      const next: ATBMode = 'WAIT';

      expect(base.menuOpen).toBe(false);
      expect(menu.menuOpen).toBe(true);
      expect(target.targetSelecting).toBe(true);
      expect(switchMode(target, next)).toEqual({ ...target, mode: 'WAIT' });
    });
  });
});
