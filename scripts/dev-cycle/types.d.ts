// ── dev-cycle 게이트 공통 타입 SSOT ─────────────────────────────
// 출처: client/src/constants/dev_gate_messages.ts
// 사용처: measure-boot.mjs / verify-core.mjs / format-error.mjs (JSDoc /** @type {...} */)
// 단계: assets — 시그니처만. 구현은 development.

import type { DevGate, DevState, DevExitCode, DevGateMessageKey } from '../../client/src/constants/dev_gate_messages';

// ── 게이트 결과 ────────────────────────────────────────────────

export interface GateResult {
    /** 게이트 종류 */
    gate: DevGate;
    /** 메시지 키 (dev.gate.*) */
    key: DevGateMessageKey;
    /** 종료 상태 */
    state: DevState;
    /** 종료 코드 (0~3) */
    exitCode: DevExitCode;
    /** 측정 소요 시간 (밀리초) */
    elapsedMs?: number;
    /** 파라미터 보간용 데이터 */
    params?: Record<string, string | number>;
}

// ── 부팅 측정 ──────────────────────────────────────────────────

export interface BootMeasureOptions {
    /** 'cold' = .vite 캐시 제거 후 측정, 'warm' = 캐시 유지 */
    mode: 'cold' | 'warm';
    /** dev server 포트 (기본 5173) */
    port?: number;
    /** 부팅 신호 정규식 — 기본: /ready in \d+\s*ms|Local:\s+http/ */
    readySignal?: RegExp;
    /** 하드 타임아웃 (기본: budget × 2) */
    hardTimeoutMs?: number;
}

export interface BootMeasureResult extends GateResult {
    gate: 'boot';
    /** 부팅 신호 감지 시각까지 소요 시간 */
    elapsedMs: number;
    /** 하드 타임아웃 발동 여부 */
    timedOut?: boolean;
}

// ── 시나리오 검증 ──────────────────────────────────────────────

export type ScenarioName = 'battle' | 'save' | 'map';

export interface ScenarioRunOptions {
    /** 'all' 또는 단일 시나리오 */
    target: ScenarioName | 'all';
    /** vitest config 경로 */
    vitestConfig?: string;
    /** reporter (기본: 'dot') */
    reporter?: 'dot' | 'verbose' | 'json';
}

export interface ScenarioResult {
    name: ScenarioName;
    ok: boolean;
    /** 초 단위 */
    elapsed: number;
    /** vitest exit code */
    code?: number;
    stdout?: string;
    stderr?: string;
    /** 첫 실패 위치 (실패 시) */
    failure?: ParsedFailure;
}

export interface ParsedFailure {
    /** 실패한 테스트 파일 경로 */
    testFile?: string;
    /** 실패 발생 소스 파일 (상대경로) */
    file?: string;
    line?: number;
    column?: number;
}

// ── 에러 포매팅 (tsc / vite stderr) ──────────────────────────

export type ErrorKind = 'ts' | 'vite' | 'resolve';

export interface ParsedError {
    kind: ErrorKind;
    /** TS 에러 코드 (kind === 'ts') */
    code?: number;
    /** 상대경로 (ROOT 기준) */
    file: string;
    line: number;
    column: number;
    message: string;
    /** 실패 줄 다음의 코드 스니펫 */
    snippet?: string;
    /** kind === 'resolve' 시 import 대상 */
    importName?: string;
}

export interface ErrorFormatOptions {
    gate: 'type' | 'build';
    /** 처방 hint 매핑 — TS 코드 → 사람 말 */
    fixHints?: Record<number, string>;
    /** stdin 원본 통과 여부 (기본 true) */
    passthrough?: boolean;
}

// ── 시나리오 하네스 컨트랙트 (assets 단계 stub) ──────────────
// 사용처: tests/integration/dev-cycle/*.scenario.test.ts + scripts/dev-cycle/scenario-harness.mjs
// Build: 본 인터페이스의 함수 본문만 채우면 됨 — 시그니처는 SSOT.

export interface BattleFixture {
    /** ATB entries (server/src/combat/atb/atbTimeline 의 ATBEntry 타입과 동형) */
    entries: Array<{
        unitId: string;
        gauge: number;
        spd: number;
        ready: boolean;
    }>;
    /** 시작 시각 (createFakeClock().now()) */
    startedAt: number;
}

export interface BattleStepResult {
    /** advanceTick 후 entries 스냅샷 */
    snapshots: BattleFixture['entries'];
    /** 첫 ready === true 인 entry (없으면 null) */
    firstReady: BattleFixture['entries'][number] | null;
    /** 진행에 걸린 모의 시간 (ms) */
    elapsedMs: number;
}

export interface BattleScenarioContract {
    fixture: BattleFixture;
    expected: {
        firstActionUnitId: string;
        budgetMs: 3000;
    };
}

// ─── save ───────────────────────────────────────────────────────

export interface InMemorySaveStorage {
    read: (slotId: string) => string | null;
    write: (slotId: string, payload: string) => void;
    list: () => string[];
    delete: (slotId: string) => void;
    /** 디버그용 — 내부 Map 노출 (테스트 한정) */
    _dump: () => Record<string, string>;
}

export interface SaveFixture {
    slotId: string;
    /** SavePayloadV2 형태 — Build에서 client/src/save/types 임포트 */
    snapshot: Record<string, unknown>;
    storage: InMemorySaveStorage;
}

export interface SaveRoundtripResult {
    /** save() 후 storage에 기록된 직렬화 문자열 */
    serialized: string;
    /** load() 후 applySnapshot에 전달된 객체 */
    restored: Record<string, unknown>;
    /** checksum 검증 통과 여부 */
    checksumOk: boolean;
    elapsedMs: number;
}

export interface SaveScenarioContract {
    fixture: SaveFixture;
    expected: {
        deepEqual: true;
        checksumOk: true;
        budgetMs: 1000;
    };
}

// ─── map ────────────────────────────────────────────────────────

export interface PhaserSceneStub {
    key: string;
    init?: (data?: unknown) => void;
    create?: () => void;
    shutdown?: () => void;
    sys: {
        settings: { active: boolean };
    };
}

export interface PhaserHarness {
    scenes: Map<string, PhaserSceneStub>;
    /** lifecycle 호출 로그 — { sceneKey, hook, at } */
    callLog: Array<{ sceneKey: string; hook: 'init' | 'create' | 'shutdown'; at: number }>;
    getScene: (key: string) => PhaserSceneStub | undefined;
}

export interface SceneSwapResult {
    fromKey: string;
    toKey: string;
    /** 호출 순서 — ['shutdown:from', 'init:to', 'create:to'] 기대 */
    sequence: string[];
    /** 새 scene active 여부 */
    toActive: boolean;
    elapsedMs: number;
}

export interface MapScenarioContract {
    initialScene: string;
    targetScene: string;
    expected: {
        sequence: ['shutdown', 'init', 'create'];
        toActive: true;
        budgetMs: 2000;
    };
}

// ── 추세 파일 (.ac/<gate>-trend.json) ──────────────────────

export interface TrendEntry {
    at: number;
    ok: boolean;
    elapsed?: number;
    key?: DevGateMessageKey;
    mode?: 'cold' | 'warm';
}

export interface TrendFile {
    warns?: TrendEntry[];
    runs?: TrendEntry[];
    /** 7일 슬라이딩 윈도우 */
    windowDays?: number;
    /** 최근 보존 개수 */
    retain?: number;
}
