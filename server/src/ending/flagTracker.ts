/**
 * 엔딩 플래그 추적기 — Redis 기반 플레이어별 플래그 상태 관리
 *
 * - Redis Hash로 플레이어별 플래그 저장
 * - 플래그 업데이트 / 조회 / 스냅샷 API
 * - Redis 미연결 시 in-memory fallback
 */

import { redisClient, redisConnected } from '../redis';
import { EndingFlags, sanitizeFlags } from './endingJudge';

// ── Redis 키 헬퍼 ───────────────────────────────────────────
const REDIS_KEY_PREFIX = 'ending:flags:';

function redisKey(userId: string): string {
  return `${REDIS_KEY_PREFIX}${userId}`;
}

// ── In-memory fallback (Redis 미연결 시) ────────────────────
const memoryStore = new Map<string, EndingFlags>();

// ── 기본 플래그 값 ──────────────────────────────────────────
export function defaultFlags(): EndingFlags {
  return {
    sacredArtifacts: 0,
    betrayalScore: 0,
    fragmentCount: 0,
    allPartyAlive: true,
    endingAScore: 0,
    sealVisitedCount: 0,
    emperorSaved: false,
    letheUnderstood: false,
  };
}

// ── 직렬화/역직렬화 ─────────────────────────────────────────
function flagsToRecord(flags: EndingFlags): Record<string, string> {
  return {
    sacredArtifacts: String(flags.sacredArtifacts),
    betrayalScore: String(flags.betrayalScore),
    fragmentCount: String(flags.fragmentCount),
    allPartyAlive: flags.allPartyAlive ? '1' : '0',
    endingAScore: String(flags.endingAScore),
    sealVisitedCount: String(flags.sealVisitedCount),
    emperorSaved: flags.emperorSaved ? '1' : '0',
    letheUnderstood: flags.letheUnderstood ? '1' : '0',
  };
}

function recordToFlags(rec: Record<string, string>): EndingFlags {
  return sanitizeFlags({
    sacredArtifacts: parseInt(rec.sacredArtifacts ?? '0', 10),
    betrayalScore: parseInt(rec.betrayalScore ?? '0', 10),
    fragmentCount: parseInt(rec.fragmentCount ?? '0', 10),
    allPartyAlive: rec.allPartyAlive === '1',
    endingAScore: parseInt(rec.endingAScore ?? '0', 10),
    sealVisitedCount: parseInt(rec.sealVisitedCount ?? '0', 10),
    emperorSaved: rec.emperorSaved === '1',
    letheUnderstood: rec.letheUnderstood === '1',
  });
}

// ── 플래그 조회 ─────────────────────────────────────────────
export async function getFlags(userId: string): Promise<EndingFlags> {
  if (redisConnected) {
    const data = await redisClient.hGetAll(redisKey(userId));
    if (Object.keys(data).length === 0) {
      return defaultFlags();
    }
    return recordToFlags(data);
  }

  // in-memory fallback
  return memoryStore.get(userId) ?? defaultFlags();
}

// ── 플래그 전체 저장 ────────────────────────────────────────
export async function setFlags(userId: string, flags: EndingFlags): Promise<void> {
  const sanitized = sanitizeFlags(flags);

  if (redisConnected) {
    await redisClient.hSet(redisKey(userId), flagsToRecord(sanitized));
  } else {
    memoryStore.set(userId, sanitized);
  }
}

// ── 플래그 부분 업데이트 (Partial merge) ────────────────────
export async function updateFlags(
  userId: string,
  patch: Partial<EndingFlags>,
): Promise<EndingFlags> {
  const current = await getFlags(userId);
  const merged = sanitizeFlags({ ...current, ...patch });
  await setFlags(userId, merged);
  return merged;
}

// ── 플래그 스냅샷 (세이브 연동용, JSON 직렬화 가능 객체 반환) ──
export async function snapshotFlags(userId: string): Promise<EndingFlags> {
  return getFlags(userId);
}

// ── 플래그 초기화 (NG+ 등) ──────────────────────────────────
export async function resetFlags(userId: string): Promise<EndingFlags> {
  const fresh = defaultFlags();
  await setFlags(userId, fresh);
  return fresh;
}
