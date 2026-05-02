/**
 * Save System — Barrel Export
 *
 * 외부는 본 파일에서만 import:
 *   import { SaveManager, SAVE_SCHEMA_VERSION } from '@/save';
 *
 * 내부 모듈끼리는 직접 경로 import (순환 회피).
 */

export { SaveManager } from './SaveManager';
export type { SaveManagerDeps, SaveTelemetryEvent } from './SaveManager';

export { AutoSaveScheduler, DEFAULT_AUTOSAVE_INTERVAL_MS } from './AutoSaveScheduler';
export type { AutoSaveContext } from './AutoSaveScheduler';

export {
  SAVE_SCHEMA_VERSION,
} from './types';
export type {
  SaveSchemaVersion,
  SaveSlotId,
  SaveEnvelope,
  SaveHeader,
  SavePayloadV1,
  SavePayloadV2,
  SaveResult,
  SaveError,
  SaveErrorCode,
  SaveTriggerKind,
  PartySnapshot,
  InventorySnapshot,
  ScenarioSnapshot,
  MapSnapshot,
} from './types';

export {
  KNOWN_SAVE_VERSIONS,
  MIN_SUPPORTED_VERSION,
  DEFAULT_PARTY,
  DEFAULT_INVENTORY,
  DEFAULT_SCENARIO,
  DEFAULT_MAP,
} from './schema';

export {
  BACKUP_SLOT_COUNT,
  CHECKSUM_ALGO,
} from './integrity';
export type { SaveStorageAdapter } from './integrity';

export type { ValidationReport, ValidationIssue } from './validators';
