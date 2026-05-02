/**
 * dev-cycle 시나리오 — map (Phase 54 / v1.0.0-rc.3) — Build 단계
 *
 * verify-core.mjs `--scenario=map` 게이트의 *전용 얇은 happy-path*.
 * 약속: SceneManager.swap('WorldScene' → 'BattleScene') 1회 → 새 scene init/create 발화.
 *
 * 예산: ≤ 2000ms (verify-core BUDGETS.map = 60s 중 1/30).
 */
import { describe, it, expect } from 'vitest';
import {
    assertWithinBudget,
    buildPhaserHarness,
    swapScene,
} from '../../../scripts/dev-cycle/scenario-harness.mjs';
import type { MapScenarioContract } from '../../../scripts/dev-cycle/types';

function buildHarness() {
    const initCalls: unknown[] = [];
    const createCalls: number[] = [];
    const harness = buildPhaserHarness({
        scenes: [
            { key: 'WorldScene' },
            {
                key: 'BattleScene',
                init: (data) => initCalls.push(data),
                create: () => createCalls.push(Date.now()),
            },
        ],
    });
    // WorldScene을 active로 부팅
    const world = harness.getScene('WorldScene')!;
    world.sys.settings.active = true;
    return { harness, initCalls, createCalls };
}

describe('dev-cycle/map — scene swap happy-path', () => {
    it('WorldScene → BattleScene swap 1회 → BattleScene.create() 발화', () => {
        const { harness, initCalls, createCalls } = buildHarness();
        const result = swapScene(harness, {
            from: 'WorldScene',
            to: 'BattleScene',
            payload: { encounterId: 'fixture-1' },
        });

        expect(result.sequence).toEqual([
            'shutdown:WorldScene',
            'init:BattleScene',
            'create:BattleScene',
        ]);
        expect(result.toActive).toBe(true);
        expect(initCalls).toEqual([{ encounterId: 'fixture-1' }]);
        expect(createCalls.length).toBe(1);
    });

    it('이전 scene WorldScene.sys.settings.active === false', () => {
        const { harness } = buildHarness();
        swapScene(harness, { from: 'WorldScene', to: 'BattleScene' });
        expect(harness.getScene('WorldScene')!.sys.settings.active).toBe(false);
        expect(harness.getScene('BattleScene')!.sys.settings.active).toBe(true);
    });

    it('elapsed ≤ 2000ms (예산 sentinel)', () => {
        const { harness } = buildHarness();
        const result = swapScene(harness, { from: 'WorldScene', to: 'BattleScene' });
        const sentinel = assertWithinBudget(result.elapsedMs, 2000, 'map');
        expect(sentinel.ok).toBe(true);
    });
});

// ─── 컨트랙트 타입 가드 ──────────────────────────────────────────
export const __MAP_CONTRACT_GUARD: MapScenarioContract | null = null;
