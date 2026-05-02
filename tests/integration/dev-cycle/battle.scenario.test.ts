/**
 * dev-cycle 시나리오 — battle (Phase 54 / v1.0.0-rc.3) — Build 단계
 *
 * verify-core.mjs `--scenario=battle` 게이트의 *전용 얇은 happy-path*.
 * 약속: ATB 게이지가 0 → ATB_MAX 까지 한 턴 진행 → 첫 행동 슬롯 ready === true.
 *
 * 예산: ≤ 3000ms (verify-core BUDGETS.battle = 90s 중 1/30).
 * 외부 의존: 없음 — scripts/dev-cycle/scenario-harness.mjs 단독.
 */
import { describe, it, expect } from 'vitest';
import {
    ATB_MAX,
    advanceOneBattleTurn,
    assertWithinBudget,
    buildBattleFixture,
} from '../../../scripts/dev-cycle/scenario-harness.mjs';
import type { BattleScenarioContract } from '../../../scripts/dev-cycle/types';

describe('dev-cycle/battle — 1 turn happy-path', () => {
    it('CombatManager → ATB advanceTick 1회 → 첫 행동 슬롯 ready', () => {
        const fx = buildBattleFixture();
        expect(fx.entries.length).toBe(2);
        expect(fx.entries.every((e) => e.gauge === 0 && !e.ready)).toBe(true);

        const result = advanceOneBattleTurn(fx);
        expect(result.firstReady).not.toBeNull();
        expect(result.firstReady?.ready).toBe(true);
        expect(result.firstReady?.gauge).toBeGreaterThanOrEqual(ATB_MAX);
    });

    it('파티 1인 ATB가 ATB_MAX 도달 시 actionQueue에 entry push', () => {
        const fx = buildBattleFixture();
        const result = advanceOneBattleTurn(fx);
        const actionQueue = result.snapshots.filter((s) => s.ready);
        expect(actionQueue.length).toBeGreaterThanOrEqual(1);
        // SPD가 더 큰 party-1이 먼저 ready 이어야 함
        expect(actionQueue[0]?.unitId).toBe('party-1');
    });

    it('elapsed ≤ 3000ms (예산 sentinel)', () => {
        const t0 = performance.now();
        advanceOneBattleTurn(buildBattleFixture());
        const elapsed = performance.now() - t0;
        const sentinel = assertWithinBudget(elapsed, 3000, 'battle');
        expect(sentinel.ok).toBe(true);
    });
});

// ─── 컨트랙트 타입 가드 (사용처 sentinel) ─────────────────────────
export const __BATTLE_CONTRACT_GUARD: BattleScenarioContract | null = null;
