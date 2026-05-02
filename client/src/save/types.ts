/**
 * Save System — Type Definitions (Stub)
 *
 * 토픽: 세이브·로드 시스템 안정성 검증
 * 단계: Assets — 골격만. 실제 로직은 development 단계.
 *
 * 책임 분리:
 *   types.ts       — 데이터 모양 (이 파일)
 *   schema.ts      — 버전별 스키마 정의·검증
 *   migrations.ts  — v_n → v_{n+1} 변환 함수
 *   integrity.ts   — 체크섬·백업 슬롯
 *   validators.ts  — 로드 시 누락 필드/참조 끊김 탐지
 *   AutoSaveScheduler.ts — 주기·트리거
 *   SaveManager.ts — 외부 API (이 모듈의 정문)
 *
 * SSOT: 세이브 schema 변경 시 본 파일의 SAVE_SCHEMA_VERSION을 올리고,
 *       migrations.ts 에 변환 함수를 추가한다. 다른 곳에서 버전을 추론하지 않는다.
 */

// ─── 스키마 버전 ─────────────────────────────────────────────────────────
/**
 * 현재 세이브 schema 버전.
 * 출시 후 데이터 형태가 바뀔 때마다 +1, 변환은 migrations.ts에 등록.
 */
export const SAVE_SCHEMA_VERSION = 2 as const;
export type SaveSchemaVersion = number;

// ─── 슬롯 정의 ───────────────────────────────────────────────────────────
/**
 * 슬롯 ID. UI 슬롯 3개 + 자동세이브 1개 + 백업 슬롯 N개.
 * 백업 슬롯은 'backup_<n>' 패턴으로 표현 — integrity.ts에서 회전 관리.
 */
export type SaveSlotId =
  | 'slot_1'
  | 'slot_2'
  | 'slot_3'
  | 'autosave'
  | `backup_${number}`;

// ─── 도메인별 페이로드 ─────────────────────────────────────────────────
/** 파티 — 캐릭터 레벨/HP/스킬 진척 */
export interface PartySnapshot {
  members: Array<{
    classId: string;       // 'ether_knight' | 'memorist' | ...
    level: number;
    exp: number;
    hp: number;
    mp: number;
    learnedSkillIds: string[];
  }>;
  formation: string;       // 진형 코드
  leadIndex: number;       // 선두 인덱스 (0~3)
}

/** 인벤토리 — 아이템 ID와 수량 */
export interface InventorySnapshot {
  items: Array<{ itemId: string; quantity: number }>;
  equipped: Record<string, string | null>;  // characterId → itemId
  gold: number;
  etherCrystal: number;
}

/** 시나리오 진척 — 챕터·플래그·선택지 */
export interface ScenarioSnapshot {
  chapterId: string;       // 'ch1' .. 'ch8'
  questFlags: Record<string, boolean | number | string>;
  choiceLog: Array<{ nodeId: string; choiceId: string; tsMs: number }>;
  endingPath: string | null;
}

/** 맵 해금 — 지역·세이브 포인트·이동 가능 여부 */
export interface MapSnapshot {
  unlockedZoneIds: string[];
  visitedNodeIds: string[];
  currentZoneId: string;
  currentNodeId: string;
}

// ─── 메타데이터 ───────────────────────────────────────────────────────────
/**
 * 세이브 헤더 — 페이로드와 분리해 빠른 슬롯 미리보기 용도로 사용.
 * 손상되면 페이로드 파싱조차 시도 않는다 (integrity.ts 가드).
 */
export interface SaveHeader {
  schemaVersion: SaveSchemaVersion;
  slotId: SaveSlotId;
  savedAtMs: number;
  playtimeSec: number;
  appVersion: string;       // package.json version 미러
  checksum: string;         // payload SHA-256 hex (integrity.ts에서 계산)
  /** 마지막 저장 트리거 — autosave 디버깅용 */
  trigger: SaveTriggerKind;
}

// ─── 전체 세이브 봉투 ─────────────────────────────────────────────────────
/**
 * 디스크/localStorage에 저장되는 최종 봉투.
 * { header, payload } 분리 구조로 헤더만 빠르게 읽고 페이로드는 lazy 로드 가능.
 */
export interface SaveEnvelope {
  header: SaveHeader;
  payload: SavePayloadV2;
}

// ─── 버전별 페이로드 ─────────────────────────────────────────────────────
/**
 * v1 — 출시 직전 베타 단계의 형태. 마이그레이션 입구로만 사용.
 * 새 코드는 V2 이상만 다룬다.
 */
export interface SavePayloadV1 {
  party: PartySnapshot;
  inventory: InventorySnapshot;
  scenario: ScenarioSnapshot;
  // v1에는 mapSnapshot 부재 — v2 마이그레이션 시 기본값 주입
}

/**
 * v2 — 현재 정본. 맵 해금 추가.
 * 신규 필드는 절대 optional로 두지 않고, 마이그레이션에서 강제 주입.
 */
export interface SavePayloadV2 {
  party: PartySnapshot;
  inventory: InventorySnapshot;
  scenario: ScenarioSnapshot;
  map: MapSnapshot;
}

// ─── 자동 세이브 트리거 ─────────────────────────────────────────────────
export type SaveTriggerKind =
  | 'manual'           // 사용자 명시 저장
  | 'autosave_timer'   // N분 주기
  | 'zone_enter'       // 지역 진입
  | 'boss_clear'       // 보스 처치 직후
  | 'chapter_advance'  // 챕터 전환
  | 'app_pause'        // visibilitychange:hidden
  | 'pre_quit';        // beforeunload

// ─── 결과 타입 ───────────────────────────────────────────────────────────
/** 저장/로드/검증 결과를 단일 형태로 반환 — 호출 측에서 if(ok) 분기 */
export type SaveResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: SaveError };

export interface SaveError {
  code: SaveErrorCode;
  /** 사용자 노출 ko 카피 — i18n 키와 매핑 가능 */
  messageKo: string;
  /** 디버그용 상세 (PII 금지) */
  detail?: string;
  cause?: unknown;
}

export type SaveErrorCode =
  | 'STORAGE_UNAVAILABLE'
  | 'QUOTA_EXCEEDED'
  | 'CHECKSUM_MISMATCH'
  | 'SCHEMA_UNKNOWN_VERSION'
  | 'MIGRATION_FAILED'
  | 'VALIDATION_FAILED'
  | 'PAYLOAD_PARSE_ERROR'
  | 'BACKUP_RESTORE_FAILED'
  | 'INTERNAL';
