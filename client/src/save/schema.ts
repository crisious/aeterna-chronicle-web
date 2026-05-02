/**
 * Save System — Schema Definitions
 *
 * 책임: 버전별 페이로드의 형태 검증·기본값 정의.
 *
 * 검의 날이 무뎌지면 사람이 다칩니다 — 가드는 strict, 누락은 즉시 false.
 */

import type {
  SavePayloadV1,
  SavePayloadV2,
  SaveSchemaVersion,
  PartySnapshot,
  InventorySnapshot,
  ScenarioSnapshot,
  MapSnapshot,
} from './types';

// ─── 알려진 버전 집합 ──────────────────────────────────────────────────
export const KNOWN_SAVE_VERSIONS: ReadonlyArray<SaveSchemaVersion> = [1, 2];

/** 현재 로드 가능한 최저 버전 — 이보다 낮으면 "지원 종료" 처리 */
export const MIN_SUPPORTED_VERSION: SaveSchemaVersion = 1;

// ─── 기본값 ─────────────────────────────────────────────────────────────
export const DEFAULT_PARTY: PartySnapshot = {
  members: [],
  formation: 'standard',
  leadIndex: 0,
};

export const DEFAULT_INVENTORY: InventorySnapshot = {
  items: [],
  equipped: {},
  gold: 0,
  etherCrystal: 0,
};

export const DEFAULT_SCENARIO: ScenarioSnapshot = {
  chapterId: 'ch1',
  questFlags: {},
  choiceLog: [],
  endingPath: null,
};

export const DEFAULT_MAP: MapSnapshot = {
  unlockedZoneIds: ['erebos'],
  visitedNodeIds: [],
  currentZoneId: 'erebos',
  currentNodeId: 'erebos_start',
};

// ─── 내부 가드 헬퍼 ─────────────────────────────────────────────────────
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString);
}

function isPartySnapshot(v: unknown): v is PartySnapshot {
  if (!isObject(v)) return false;
  const { members, formation, leadIndex } = v;
  if (!Array.isArray(members)) return false;
  for (const m of members) {
    if (!isObject(m)) return false;
    if (!isString(m['classId'])) return false;
    if (!isFiniteNumber(m['level'])) return false;
    if (!isFiniteNumber(m['exp'])) return false;
    if (!isFiniteNumber(m['hp'])) return false;
    if (!isFiniteNumber(m['mp'])) return false;
    if (!isStringArray(m['learnedSkillIds'])) return false;
  }
  if (!isString(formation)) return false;
  if (!isFiniteNumber(leadIndex)) return false;
  return true;
}

function isInventorySnapshot(v: unknown): v is InventorySnapshot {
  if (!isObject(v)) return false;
  const { items, equipped, gold, etherCrystal } = v;
  if (!Array.isArray(items)) return false;
  for (const it of items) {
    if (!isObject(it)) return false;
    if (!isString(it['itemId'])) return false;
    if (!isFiniteNumber(it['quantity'])) return false;
  }
  if (!isObject(equipped)) return false;
  for (const k of Object.keys(equipped)) {
    const val = (equipped as Record<string, unknown>)[k];
    if (val !== null && !isString(val)) return false;
  }
  if (!isFiniteNumber(gold)) return false;
  if (!isFiniteNumber(etherCrystal)) return false;
  return true;
}

function isScenarioSnapshot(v: unknown): v is ScenarioSnapshot {
  if (!isObject(v)) return false;
  const { chapterId, questFlags, choiceLog, endingPath } = v;
  if (!isString(chapterId)) return false;
  if (!isObject(questFlags)) return false;
  if (!Array.isArray(choiceLog)) return false;
  for (const c of choiceLog) {
    if (!isObject(c)) return false;
    if (!isString(c['nodeId'])) return false;
    if (!isString(c['choiceId'])) return false;
    if (!isFiniteNumber(c['tsMs'])) return false;
  }
  if (endingPath !== null && !isString(endingPath)) return false;
  return true;
}

function isMapSnapshot(v: unknown): v is MapSnapshot {
  if (!isObject(v)) return false;
  const { unlockedZoneIds, visitedNodeIds, currentZoneId, currentNodeId } = v;
  if (!isStringArray(unlockedZoneIds)) return false;
  if (!isStringArray(visitedNodeIds)) return false;
  if (!isString(currentZoneId)) return false;
  if (!isString(currentNodeId)) return false;
  return true;
}

// ─── 스키마 가드 ────────────────────────────────────────────────────────
export function isSavePayloadV1(value: unknown): value is SavePayloadV1 {
  if (!isObject(value)) return false;
  return (
    isPartySnapshot(value['party']) &&
    isInventorySnapshot(value['inventory']) &&
    isScenarioSnapshot(value['scenario'])
  );
}

export function isSavePayloadV2(value: unknown): value is SavePayloadV2 {
  if (!isSavePayloadV1(value)) return false;
  return isMapSnapshot((value as unknown as Record<string, unknown>)['map']);
}

/**
 * 스키마 버전 추출. 헤더 검증 전 raw 객체에서 버전만 안전 추출.
 * 추출 실패 시 null.
 */
export function extractSchemaVersion(raw: unknown): SaveSchemaVersion | null {
  if (!isObject(raw)) return null;
  const header = raw['header'];
  if (!isObject(header)) return null;
  const ver = header['schemaVersion'];
  if (!isFiniteNumber(ver) || !Number.isInteger(ver) || ver < 1) return null;
  return ver as SaveSchemaVersion;
}
