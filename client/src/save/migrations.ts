/**
 * Save System — Migrations
 *
 * 책임: 구 버전 페이로드를 최신 버전으로 변환.
 * 정책:
 *   - 변환 함수는 v_n → v_{n+1} 한 단계만 담당. 다단계는 디스패처가 체이닝.
 *   - 신규 필드는 schema.ts의 DEFAULT_* 에서 주입 — 임의 값 금지.
 *   - 변환 실패 시 throw 하지 않고 SaveResult 로 반환.
 */

import type {
  SavePayloadV1,
  SavePayloadV2,
  SaveResult,
  SaveSchemaVersion,
  MapSnapshot,
} from './types';
import { SAVE_SCHEMA_VERSION } from './types';
import {
  DEFAULT_MAP,
  isSavePayloadV1,
  isSavePayloadV2,
  KNOWN_SAVE_VERSIONS,
} from './schema';

// ─── 챕터 → 해금 지역 추론 표 ──────────────────────────────────────────
/**
 * v1 데이터에는 map이 없으므로 scenario.chapterId 기반으로 합리적 기본 해금을 추론.
 * 보수적: 이미 진행한 지역만 해금 — 과도한 노출은 스포일러.
 */
const CHAPTER_UNLOCKS: Record<string, string[]> = {
  ch1: ['erebos'],
  ch2: ['erebos', 'silvanheim'],
  ch3: ['erebos', 'silvanheim', 'solaris', 'britalia'],
  ch4: ['erebos', 'silvanheim', 'solaris', 'britalia', 'argentium', 'eternal_glacier'],
  ch5: ['erebos', 'silvanheim', 'solaris', 'britalia', 'argentium', 'eternal_glacier', 'oblivion_plateau'],
  ch6: ['erebos', 'silvanheim', 'solaris', 'britalia', 'argentium', 'eternal_glacier', 'oblivion_plateau', 'mist_sea'],
  ch7: ['erebos', 'silvanheim', 'solaris', 'britalia', 'argentium', 'eternal_glacier', 'oblivion_plateau', 'mist_sea', 'memory_abyss'],
  ch8: ['erebos', 'silvanheim', 'solaris', 'britalia', 'argentium', 'eternal_glacier', 'oblivion_plateau', 'mist_sea', 'memory_abyss', 'time_rift'],
};

const ZONE_START_NODE: Record<string, string> = {
  erebos: 'erebos_start',
  silvanheim: 'silvanheim_entrance',
  solaris: 'solaris_oasis',
  argentium: 'argentium_gate',
  eternal_glacier: 'glacier_camp',
  britalia: 'britalia_dock',
  oblivion_plateau: 'plateau_path',
  mist_sea: 'mist_harbor',
  memory_abyss: 'abyss_descent',
  time_rift: 'rift_entrance',
};

// ─── 단계별 마이그레이션 ────────────────────────────────────────────────
/**
 * v1 → v2 — map 필드 추가.
 *
 * 추론 규칙:
 *   1) chapterId가 표에 있으면 그 시점까지 해금된 지역들을 unlocked에 주입.
 *   2) 없으면 DEFAULT_MAP 그대로 (가장 보수적).
 *   3) currentZoneId/currentNodeId는 마지막 해금 지역의 시작 노드.
 *      게임 시작 직후 시나리오 매니저가 정확한 위치로 보정.
 */
export function migrateV1ToV2(v1: SavePayloadV1): SaveResult<SavePayloadV2> {
  if (!isSavePayloadV1(v1)) {
    return {
      ok: false,
      error: {
        code: 'MIGRATION_FAILED',
        messageKo: 'v1 페이로드 형식이 아닙니다.',
      },
    };
  }
  try {
    const chapterId = v1.scenario.chapterId;
    const unlocked = CHAPTER_UNLOCKS[chapterId];
    let map: MapSnapshot;
    if (unlocked && unlocked.length > 0) {
      const lastZone = unlocked[unlocked.length - 1];
      map = {
        unlockedZoneIds: [...unlocked],
        visitedNodeIds: [],
        currentZoneId: lastZone,
        currentNodeId: ZONE_START_NODE[lastZone] ?? `${lastZone}_start`,
      };
    } else {
      map = {
        unlockedZoneIds: [...DEFAULT_MAP.unlockedZoneIds],
        visitedNodeIds: [...DEFAULT_MAP.visitedNodeIds],
        currentZoneId: DEFAULT_MAP.currentZoneId,
        currentNodeId: DEFAULT_MAP.currentNodeId,
      };
    }
    const v2: SavePayloadV2 = {
      party: v1.party,
      inventory: v1.inventory,
      scenario: v1.scenario,
      map,
    };
    return { ok: true, value: v2 };
  } catch (cause) {
    return {
      ok: false,
      error: {
        code: 'MIGRATION_FAILED',
        messageKo: 'v1→v2 변환 중 오류가 발생했습니다.',
        cause,
      },
    };
  }
}

// ─── 디스패처 ────────────────────────────────────────────────────────────
/**
 * 임의 버전의 페이로드를 최신(SAVE_SCHEMA_VERSION)까지 끌어올린다.
 * 알려지지 않은 버전 또는 형태 불일치는 SCHEMA_UNKNOWN_VERSION.
 */
export function migrateToLatest(
  fromVersion: SaveSchemaVersion,
  payload: unknown,
): SaveResult<SavePayloadV2> {
  if (!KNOWN_SAVE_VERSIONS.includes(fromVersion)) {
    return {
      ok: false,
      error: {
        code: 'SCHEMA_UNKNOWN_VERSION',
        messageKo: `지원되지 않는 세이브 버전입니다 (v${fromVersion}).`,
      },
    };
  }

  // v2 — identity (이미 최신)
  if (fromVersion === SAVE_SCHEMA_VERSION) {
    if (!isSavePayloadV2(payload)) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          messageKo: '세이브 데이터 형식이 손상되었습니다.',
        },
      };
    }
    return { ok: true, value: payload };
  }

  // v1 → v2
  if (fromVersion === 1) {
    if (!isSavePayloadV1(payload)) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          messageKo: 'v1 세이브 데이터 형식이 손상되었습니다.',
        },
      };
    }
    return migrateV1ToV2(payload);
  }

  return {
    ok: false,
    error: {
      code: 'SCHEMA_UNKNOWN_VERSION',
      messageKo: `버전 v${fromVersion} → v${SAVE_SCHEMA_VERSION} 경로 미정의.`,
    },
  };
}

// ─── 마이그레이션 레지스트리 (확장용) ────────────────────────────────────
export interface MigrationStep<From, To> {
  from: SaveSchemaVersion;
  to: SaveSchemaVersion;
  apply: (payload: From) => SaveResult<To>;
}

export const MIGRATION_REGISTRY: ReadonlyArray<MigrationStep<unknown, unknown>> = [
  {
    from: 1,
    to: 2,
    apply: (p: unknown) => migrateV1ToV2(p as SavePayloadV1) as SaveResult<unknown>,
  },
];
