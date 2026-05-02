// ── 개발자 빌드-검증 게이트 메시지 SSOT ────────────────────────
// 출처: docs/release/devloop-error-messages.md
// 키 규약: dev.gate.<gate>.<state>.<reason>
// 톤 5계명: 원인→처방 · 수치는 사실 · 경로 절단 금지 · 시는 hint만 · 도메인 키 규약

export const DEV_GATE_STATE = {
    PASS: 0,
    BLOCK: 1,
    WARN: 2,
    ERROR: 3,
} as const;

export type DevGate = 'boot' | 'verify' | 'build' | 'type' | 'runtime';
export type DevState = keyof typeof DEV_GATE_STATE;
export type DevExitCode = (typeof DEV_GATE_STATE)[DevState];

export interface DevGateMessage {
    key: `dev.gate.${DevGate}.${Lowercase<DevState>}.${string}`;
    state: DevState;
    message: { ko: string; en: string };
    hint?: { ko: string; en: string };
    exitCode: DevExitCode;
}

// 게이트별 예산 — measure-boot/verify-core/format-error 가 동일 SSOT 참조
export const DEV_GATE_BUDGET = {
    boot: { coldMs: 12_000, warmMs: 4_000, hmrMs: 800 },
    verify: { totalSec: 300, batMaxSec: 90, saveMaxSec: 30, mapMaxSec: 60 },
    build: { totalSec: 60, bundleKb: 2_000 },
    type: { errors: 0 },
    runtime: { unhandled: 0 },
} as const;

// 누적 WARN 허용치 (이를 초과하면 BLOCK 승격)
export const DEV_GATE_WARN_TREND_MAX: Record<DevGate, number> = {
    boot: 5,
    verify: 3,
    build: 5,
    type: 5,
    runtime: 5,
};

// ── 카피 SSOT 미러 (정본은 docs/release/devloop-error-messages.md) ─────
// 본 ts는 코드 import용 thin mirror. 카피 변경은 반드시 .md → ts 단방향.
// 26개 키 슬롯 — development 단계에서 .md 본문을 그대로 미러하면 됨.

export const DEV_GATE_MESSAGE_KEYS = [
    // 1. boot
    'dev.gate.boot.pass.ready',
    'dev.gate.boot.block.timeout',
    'dev.gate.boot.block.port_in_use',
    'dev.gate.boot.warn.slow',
    'dev.gate.boot.warn.hmr_lag',
    'dev.gate.boot.error.crash',
    // 2. verify
    'dev.gate.verify.pass.all',
    'dev.gate.verify.block.battle_atb',
    'dev.gate.verify.block.save_diff',
    'dev.gate.verify.block.map_portal',
    'dev.gate.verify.warn.over_budget',
    'dev.gate.verify.warn.flaky',
    'dev.gate.verify.error.runner',
    // 3. build
    'dev.gate.build.pass.bundle',
    'dev.gate.build.block.import',
    'dev.gate.build.block.bundle_size',
    'dev.gate.build.warn.dynamic_import',
    'dev.gate.build.error.oom',
    // 4. type
    'dev.gate.type.pass.zero',
    'dev.gate.type.block.error',
    'dev.gate.type.warn.any',
    'dev.gate.type.error.config',
    // 5. runtime
    'dev.gate.runtime.pass.clean',
    'dev.gate.runtime.block.uncaught',
    'dev.gate.runtime.warn.console_error',
    'dev.gate.runtime.error.devtool',
] as const;

export type DevGateMessageKey = (typeof DEV_GATE_MESSAGE_KEYS)[number];

// development 단계에서 채울 카피 본문 SSOT 미러 (.md §1~§5)
// stub 단계: 빈 객체 — type-safe 접근만 보장. PR 차수에 카피 16~26 슬롯 미러.
export const DEV_GATE_MESSAGES: Partial<Record<DevGateMessageKey, DevGateMessage>> = {
    // TODO(development): docs/release/devloop-error-messages.md §1~§5 미러.
    // 26개 키 모두 채울 것. ko/en 동시. hint는 옵셔널.
};

// ── 헬퍼 시그니처 (구현은 development 단계) ────────────────────────────

/**
 * 메시지 키와 파라미터 객체를 받아 ko/en 카피를 보간.
 * @example interpolate('dev.gate.boot.block.timeout', { elapsed: 13400, file: 'vite.config.ts' })
 */
export declare function interpolate(
    key: DevGateMessageKey,
    params: Record<string, string | number>,
    locale?: 'ko' | 'en',
): string;

/**
 * 게이트 결과를 표준 1줄로 직렬화. measure-boot/verify-core/format-error 공통 emit().
 */
export declare function formatGateLine(
    key: DevGateMessageKey,
    state: DevState,
    body: string,
    hint?: string,
): string;

/**
 * 게이트 결과를 누적 추세 파일(.ac/<gate>-trend.json)에 기록.
 * 7일 슬라이딩 윈도우 + 최근 30건 보존.
 */
export declare function recordTrend(
    gate: DevGate,
    entry: { at: number; ok: boolean; elapsed?: number; key?: DevGateMessageKey },
): void;

/**
 * WARN 누적이 DEV_GATE_WARN_TREND_MAX를 넘었는지 판정 → BLOCK 승격 여부.
 */
export declare function shouldEscalate(gate: DevGate, recentWarnCount: number): boolean;
