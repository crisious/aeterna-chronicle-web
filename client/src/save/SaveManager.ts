/**
 * Save System — SaveManager
 *
 * 본 모듈의 정문(Façade). 외부는 오직 본 클래스만 접근.
 *
 * 라운드트립 보장:
 *   save  : snapshot → checksum → rotateBackup → write
 *   load  : read → checksum → (실패 시 restoreFromBackup) → migrate → validateAndRepair
 *
 * 의존성 역전:
 *   - storage  : SaveStorageAdapter (localStorage / IndexedDB / 서버)
 *   - clock    : Date.now wrapper (테스트 시 고정)
 *   - telemetry: 검증 경고·복구 알림 송출
 */

import type {
  SaveEnvelope,
  SaveResult,
  SaveSlotId,
  SavePayloadV2,
  SaveTriggerKind,
  SaveHeader,
  SaveError,
} from './types';
import { SAVE_SCHEMA_VERSION } from './types';
import {
  computeChecksum,
  verifyChecksum,
  rotateBackup,
  restoreFromBackup,
  getBackupSlotIds,
  type SaveStorageAdapter,
} from './integrity';
import { extractSchemaVersion } from './schema';
import { migrateToLatest } from './migrations';
import { validateAndRepair, type ValidationReport } from './validators';
import { AutoSaveScheduler } from './AutoSaveScheduler';

// ─── 외부 의존성 ────────────────────────────────────────────────────────
export interface SaveManagerDeps {
  storage: SaveStorageAdapter;
  now: () => number;
  takeSnapshot: () => SavePayloadV2;
  applySnapshot: (payload: SavePayloadV2) => void;
  appVersion: string;
  emitTelemetry?: (event: SaveTelemetryEvent) => void;
  isInBossEncounter: () => boolean;
  isInteractive: () => boolean;
  /** 누적 플레이타임(초) — 헤더 기록용. 미제공 시 0. */
  getPlaytimeSec?: () => number;
}

export type SaveTelemetryEvent =
  | { kind: 'save_ok'; slotId: SaveSlotId; trigger: SaveTriggerKind; durationMs: number }
  | { kind: 'save_fail'; slotId: SaveSlotId; trigger: SaveTriggerKind; errorCode: string }
  | { kind: 'load_ok'; slotId: SaveSlotId; warnings: number; restoredFromBackup: boolean }
  | { kind: 'load_fail'; slotId: SaveSlotId; errorCode: string }
  | { kind: 'backup_restored'; slotId: SaveSlotId; backupAgeMs: number }
  | { kind: 'validation_repair'; slotId: SaveSlotId; warningCount: number };

// ─── SaveManager ────────────────────────────────────────────────────────
export class SaveManager {
  private scheduler: AutoSaveScheduler | null = null;

  constructor(private readonly deps: SaveManagerDeps) {}

  init(): void {
    if (this.scheduler) return;
    this.scheduler = new AutoSaveScheduler({
      performSave: t => this.save('autosave', t),
      isInBossEncounter: this.deps.isInBossEncounter,
      isInteractive: this.deps.isInteractive,
      now: this.deps.now,
    });
    this.scheduler.start();
  }

  dispose(): void {
    if (this.scheduler) {
      this.scheduler.stop();
      this.scheduler = null;
    }
  }

  /** 게임 측에서 외부 트리거 통지 (zone_enter / boss_clear / chapter_advance ...) */
  notify(trigger: SaveTriggerKind): void {
    this.scheduler?.notify(trigger);
  }

  // ─── Public API ──────────────────────────────────────────────────────

  async save(slotId: SaveSlotId, trigger: SaveTriggerKind): Promise<SaveResult<void>> {
    const startMs = this.deps.now();
    try {
      const payload = this.deps.takeSnapshot();
      const envelope = await this.buildEnvelope(payload, slotId, trigger);

      // 백업 회전 (primary 슬롯 한정 — autosave 포함, backup_* 자체는 회전 안 함)
      const rotated = await rotateBackup(slotId, this.deps.storage);
      if (!rotated.ok) {
        // 회전 실패는 경고 — 저장은 시도. 텔레메트리에만 표시.
        this.emit({
          kind: 'save_fail',
          slotId,
          trigger,
          errorCode: rotated.error.code,
        });
      }

      const raw = JSON.stringify(envelope);
      try {
        await this.deps.storage.write(slotId, raw);
      } catch (cause) {
        const err = this.toStorageError(cause);
        this.emit({ kind: 'save_fail', slotId, trigger, errorCode: err.code });
        return { ok: false, error: err };
      }

      this.emit({
        kind: 'save_ok',
        slotId,
        trigger,
        durationMs: this.deps.now() - startMs,
      });
      return { ok: true, value: undefined };
    } catch (cause) {
      const err: SaveError = {
        code: 'INTERNAL',
        messageKo: '저장 중 예상치 못한 오류가 발생했습니다.',
        cause,
      };
      this.emit({ kind: 'save_fail', slotId, trigger, errorCode: err.code });
      return { ok: false, error: err };
    }
  }

  async load(
    slotId: SaveSlotId,
  ): Promise<SaveResult<{ report: ValidationReport; restoredFromBackup: boolean }>> {
    try {
      let envelope = await this.readEnvelope(slotId);
      let restoredFromBackup = false;

      if (!envelope.ok) {
        // 1차 실패 → 백업 복구 시도
        const restored = await restoreFromBackup(slotId, this.deps.storage);
        if (!restored.ok) {
          this.emit({ kind: 'load_fail', slotId, errorCode: restored.error.code });
          return { ok: false, error: restored.error };
        }
        envelope = { ok: true, value: restored.value };
        restoredFromBackup = true;
        const ageMs = Math.max(0, this.deps.now() - restored.value.header.savedAtMs);
        this.emit({ kind: 'backup_restored', slotId, backupAgeMs: ageMs });
      }

      const env = envelope.value;

      // 마이그레이션 — header.schemaVersion 기준
      const fromVersion = env.header.schemaVersion;
      const migrated = migrateToLatest(fromVersion, env.payload);
      if (!migrated.ok) {
        this.emit({ kind: 'load_fail', slotId, errorCode: migrated.error.code });
        return { ok: false, error: migrated.error };
      }

      // 검증·보정
      const validated = validateAndRepair(migrated.value);
      if (!validated.ok) {
        this.emit({ kind: 'load_fail', slotId, errorCode: validated.error.code });
        return { ok: false, error: validated.error };
      }

      const { repaired, report } = validated.value;
      if (report.warnings.length > 0) {
        this.emit({
          kind: 'validation_repair',
          slotId,
          warningCount: report.warnings.length,
        });
      }

      this.deps.applySnapshot(repaired);
      this.emit({
        kind: 'load_ok',
        slotId,
        warnings: report.warnings.length,
        restoredFromBackup,
      });
      return { ok: true, value: { report, restoredFromBackup } };
    } catch (cause) {
      const err: SaveError = {
        code: 'INTERNAL',
        messageKo: '불러오기 중 예상치 못한 오류가 발생했습니다.',
        cause,
      };
      this.emit({ kind: 'load_fail', slotId, errorCode: err.code });
      return { ok: false, error: err };
    }
  }

  async readHeader(slotId: SaveSlotId): Promise<SaveResult<SaveHeader>> {
    try {
      const raw = await this.deps.storage.read(slotId);
      if (raw === null) {
        return {
          ok: false,
          error: {
            code: 'PAYLOAD_PARSE_ERROR',
            messageKo: '슬롯이 비어 있습니다.',
          },
        };
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (cause) {
        return {
          ok: false,
          error: {
            code: 'PAYLOAD_PARSE_ERROR',
            messageKo: '세이브 파일을 읽을 수 없습니다.',
            cause,
          },
        };
      }
      if (!parsed || typeof parsed !== 'object') {
        return {
          ok: false,
          error: { code: 'PAYLOAD_PARSE_ERROR', messageKo: '세이브 파일 형식 오류.' },
        };
      }
      const header = (parsed as { header?: SaveHeader }).header;
      if (!header || typeof header !== 'object') {
        return {
          ok: false,
          error: { code: 'PAYLOAD_PARSE_ERROR', messageKo: '헤더가 손상되었습니다.' },
        };
      }
      return { ok: true, value: header };
    } catch (cause) {
      return {
        ok: false,
        error: { code: 'STORAGE_UNAVAILABLE', messageKo: '저장소 접근 실패.', cause },
      };
    }
  }

  async listHeaders(): Promise<Array<{ slotId: SaveSlotId; header: SaveHeader | null }>> {
    const primaries: SaveSlotId[] = ['slot_1', 'slot_2', 'slot_3', 'autosave'];
    const results = await Promise.all(
      primaries.map(async slotId => {
        const r = await this.readHeader(slotId);
        return { slotId, header: r.ok ? r.value : null };
      }),
    );
    return results;
  }

  async deleteSlot(slotId: SaveSlotId): Promise<SaveResult<void>> {
    try {
      await this.deps.storage.delete(slotId);
      const backups = getBackupSlotIds(slotId);
      for (const b of backups) {
        try {
          await this.deps.storage.delete(b);
        } catch {
          // 백업 삭제 실패는 치명적이지 않음 — 다음 회전에서 덮어씀.
        }
      }
      return { ok: true, value: undefined };
    } catch (cause) {
      return {
        ok: false,
        error: { code: 'STORAGE_UNAVAILABLE', messageKo: '슬롯 삭제 실패.', cause },
      };
    }
  }

  /**
   * 라운드트립 자가검증 — 출시 전 QA 게이트용.
   * snapshot → save → load → 비교. 100% 일치해야 통과.
   *
   * 임시 슬롯(slot_1) 사용 — 호출 측에서 게임 시작 직후, 사용자 데이터 진입 전에만.
   */
  async selfTestRoundTrip(): Promise<SaveResult<{ matches: boolean; diffPaths: string[] }>> {
    const TEST_SLOT: SaveSlotId = 'slot_1';
    let preExisting: string | null = null;
    try {
      // 기존 슬롯 보존
      preExisting = await this.deps.storage.read(TEST_SLOT);

      const original = this.deps.takeSnapshot();
      const originalCopy: SavePayloadV2 = JSON.parse(JSON.stringify(original));

      const saved = await this.save(TEST_SLOT, 'manual');
      if (!saved.ok) return { ok: false, error: saved.error };

      // load는 applySnapshot 부수효과 — 자가검증에서는 envelope만 확인
      const envR = await this.readEnvelope(TEST_SLOT);
      if (!envR.ok) return { ok: false, error: envR.error };
      const migrated = migrateToLatest(envR.value.header.schemaVersion, envR.value.payload);
      if (!migrated.ok) return { ok: false, error: migrated.error };

      const diffPaths = diffPayload(originalCopy, migrated.value);

      return {
        ok: true,
        value: { matches: diffPaths.length === 0, diffPaths },
      };
    } finally {
      // 기존 슬롯 복원
      try {
        if (preExisting === null) {
          await this.deps.storage.delete(TEST_SLOT);
        } else {
          await this.deps.storage.write(TEST_SLOT, preExisting);
        }
      } catch {
        // 복원 실패는 보고만 — 호출자가 별도로 처리 가능.
      }
    }
  }

  // ─── Internal ────────────────────────────────────────────────────────

  private async buildEnvelope(
    payload: SavePayloadV2,
    slotId: SaveSlotId,
    trigger: SaveTriggerKind,
  ): Promise<SaveEnvelope> {
    const checksum = await computeChecksum(payload);
    const playtimeSec = this.deps.getPlaytimeSec ? this.deps.getPlaytimeSec() : 0;
    const header: SaveHeader = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      slotId,
      savedAtMs: this.deps.now(),
      playtimeSec,
      appVersion: this.deps.appVersion,
      checksum,
      trigger,
    };
    return { header, payload };
  }

  private async readEnvelope(slotId: SaveSlotId): Promise<SaveResult<SaveEnvelope>> {
    let raw: string | null;
    try {
      raw = await this.deps.storage.read(slotId);
    } catch (cause) {
      return {
        ok: false,
        error: { code: 'STORAGE_UNAVAILABLE', messageKo: '저장소 접근 실패.', cause },
      };
    }
    if (raw === null) {
      return {
        ok: false,
        error: { code: 'PAYLOAD_PARSE_ERROR', messageKo: '슬롯이 비어 있습니다.' },
      };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (cause) {
      return {
        ok: false,
        error: { code: 'PAYLOAD_PARSE_ERROR', messageKo: '세이브 파일 손상.', cause },
      };
    }
    if (!parsed || typeof parsed !== 'object') {
      return {
        ok: false,
        error: { code: 'PAYLOAD_PARSE_ERROR', messageKo: '세이브 파일 형식 오류.' },
      };
    }
    const env = parsed as SaveEnvelope;
    if (!env.header || !env.payload) {
      return {
        ok: false,
        error: { code: 'PAYLOAD_PARSE_ERROR', messageKo: '봉투 구조 손상.' },
      };
    }
    if (extractSchemaVersion(parsed) === null) {
      return {
        ok: false,
        error: { code: 'SCHEMA_UNKNOWN_VERSION', messageKo: '스키마 버전 추출 실패.' },
      };
    }
    const ok = await verifyChecksum(env);
    if (!ok) {
      return {
        ok: false,
        error: { code: 'CHECKSUM_MISMATCH', messageKo: '체크섬 불일치 — 손상 의심.' },
      };
    }
    return { ok: true, value: env };
  }

  private toStorageError(cause: unknown): SaveError {
    const msg = cause instanceof Error ? cause.message.toLowerCase() : '';
    if (msg.includes('quota') || msg.includes('exceeded')) {
      return {
        code: 'QUOTA_EXCEEDED',
        messageKo: '저장 공간이 부족합니다. 슬롯을 정리해 주세요.',
        cause,
      };
    }
    return {
      code: 'STORAGE_UNAVAILABLE',
      messageKo: '저장소에 접근할 수 없습니다.',
      cause,
    };
  }

  private emit(event: SaveTelemetryEvent): void {
    if (this.deps.emitTelemetry) {
      try {
        this.deps.emitTelemetry(event);
      } catch {
        // 텔레메트리 실패가 저장/로드를 무너뜨리지 않도록 격리.
      }
    }
  }
}

// ─── 라운드트립 비교 ────────────────────────────────────────────────────
/**
 * 두 SavePayloadV2의 깊은 차이 경로 목록을 반환.
 * 빈 배열이면 100% 일치.
 */
function diffPayload(a: unknown, b: unknown, path = ''): string[] {
  if (a === b) return [];
  if (typeof a !== typeof b) return [path || '<root>'];
  if (a === null || b === null) return [path || '<root>'];
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return [path || '<root>'];
    if (a.length !== b.length) return [`${path}.length`];
    const out: string[] = [];
    for (let i = 0; i < a.length; i++) {
      out.push(...diffPayload(a[i], b[i], `${path}[${i}]`));
    }
    return out;
  }
  if (typeof a === 'object') {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
    const out: string[] = [];
    for (const k of keys) {
      out.push(...diffPayload(ao[k], bo[k], path ? `${path}.${k}` : k));
    }
    return out;
  }
  return [path || '<root>'];
}
