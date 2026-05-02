// ── dev-probe — verify 게이트 자동화 hook stub ─────────────────────
// 단계: assets (시그니처만). 구현은 development.
// 목적: scripts/dev-cycle/verify-core.mjs 가 게임 상태를 직접 조회·조작하여
//       battle/save/map 3시나리오를 5분 안에 결정적(deterministic)으로 검증.
// 게이트: dev.gate.verify.*
// 노출 조건: import.meta.env.DEV === true 일 때만 window.__AC_PROBE__ 부착.
// 보안: production 빌드에서는 tree-shake 대상 (NODE_ENV !== 'production' 가드).

import type { DevGateMessageKey } from '../constants/dev_gate_messages';

// ── 시나리오 입력/출력 컨트랙트 ─────────────────────────────────

export interface BattleProbeInput {
    /** 시나리오 시드 — 동일 시드 = 동일 결과 (deterministic) */
    seed: number;
    /** 적 ID (data/monsters.json) */
    enemyId: string;
    /** 파티 레벨 — 미지정 시 챕터 기본값 */
    partyLevel?: number;
    /** ATB 가속 배수 (1~10) — 검증 시간 단축용 */
    atbSpeed?: number;
}

export interface BattleProbeOutput {
    /** 전투 종료까지 ATB tick 수 */
    ticks: number;
    /** 승패 */
    result: 'win' | 'lose' | 'flee';
    /** 파티 잔여 HP 비율 (0~1) */
    partyHpRatio: number;
    /** 데미지 로그 첫 5건 (회귀 진단용) */
    damageLog: Array<{ from: string; to: string; amount: number; turn: number }>;
}

export interface SaveProbeInput {
    /** 저장 슬롯 (1~10) */
    slot: number;
    /** 저장 직전에 적용할 상태 패치 (옵셔널) */
    statePatch?: Record<string, unknown>;
}

export interface SaveProbeOutput {
    /** 저장 → 로드 round-trip 성공 여부 */
    ok: boolean;
    /** 저장된 페이로드 SHA-256 */
    payloadHash: string;
    /** 저장 → 로드 직후 상태 diff (없어야 PASS) */
    diff: Array<{ path: string; before: unknown; after: unknown }>;
    /** 마이그레이션 적용 횟수 (스키마 변경 회귀 감지) */
    migrationsApplied: number;
}

export interface MapProbeInput {
    /** 출발 맵 ID */
    fromMap: string;
    /** 목적지 맵 ID */
    toMap: string;
    /** 사용할 portal/transition ID */
    portalId: string;
}

export interface MapProbeOutput {
    /** 전환 성공 여부 */
    ok: boolean;
    /** 전환 소요 시간 (ms) — fade in/out 포함 */
    transitionMs: number;
    /** 도착 맵의 플레이어 좌표 (검증용) */
    arrivalPos: { x: number; y: number };
    /** 도착 맵 BGM ID — null = 음악 미로드 */
    bgmId: string | null;
}

// ── 통합 probe 시그니처 ─────────────────────────────────────────

export interface DevProbe {
    /** 현재 활성 씬 키 */
    activeSceneKey(): string;

    /** 1) 전투 시나리오 — battle 게이트 */
    runBattle(input: BattleProbeInput): Promise<BattleProbeOutput>;

    /** 2) 세이브 round-trip — save 게이트 */
    runSaveRoundTrip(input: SaveProbeInput): Promise<SaveProbeOutput>;

    /** 3) 맵 이동 — map 게이트 */
    runMapTransition(input: MapProbeInput): Promise<MapProbeOutput>;

    /**
     * 게임 시간을 N 프레임만큼 강제 진행 (vitest fake timer 보조).
     * 실 시간 기다림 대신 ATB/애니메이션 step 강제 → 시나리오 90s → 5s 단축.
     */
    advanceFrames(frames: number): Promise<void>;

    /** 디버그 상태 dump — verify 게이트 실패 시 첨부될 진단 페이로드 */
    snapshot(): {
        scene: string;
        partyHp: number[];
        currentMap: string;
        saveSlotInUse: number | null;
    };

    /** 게이트 결과를 게임 측에서도 추적 (HUD 오버레이용 — 옵셔널) */
    reportGateResult(key: DevGateMessageKey, ok: boolean): void;
}

// ── window 노출 ──────────────────────────────────────────────────

declare global {
    interface Window {
        /** dev/test 빌드에서만 정의됨. production에서 undefined 보장. */
        __AC_PROBE__?: DevProbe;
    }
}

/**
 * dev-probe를 window에 부착.
 * - import.meta.env.DEV 또는 import.meta.env.MODE === 'test' 일 때만 동작.
 * - production 빌드에서는 no-op (tree-shake 대상).
 *
 * 사용처: client/src/main.ts (Phaser game 부팅 후 1회 호출)
 */
export declare function installDevProbe(game: unknown): void;

/**
 * dev-probe 제거 — 테스트 cleanup 또는 HMR 갱신 시.
 */
export declare function uninstallDevProbe(): void;
