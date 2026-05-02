// ── dev-cycle 시나리오 공통 하네스 — Build 단계 (계섬월) ────────
// 단계: Build — 본문 구현. 결정론적 in-memory, 외부 의존 차단.
// 사용처: tests/integration/dev-cycle/{battle,save,map}.scenario.test.ts
//
// 본 모듈의 약속:
//   1) 3 시나리오가 공유하는 mock factory를 한 곳에 모음
//   2) 각 시나리오는 fixture builder + 1단계 액션 + assertion sentinel만 호출
//   3) 외부 의존성 (socket.io / fetch / localStorage / Phaser) 일체 차단
//   4) 단일 실행 ≤ 60초 (실제로는 ms 단위로 끝남 — 결정론적 in-memory)
//
// 검의 날이 무뎌지면 사람이 다칩니다 — 한 번에 한 일만 정확히.

// ─── 공통 ────────────────────────────────────────────────────────

/**
 * 결정론적 시간 source (Date.now 대체).
 * 클로저로 mutable now 보관, advance(ms) 호출 시 증가.
 *
 * @returns {{ now: () => number, advance: (ms: number) => void }}
 */
export function createFakeClock() {
    let _now = 0;
    return {
        now: () => _now,
        advance: (ms) => {
            if (typeof ms !== 'number' || ms < 0) {
                throw new Error(`createFakeClock.advance: invalid ms=${ms}`);
            }
            _now += ms;
        },
    };
}

/**
 * 인메모리 telemetry sink — emitTelemetry 호출 capture.
 *
 * @returns {{ events: Array<{ type: string; payload: unknown }>, emit: (e: unknown) => void }}
 */
export function createTelemetrySink() {
    const events = [];
    return {
        events,
        emit: (e) => {
            // 정규화 — { type, payload } 형태로 강제
            if (e && typeof e === 'object' && 'type' in e) {
                events.push({ type: e.type, payload: e.payload ?? null });
            } else {
                events.push({ type: 'unknown', payload: e });
            }
        },
    };
}

// ─── battle 시나리오 ─────────────────────────────────────────────

// ATB 상수 — server/src/combat/atb 와 동형 (verify-only 슬라이스)
export const ATB_MAX = 1000;
export const ATB_BASE_CHARGE_PER_SEC = 100; // 10초 만에 가득

/**
 * 전투 fixture — 파티 1인(SPD 120) + 적 1체(SPD 80) + 게이지 0.
 *
 * @returns {import('./types').BattleFixture}
 */
export function buildBattleFixture() {
    return {
        entries: [
            { unitId: 'party-1', gauge: 0, spd: 120, ready: false },
            { unitId: 'enemy-1', gauge: 0, spd: 80, ready: false },
        ],
        startedAt: 0,
    };
}

/**
 * 전투 1턴 진행 — 가장 빠른 entry가 ATB_MAX에 도달할 때까지 충전.
 * SPD가 높은 쪽이 먼저 ready === true.
 *
 * @param {import('./types').BattleFixture} fx
 * @param {{ ticks?: number; dtSec?: number }} [opts]
 * @returns {import('./types').BattleStepResult}
 */
export function advanceOneBattleTurn(fx, opts = {}) {
    if (!fx || !Array.isArray(fx.entries)) {
        throw new Error('advanceOneBattleTurn: invalid fixture');
    }
    // 가장 빠른 SPD 기준 도달 시간 산출 (ms)
    const fastest = fx.entries.reduce((a, b) => (b.spd > a.spd ? b : a));
    const chargePerSec = ATB_BASE_CHARGE_PER_SEC * (fastest.spd / 100);
    const secsToReady = ATB_MAX / chargePerSec;
    const dtSec = opts.dtSec ?? secsToReady;
    const ticks = opts.ticks ?? 1;
    const totalSec = dtSec * ticks;

    const snapshots = fx.entries.map((e) => {
        const charge = ATB_BASE_CHARGE_PER_SEC * (e.spd / 100) * totalSec;
        const gauge = Math.min(ATB_MAX, e.gauge + charge);
        return { ...e, gauge, ready: gauge >= ATB_MAX };
    });
    const firstReady = snapshots.find((s) => s.ready) ?? null;
    return {
        snapshots,
        firstReady,
        elapsedMs: Math.round(totalSec * 1000),
    };
}

// ─── save 시나리오 ───────────────────────────────────────────────

/**
 * 인메모리 SaveStorageAdapter — localStorage 흉내.
 * Map<slotId, string> backing.
 *
 * @returns {import('./types').InMemorySaveStorage}
 */
export function createInMemorySaveStorage() {
    const backing = new Map();
    return {
        read: (slotId) => backing.get(slotId) ?? null,
        write: (slotId, payload) => {
            if (typeof payload !== 'string') {
                throw new Error('SaveStorage.write: payload must be string');
            }
            backing.set(slotId, payload);
        },
        list: () => [...backing.keys()],
        delete: (slotId) => {
            backing.delete(slotId);
        },
        _dump: () => Object.fromEntries(backing),
    };
}

// FNV-1a 32bit — 결정론적 checksum (의존성 없음)
function checksumOf(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

const SAVE_SCHEMA_VERSION = 2;

/**
 * 세이브 라운드트립 1회 — save → load → applySnapshot 호출값 반환.
 *
 * @param {import('./types').SaveFixture} fx
 * @returns {import('./types').SaveRoundtripResult}
 */
export function runSaveRoundtrip(fx) {
    if (!fx || !fx.storage || !fx.snapshot) {
        throw new Error('runSaveRoundtrip: invalid fixture');
    }
    const t0 = performance.now();

    // 직렬화 — schemaVersion + checksum 헤더 포함
    const body = JSON.stringify(fx.snapshot);
    const envelope = {
        schemaVersion: SAVE_SCHEMA_VERSION,
        checksum: checksumOf(body),
        body,
    };
    const serialized = JSON.stringify(envelope);
    fx.storage.write(fx.slotId, serialized);

    // 역직렬화 — checksum 검증 + body 파싱
    const loaded = fx.storage.read(fx.slotId);
    if (loaded == null) throw new Error('runSaveRoundtrip: slot not found after write');
    const parsed = JSON.parse(loaded);
    const checksumOk =
        parsed.schemaVersion === SAVE_SCHEMA_VERSION &&
        parsed.checksum === checksumOf(parsed.body);
    const restored = JSON.parse(parsed.body);

    return {
        serialized,
        restored,
        checksumOk,
        elapsedMs: performance.now() - t0,
    };
}

// ─── map 시나리오 ────────────────────────────────────────────────

/**
 * Phaser.Game / Scene mock — node 환경에서 lifecycle만 시뮬레이션.
 *
 * @param {{ scenes: Array<{ key: string; init?: (data?: unknown) => void; create?: () => void; shutdown?: () => void }> }} cfg
 * @returns {import('./types').PhaserHarness}
 */
export function buildPhaserHarness(cfg) {
    if (!cfg || !Array.isArray(cfg.scenes)) {
        throw new Error('buildPhaserHarness: cfg.scenes must be array');
    }
    const scenes = new Map();
    const callLog = [];
    let tick = 0;

    for (const def of cfg.scenes) {
        if (!def.key) throw new Error('buildPhaserHarness: scene missing key');
        const stub = {
            key: def.key,
            sys: { settings: { active: false } },
            init: (data) => {
                callLog.push({ sceneKey: def.key, hook: 'init', at: ++tick });
                def.init?.(data);
            },
            create: () => {
                callLog.push({ sceneKey: def.key, hook: 'create', at: ++tick });
                def.create?.();
            },
            shutdown: () => {
                callLog.push({ sceneKey: def.key, hook: 'shutdown', at: ++tick });
                def.shutdown?.();
            },
        };
        scenes.set(def.key, stub);
    }
    return {
        scenes,
        callLog,
        getScene: (key) => scenes.get(key),
    };
}

/**
 * Scene 1회 swap — shutdown(from) → init(to) → create(to) 동기 호출.
 *
 * @param {import('./types').PhaserHarness} harness
 * @param {{ from: string; to: string; payload?: unknown }} req
 * @returns {import('./types').SceneSwapResult}
 */
export function swapScene(harness, req) {
    const t0 = performance.now();
    const from = harness.getScene(req.from);
    const to = harness.getScene(req.to);
    if (!from) throw new Error(`swapScene: 'from' scene missing — ${req.from}`);
    if (!to) throw new Error(`swapScene: 'to' scene missing — ${req.to}`);

    const sequence = [];
    from.shutdown?.();
    sequence.push(`shutdown:${req.from}`);
    from.sys.settings.active = false;

    to.init?.(req.payload);
    sequence.push(`init:${req.to}`);
    to.create?.();
    sequence.push(`create:${req.to}`);
    to.sys.settings.active = true;

    return {
        fromKey: req.from,
        toKey: req.to,
        sequence,
        toActive: to.sys.settings.active,
        elapsedMs: performance.now() - t0,
    };
}

// ─── 공통 assertion sentinel ─────────────────────────────────────

/**
 * 시나리오 elapsed가 예산 이내인지 sentinel.
 * throw 대신 boolean — vitest expect 패턴과 조합 가능.
 *
 * @param {number} elapsedMs
 * @param {number} budgetMs
 * @param {string} scenario
 * @returns {{ ok: boolean; ratio: number; reason?: string }}
 */
export function assertWithinBudget(elapsedMs, budgetMs, scenario) {
    if (typeof elapsedMs !== 'number' || typeof budgetMs !== 'number') {
        throw new Error('assertWithinBudget: numeric args required');
    }
    const ratio = elapsedMs / budgetMs;
    if (elapsedMs > budgetMs) {
        return {
            ok: false,
            ratio,
            reason: `[${scenario}] elapsed ${elapsedMs.toFixed(1)}ms > budget ${budgetMs}ms`,
        };
    }
    return { ok: true, ratio };
}
