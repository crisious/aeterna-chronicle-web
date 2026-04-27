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
