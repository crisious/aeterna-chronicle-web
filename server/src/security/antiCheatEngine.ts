/**
 * P9-08 안티치트 엔진 — 서버 권위 검증 + 의심 점수 누적 + 자동 제재
 *
 * - 데미지 상한 검증: 클래스/레벨별 최대 데미지 초과 탐지
 * - 이동 속도 검증: 서버 기준 최대 이동속도 × 허용 배율 초과 탐지
 * - 쿨다운 검증: 스킬 최소 쿨다운 미만 연타 탐지
 * - 의심 점수 누적 → 임계치 초과 시 자동 킥/제재
 * - Redis 기반 의심 점수 저장 (fallback: in-memory)
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { redisClient, redisConnected } from '../redis';
import { prisma } from '../db';

// ─── 상수 ───────────────────────────────────────────────────────

/** 의심 점수 임계치 */
const SUSPICION_THRESHOLD_WARN = 50;
const SUSPICION_THRESHOLD_KICK = 100;
const SUSPICION_THRESHOLD_BAN = 200;

/** 의심 점수 감쇠: 1시간마다 10점씩 자연 감소 */
const DECAY_INTERVAL_MS = 60 * 60 * 1000;
const DECAY_AMOUNT = 10;

/** 위반 유형별 점수 가중치 */
const VIOLATION_SCORES: Record<ViolationType, number> = {
  damage_exceed: 15,
  speed_hack: 25,
  cooldown_bypass: 20,
  impossible_action: 30,
  packet_flood: 10,
  position_teleport: 35,
};

/** 데미지 상한 (클래스별 기본 최대 × 버프 보정) */
const MAX_DAMAGE_MULTIPLIER = 3.5; // 최대 버프/크리티컬 보정

/** 이동 속도 허용 배율 (네트워크 지연 보정 포함) */
const SPEED_TOLERANCE = 1.5;

/** 쿨다운 허용 오차 (ms) — 네트워크 지터 보정 */
const COOLDOWN_TOLERANCE_MS = 200;

// ─── 타입 ───────────────────────────────────────────────────────

export type ViolationType =
  | 'damage_exceed'
  | 'speed_hack'
  | 'cooldown_bypass'
  | 'impossible_action'
  | 'packet_flood'
  | 'position_teleport';

export interface ViolationRecord {
  userId: string;
  type: ViolationType;
  details: string;
  score: number;
  timestamp: number;
}

export interface SuspicionState {
  userId: string;
  totalScore: number;
  violations: ViolationRecord[];
  lastDecayAt: number;
}

interface DamageValidation {
  userId: string;
  characterLevel: number;
  characterClass: string;
  reportedDamage: number;
  /** 서버 산정 기본 최대 데미지 */
  serverMaxBaseDamage: number;
}

interface MovementValidation {
  userId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  deltaMs: number;
  /** 서버 기준 최대 이동속도 (px/sec) */
  serverMaxSpeed: number;
}

interface CooldownValidation {
  userId: string;
  skillId: string;
  /** 서버 기준 최소 쿨다운 (ms) */
  serverCooldownMs: number;
  /** 이전 사용 시각 (ms) */
  lastUsedAt: number;
  /** 현재 사용 시각 (ms) */
  currentUseAt: number;
}

// ─── In-memory 스토어 (Redis fallback) ──────────────────────────

const memoryStore = new Map<string, SuspicionState>();

// ─── 핵심 함수 ──────────────────────────────────────────────────

/** 의심 점수 조회 */
export async function getSuspicionScore(userId: string): Promise<number> {
  if (redisConnected) {
    try {
      const val = await redisClient.get(`ac:score:${userId}`);
      return val ? parseInt(val, 10) : 0;
    } catch { /* fallback */ }
  }
  return memoryStore.get(userId)?.totalScore ?? 0;
}

/** 의심 점수 증가 + 위반 기록 */
async function addViolation(
  userId: string,
  type: ViolationType,
  details: string,
): Promise<{ newScore: number; action: 'none' | 'warn' | 'kick' | 'ban' }> {
  const points = VIOLATION_SCORES[type];
  let newScore: number;

  if (redisConnected) {
    try {
      newScore = await redisClient.incrBy(`ac:score:${userId}`, points);
      // 24시간 TTL — 자연 만료
      await redisClient.expire(`ac:score:${userId}`, 86400);
      // 위반 로그 추가
      await redisClient.lPush(
        `ac:violations:${userId}`,
        JSON.stringify({ type, details, score: points, timestamp: Date.now() }),
      );
      await redisClient.lTrim(`ac:violations:${userId}`, 0, 99); // 최근 100건
      await redisClient.expire(`ac:violations:${userId}`, 86400);
    } catch {
      newScore = addViolationMemory(userId, type, details, points);
    }
  } else {
    newScore = addViolationMemory(userId, type, details, points);
  }

  // 임계치 판정
  let action: 'none' | 'warn' | 'kick' | 'ban' = 'none';
  if (newScore >= SUSPICION_THRESHOLD_BAN) {
    action = 'ban';
    await executeBan(userId, `안티치트 자동 제재: 의심 점수 ${newScore}`);
  } else if (newScore >= SUSPICION_THRESHOLD_KICK) {
    action = 'kick';
  } else if (newScore >= SUSPICION_THRESHOLD_WARN) {
    action = 'warn';
  }

  return { newScore, action };
}

function addViolationMemory(
  userId: string,
  type: ViolationType,
  details: string,
  points: number,
): number {
  let state = memoryStore.get(userId);
  if (!state) {
    state = { userId, totalScore: 0, violations: [], lastDecayAt: Date.now() };
    memoryStore.set(userId, state);
  }

  // 감쇠 적용
  const elapsed = Date.now() - state.lastDecayAt;
  const decayCount = Math.floor(elapsed / DECAY_INTERVAL_MS);
  if (decayCount > 0) {
    state.totalScore = Math.max(0, state.totalScore - decayCount * DECAY_AMOUNT);
    state.lastDecayAt += decayCount * DECAY_INTERVAL_MS;
  }

  state.totalScore += points;
  state.violations.push({ userId, type, details, score: points, timestamp: Date.now() });
  if (state.violations.length > 100) state.violations.splice(0, state.violations.length - 100);

  return state.totalScore;
}

/** 자동 밴 실행 */
async function executeBan(userId: string, reason: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        bannedAt: new Date(),
        banReason: reason,
      },
    });
  } catch {
    // DB 실패 시 로그만 남김 (가용성 우선)
    console.error(`[AntiCheat] 자동 밴 DB 실패: userId=${userId}`);
  }
}

// ─── 검증 함수들 ────────────────────────────────────────────────

/** 데미지 상한 검증 */
export async function validateDamage(data: DamageValidation): Promise<{
  valid: boolean;
  action?: string;
  newScore?: number;
}> {
  const maxAllowed = data.serverMaxBaseDamage * MAX_DAMAGE_MULTIPLIER;
  if (data.reportedDamage <= maxAllowed) return { valid: true };

  const details =
    `데미지 초과: 보고=${data.reportedDamage}, 상한=${maxAllowed}, ` +
    `클래스=${data.characterClass}, 레벨=${data.characterLevel}`;
  const result = await addViolation(data.userId, 'damage_exceed', details);
  return { valid: false, action: result.action, newScore: result.newScore };
}

/** 이동 속도 검증 */
export async function validateMovement(data: MovementValidation): Promise<{
  valid: boolean;
  action?: string;
  newScore?: number;
}> {
  const dx = data.toX - data.fromX;
  const dy = data.toY - data.fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const deltaSec = data.deltaMs / 1000;
  const actualSpeed = deltaSec > 0 ? distance / deltaSec : Infinity;
  const maxAllowed = data.serverMaxSpeed * SPEED_TOLERANCE;

  if (actualSpeed <= maxAllowed) return { valid: true };

  // 텔레포트급 이동 탐지 (5배 이상)
  const violationType: ViolationType =
    actualSpeed > data.serverMaxSpeed * 5 ? 'position_teleport' : 'speed_hack';

  const details =
    `속도 위반: 실제=${actualSpeed.toFixed(1)}px/s, 상한=${maxAllowed.toFixed(1)}px/s, ` +
    `거리=${distance.toFixed(1)}, 시간=${deltaSec.toFixed(3)}s`;
  const result = await addViolation(data.userId, violationType, details);
  return { valid: false, action: result.action, newScore: result.newScore };
}

/** 쿨다운 검증 */
export async function validateCooldown(data: CooldownValidation): Promise<{
  valid: boolean;
  action?: string;
  newScore?: number;
}> {
  const elapsed = data.currentUseAt - data.lastUsedAt;
  const minAllowed = data.serverCooldownMs - COOLDOWN_TOLERANCE_MS;

  if (elapsed >= minAllowed) return { valid: true };

  const details =
    `쿨다운 위반: 스킬=${data.skillId}, 경과=${elapsed}ms, 최소=${minAllowed}ms`;
  const result = await addViolation(data.userId, 'cooldown_bypass', details);
  return { valid: false, action: result.action, newScore: result.newScore };
}

/** 패킷 플러드 탐지 (초당 패킷 수 제한) */
export async function validatePacketRate(
  userId: string,
  packetsPerSecond: number,
  maxPacketsPerSecond = 60,
): Promise<{ valid: boolean; action?: string; newScore?: number }> {
  if (packetsPerSecond <= maxPacketsPerSecond) return { valid: true };

  const details = `패킷 플러드: ${packetsPerSecond}/s (상한: ${maxPacketsPerSecond}/s)`;
  const result = await addViolation(userId, 'packet_flood', details);
  return { valid: false, action: result.action, newScore: result.newScore };
}

// ─── 위반 이력 조회 (어드민용) ──────────────────────────────────

/** 유저의 위반 이력 조회 */
export async function getViolationHistory(
  userId: string,
  limit = 50,
): Promise<ViolationRecord[]> {
  if (redisConnected) {
    try {
      const raw = await redisClient.lRange(`ac:violations:${userId}`, 0, limit - 1);
      return raw.map((r) => JSON.parse(r));
    } catch { /* fallback */ }
  }
  return (memoryStore.get(userId)?.violations ?? []).slice(-limit);
}

/** 의심 점수 초기화 (어드민 수동) */
export async function resetSuspicion(userId: string): Promise<void> {
  if (redisConnected) {
    try {
      await redisClient.del(`ac:score:${userId}`);
      await redisClient.del(`ac:violations:${userId}`);
    } catch { /* fallback */ }
  }
  memoryStore.delete(userId);
}

// ─── Fastify 미들웨어: 의심 점수 기반 요청 차단 ────────────────

/**
 * 킥 임계치 이상의 유저는 API 요청 자체를 차단한다.
 * authMiddleware 이후에 적용.
 */
export async function antiCheatGuard(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = (request as any).userId as string | undefined;
  if (!userId) return; // 비인증 요청은 통과

  const score = await getSuspicionScore(userId);
  if (score >= SUSPICION_THRESHOLD_KICK) {
    reply.status(403).send({
      error: '비정상 활동이 감지되어 접속이 제한되었습니다.',
      code: 'ANTI_CHEAT_BLOCKED',
      suspicionScore: score,
    });
  }
}
