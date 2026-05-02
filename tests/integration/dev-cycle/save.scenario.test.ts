/**
 * dev-cycle 시나리오 — save (Phase 54 / v1.0.0-rc.3) — Build 단계
 *
 * verify-core.mjs `--scenario=save` 게이트의 *전용 얇은 happy-path*.
 * 약속: 현재 게임 상태 → save() → load() → deep equal 일치 + checksum OK.
 *
 * 예산: ≤ 1000ms (verify-core BUDGETS.save = 30s 중 1/30).
 */
import { describe, it, expect } from 'vitest';
import {
    assertWithinBudget,
    createInMemorySaveStorage,
    runSaveRoundtrip,
} from '../../../scripts/dev-cycle/scenario-harness.mjs';
import type { SaveScenarioContract } from '../../../scripts/dev-cycle/types';

function buildSnapshot() {
    return {
        slotId: 'slot-1',
        timestamp: 1714540000000,
        player: { id: 'aerian', hp: 480, mp: 220, lv: 12, exp: 4820 },
        party: [
            { id: 'aerian', equipped: { weapon: 'memorial-blade', armor: 'echo-mantle' } },
            { id: 'lukas', equipped: { weapon: 'thorn-staff', armor: null } },
        ],
        flags: { tutorial_done: true, ch1_complete: true, ending_path: 'truth' },
        inventory: [
            { id: 'potion-medium', count: 8 },
            { id: 'fragment-1', count: 1 },
        ],
        worldPos: { sceneKey: 'WorldScene', x: 1280, y: 960 },
    };
}

describe('dev-cycle/save — round-trip happy-path', () => {
    it('snapshot → save → load → applySnapshot 호출값 deep equal', () => {
        const snapshot = buildSnapshot();
        const storage = createInMemorySaveStorage();
        const result = runSaveRoundtrip({ slotId: 'slot-1', snapshot, storage });

        expect(result.restored).toEqual(snapshot);
        expect(storage.list()).toContain('slot-1');
    });

    it('checksum 검증 통과 + schemaVersion === SAVE_SCHEMA_VERSION', () => {
        const snapshot = buildSnapshot();
        const storage = createInMemorySaveStorage();
        const result = runSaveRoundtrip({ slotId: 'slot-1', snapshot, storage });

        expect(result.checksumOk).toBe(true);
        const envelope = JSON.parse(result.serialized);
        expect(envelope.schemaVersion).toBe(2);
        expect(envelope.checksum).toMatch(/^[0-9a-f]{8}$/);
    });

    it('elapsed ≤ 1000ms (예산 sentinel)', () => {
        const snapshot = buildSnapshot();
        const storage = createInMemorySaveStorage();
        const result = runSaveRoundtrip({ slotId: 'slot-1', snapshot, storage });
        const sentinel = assertWithinBudget(result.elapsedMs, 1000, 'save');
        expect(sentinel.ok).toBe(true);
    });
});

// ─── 컨트랙트 타입 가드 ──────────────────────────────────────────
export const __SAVE_CONTRACT_GUARD: SaveScenarioContract | null = null;
