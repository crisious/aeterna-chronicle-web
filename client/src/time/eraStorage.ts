// 마지막 선택 era 영속화 — WorldScene 시대 전환 후 재진입 시 복원 (progress.md TODO)

import type { ChronoEraId } from './ChronoTimeline';

const STORAGE_KEY = 'aeterna_last_era';

const VALID_ERAS: ReadonlySet<ChronoEraId> = new Set<ChronoEraId>([
  'ancient',
  'present',
  'ruined_future',
]);

function isChronoEraId(value: unknown): value is ChronoEraId {
  return typeof value === 'string' && VALID_ERAS.has(value as ChronoEraId);
}

export function loadLastEra(): ChronoEraId | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return isChronoEraId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveLastEra(eraId: ChronoEraId): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (!isChronoEraId(eraId)) return;
    localStorage.setItem(STORAGE_KEY, eraId);
  } catch {
    // localStorage 비활성/quota 초과 — 무시
  }
}

export function clearLastEra(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
