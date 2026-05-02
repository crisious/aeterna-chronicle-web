/**
 * Save System — Integrity & Backup
 *
 * 책임:
 *   1) 페이로드 체크섬 계산·검증 (SHA-256 hex)
 *   2) 백업 슬롯 회전 (slot_N 저장 시 직전 본을 backup_<n>로 보존)
 *   3) 손상 슬롯에서 가장 최근 정상 백업으로 복구
 *
 * 정책:
 *   - 백업 슬롯 수 = BACKUP_SLOT_COUNT (기본 3)
 *   - 체크섬은 payload만 대상 — header.checksum 자기참조 회피
 *   - 복구 성공 시 호출자가 사용자 노출 (조용한 실패 금지)
 */

import type {
  SaveEnvelope,
  SaveResult,
  SaveSlotId,
} from './types';

// ─── 정책 상수 ───────────────────────────────────────────────────────────
export const BACKUP_SLOT_COUNT = 3;
export const CHECKSUM_ALGO = 'SHA-256' as const;

// ─── canonical JSON ─────────────────────────────────────────────────────
/**
 * 키 정렬 + 동일 입력 → 동일 문자열 보장. 체크섬 안정성 핵심.
 * Map/Set/undefined는 사용 안 함 가정 (페이로드 타입이 plain).
 */
function canonicalize(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('canonicalize: non-finite number');
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts = keys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k]));
    return '{' + parts.join(',') + '}';
  }
  // undefined/function/symbol 등 — 무시 대신 명시적 실패
  throw new Error(`canonicalize: unsupported type ${typeof value}`);
}

function bytesToHex(buf: ArrayBuffer): string {
  const arr = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < arr.length; i++) {
    const h = arr[i].toString(16);
    out += h.length === 1 ? '0' + h : h;
  }
  return out;
}

// ─── 체크섬 ──────────────────────────────────────────────────────────────
export async function computeChecksum(payload: unknown): Promise<string> {
  const canon = canonicalize(payload);
  const data = new TextEncoder().encode(canon);
  // SubtleCrypto.digest의 BufferSource 타입 호환 — Uint8Array를 통째로 넘김
  const digest = await crypto.subtle.digest(CHECKSUM_ALGO, data);
  return bytesToHex(digest);
}

export async function verifyChecksum(envelope: SaveEnvelope): Promise<boolean> {
  if (!envelope || typeof envelope !== 'object') return false;
  if (!envelope.header || !envelope.payload) return false;
  if (typeof envelope.header.checksum !== 'string') return false;
  try {
    const recomputed = await computeChecksum(envelope.payload);
    return recomputed === envelope.header.checksum;
  } catch {
    return false;
  }
}

// ─── 백업 슬롯 회전 ─────────────────────────────────────────────────────
/**
 * primary 슬롯에 대한 백업 슬롯 ID 배열.
 *   - index 0 이 가장 최신, BACKUP_SLOT_COUNT-1 이 가장 오래됨.
 *   - autosave 슬롯도 동일 패턴 적용.
 */
export function getBackupSlotIds(primary: SaveSlotId): SaveSlotId[] {
  // 백업 슬롯 자체에 대한 백업은 만들지 않는다 (재귀 회피).
  if (typeof primary === 'string' && primary.startsWith('backup_')) {
    return [];
  }
  const out: SaveSlotId[] = [];
  for (let i = 0; i < BACKUP_SLOT_COUNT; i++) {
    // SaveSlotId의 backup 패턴은 `backup_${number}` — primary 구분을 위해
    // 숫자 인코딩에 슬롯 해시(string→number) 활용.
    out.push(makeBackupId(primary, i));
  }
  return out;
}

/** primary 슬롯명을 안정적 정수로 인코딩 (충돌 방지). */
function slotHash(primary: SaveSlotId): number {
  const s = String(primary);
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  // 양수화 + 6자리 묶음
  return Math.abs(h) % 1_000_000;
}

function makeBackupId(primary: SaveSlotId, index: number): SaveSlotId {
  // backup_<hash><index> — index는 단일 자리(0..N-1)
  const code = slotHash(primary) * 10 + index;
  return `backup_${code}` as SaveSlotId;
}

/**
 * 저장 직전, 기존 primary를 백업 슬롯으로 한 칸씩 회전 이동.
 *
 *   backup_<N-1> ← backup_<N-2>
 *   ...
 *   backup_1     ← backup_0
 *   backup_0     ← primary (현재 디스크에 있는 본)
 *
 * primary가 비어 있으면 회전 생략 (첫 저장).
 */
export async function rotateBackup(
  primary: SaveSlotId,
  storage: SaveStorageAdapter,
): Promise<SaveResult<void>> {
  try {
    const ids = getBackupSlotIds(primary);
    if (ids.length === 0) {
      return { ok: true, value: undefined };
    }
    // 가장 오래된 백업부터 한 칸씩 뒤로 — N-1 ← N-2, ..., 1 ← 0
    for (let i = ids.length - 1; i >= 1; i--) {
      const src = await storage.read(ids[i - 1]);
      if (src === null) {
        // 비었으면 끝자리 비우는 의미로 delete
        await storage.delete(ids[i]);
      } else {
        await storage.write(ids[i], src);
      }
    }
    // 0 ← primary (있을 때만)
    const cur = await storage.read(primary);
    if (cur === null) {
      await storage.delete(ids[0]);
    } else {
      await storage.write(ids[0], cur);
    }
    return { ok: true, value: undefined };
  } catch (cause) {
    return {
      ok: false,
      error: {
        code: 'INTERNAL',
        messageKo: '백업 회전 중 오류가 발생했습니다.',
        cause,
      },
    };
  }
}

/**
 * primary 손상 시 가장 최신·체크섬 정상인 백업으로 복구.
 * 모든 백업이 손상되면 BACKUP_RESTORE_FAILED.
 */
export async function restoreFromBackup(
  primary: SaveSlotId,
  storage: SaveStorageAdapter,
): Promise<SaveResult<SaveEnvelope>> {
  const ids = getBackupSlotIds(primary);
  for (const id of ids) {
    const raw = await storage.read(id);
    if (raw === null) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== 'object') continue;
    const env = parsed as SaveEnvelope;
    if (!env.header || !env.payload) continue;
    const ok = await verifyChecksum(env);
    if (!ok) continue;
    // 검증 통과한 본을 primary 자리로 덮어쓰기 — 다음 로드부터 정상 동작.
    try {
      await storage.write(primary, raw);
    } catch {
      // 쓰기 실패해도 메모리상 복구본은 반환 — 호출자가 게임 진행은 지속.
    }
    return { ok: true, value: env };
  }
  return {
    ok: false,
    error: {
      code: 'BACKUP_RESTORE_FAILED',
      messageKo: '복구 가능한 백업이 없습니다.',
    },
  };
}

// ─── 스토리지 어댑터 ───────────────────────────────────────────────────
export interface SaveStorageAdapter {
  read(slotId: SaveSlotId): Promise<string | null>;
  write(slotId: SaveSlotId, raw: string): Promise<void>;
  delete(slotId: SaveSlotId): Promise<void>;
  list(): Promise<SaveSlotId[]>;
}
