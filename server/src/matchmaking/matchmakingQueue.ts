/**
 * matchmakingQueue.ts — 파티 매칭 큐 시스템 (P6-09)
 *
 * 역할:
 *   - 큐 등록/취소 (역할 필수: 탱/딜/힐/아무거나)
 *   - 매칭 알고리즘: 던전(1T+1H+2D), 레이드(2T+2H+4D), PvP(레이팅 ±200)
 *   - 대기 시간 기반 조건 완화 (30초→레벨±10, 60초→역할 any 허용)
 *   - 타임아웃 5분 → 자동 만료
 *   - 매칭 완료 → 파티 자동 생성
 */

import { prisma } from '../db';
import { Server } from 'socket.io';

// ── 타입 정의 ──────────────────────────────────────────────────

export type QueueType = 'dungeon' | 'raid' | 'pvp';
export type RoleType = 'tank' | 'dps' | 'healer' | 'any';

export interface QueueRequest {
  userId: string;
  queueType: QueueType;
  contentId?: string;
  role: RoleType;
  level: number;
  gearScore: number;
}

/** 매칭 구성 요건 (역할별 필요 인원) */
interface CompositionRequirement {
  tank: number;
  healer: number;
  dps: number;
  total: number;
}

/** 매칭 결과 */
export interface MatchResult {
  ticketIds: string[];
  userIds: string[];
  queueType: QueueType;
  contentId?: string;
}

// ── 상수 ────────────────────────────────────────────────────────

const COMPOSITION: Record<string, CompositionRequirement> = {
  dungeon: { tank: 1, healer: 1, dps: 2, total: 4 },
  raid:    { tank: 2, healer: 2, dps: 4, total: 8 },
  pvp:     { tank: 0, healer: 0, dps: 0, total: 2 },  // PvP는 역할 무관
};

/** 기본 매칭 조건 */
const BASE_LEVEL_RANGE = 5;
const BASE_GEARSCORE_RANGE = 200;
const BASE_PVP_RATING_RANGE = 200;

/** 조건 완화 타이밍 (초) */
const RELAX_LEVEL_AT = 30;          // 30초 후 레벨 ±10
const RELAX_ROLE_AT = 60;           // 60초 후 any 역할 허용
const TICKET_TIMEOUT = 5 * 60;      // 5분 타임아웃

/** 매칭 루프 간격 (ms) */
const MATCH_INTERVAL_MS = 3000;

// ── 매칭 큐 매니저 ──────────────────────────────────────────────

let matchInterval: ReturnType<typeof setInterval> | null = null;
let ioRef: Server | null = null;

/** 큐 등록 */
export async function enqueue(req: QueueRequest): Promise<string> {
  // 이미 대기 중인 티켓이 있으면 거부
  const existing = await prisma.matchmakingTicket.findFirst({
    where: { userId: req.userId, status: 'waiting' },
  });
  if (existing) {
    throw new Error('이미 매칭 대기 중입니다.');
  }

  const ticket = await prisma.matchmakingTicket.create({
    data: {
      userId: req.userId,
      queueType: req.queueType,
      contentId: req.contentId ?? null,
      role: req.role,
      level: req.level,
      gearScore: req.gearScore,
      status: 'waiting',
    },
  });

  return ticket.id;
}

/** 큐 취소 */
export async function cancelQueue(userId: string): Promise<boolean> {
  const ticket = await prisma.matchmakingTicket.findFirst({
    where: { userId, status: 'waiting' },
  });
  if (!ticket) return false;

  await prisma.matchmakingTicket.update({
    where: { id: ticket.id },
    data: { status: 'cancelled' },
  });
  return true;
}

/** 유저 매칭 상태 조회 */
export async function getQueueStatus(userId: string) {
  const ticket = await prisma.matchmakingTicket.findFirst({
    where: { userId, status: { in: ['waiting', 'matched'] } },
    orderBy: { createdAt: 'desc' },
  });
  if (!ticket) return { status: 'none' as const };

  const waitSec = Math.floor((Date.now() - ticket.createdAt.getTime()) / 1000);
  return {
    status: ticket.status as 'waiting' | 'matched',
    ticketId: ticket.id,
    queueType: ticket.queueType,
    role: ticket.role,
    waitSeconds: waitSec,
  };
}

/** 예상 대기 시간 (최근 매칭 기반 간단 추정) */
export async function estimateWait(queueType: string): Promise<number> {
  const recent = await prisma.matchmakingTicket.findMany({
    where: { queueType, status: 'matched', matchedAt: { not: null } },
    orderBy: { matchedAt: 'desc' },
    take: 20,
  });

  if (recent.length === 0) return 60; // 데이터 없으면 60초

  const totalWait = recent.reduce((sum, t) => {
    const wait = t.matchedAt!.getTime() - t.createdAt.getTime();
    return sum + wait;
  }, 0);

  return Math.round(totalWait / recent.length / 1000);
}

// ── 매칭 알고리즘 ───────────────────────────────────────────────

/** 대기 시간에 따른 레벨 허용 범위 */
function getLevelRange(waitSec: number): number {
  if (waitSec >= RELAX_LEVEL_AT) return BASE_LEVEL_RANGE * 2; // ±10
  return BASE_LEVEL_RANGE;
}

/** 대기 시간에 따른 역할 완화 여부 */
function isRoleRelaxed(waitSec: number): boolean {
  return waitSec >= RELAX_ROLE_AT;
}

/** 역할 매칭 가능 여부 */
function roleMatches(ticketRole: string, neededRole: string, relaxed: boolean): boolean {
  if (ticketRole === neededRole) return true;
  if (ticketRole === 'any') return true;
  if (relaxed) return true; // 60초 이후 어떤 역할이든 수용
  return false;
}

/** PvP 매칭: 레이팅 기반 1:1 */
async function matchPvP(now: number): Promise<MatchResult[]> {
  const tickets = await prisma.matchmakingTicket.findMany({
    where: { queueType: 'pvp', status: 'waiting' },
    orderBy: { createdAt: 'asc' },
  });

  const results: MatchResult[] = [];
  const used = new Set<string>();

  for (let i = 0; i < tickets.length; i++) {
    if (used.has(tickets[i].id)) continue;
    const a = tickets[i];
    const aWait = (now - a.createdAt.getTime()) / 1000;
    const ratingRange = aWait > RELAX_LEVEL_AT
      ? BASE_PVP_RATING_RANGE * 2
      : BASE_PVP_RATING_RANGE;

    for (let j = i + 1; j < tickets.length; j++) {
      if (used.has(tickets[j].id)) continue;
      const b = tickets[j];
      if (Math.abs(a.gearScore - b.gearScore) <= ratingRange) {
        used.add(a.id);
        used.add(b.id);
        results.push({
          ticketIds: [a.id, b.id],
          userIds: [a.userId, b.userId],
          queueType: 'pvp',
        });
        break;
      }
    }
  }
  return results;
}

/** PvE 매칭: 던전/레이드 구성 조합 */
async function matchPvE(queueType: 'dungeon' | 'raid', now: number): Promise<MatchResult[]> {
  const comp = COMPOSITION[queueType];
  const tickets = await prisma.matchmakingTicket.findMany({
    where: { queueType, status: 'waiting' },
    orderBy: { createdAt: 'asc' },
  });

  if (tickets.length < comp.total) return [];

  const results: MatchResult[] = [];
  const used = new Set<string>();

  // 그리디 매칭: 가장 오래 기다린 티켓부터 그룹 구성 시도
  for (const anchor of tickets) {
    if (used.has(anchor.id)) continue;

    const anchorWait = (now - anchor.createdAt.getTime()) / 1000;
    const levelRange = getLevelRange(anchorWait);
    const relaxed = isRoleRelaxed(anchorWait);

    // 앵커 기준으로 레벨 범위 내 후보 필터
    const candidates = tickets.filter(t =>
      !used.has(t.id) &&
      t.id !== anchor.id &&
      Math.abs(t.level - anchor.level) <= levelRange &&
      Math.abs(t.gearScore - anchor.gearScore) <= BASE_GEARSCORE_RANGE * (anchorWait > RELAX_LEVEL_AT ? 2 : 1) &&
      (!anchor.contentId || !t.contentId || anchor.contentId === t.contentId)
    );

    // 역할 슬롯 채우기
    const group: typeof tickets = [anchor];
    const filled = { tank: 0, healer: 0, dps: 0 };

    // 앵커 역할 카운트
    if (anchor.role === 'tank' || (anchor.role === 'any' && comp.tank > 0)) {
      filled.tank++;
    } else if (anchor.role === 'healer' || (anchor.role === 'any' && comp.healer > 0 && filled.tank >= comp.tank)) {
      filled.healer++;
    } else {
      filled.dps++;
    }

    for (const c of candidates) {
      if (group.length >= comp.total) break;
      const cRelaxed = isRoleRelaxed((now - c.createdAt.getTime()) / 1000) || relaxed;

      if (filled.tank < comp.tank && roleMatches(c.role, 'tank', cRelaxed)) {
        filled.tank++;
        group.push(c);
      } else if (filled.healer < comp.healer && roleMatches(c.role, 'healer', cRelaxed)) {
        filled.healer++;
        group.push(c);
      } else if (filled.dps < comp.dps && roleMatches(c.role, 'dps', cRelaxed)) {
        filled.dps++;
        group.push(c);
      }
    }

    if (group.length >= comp.total) {
      for (const t of group) used.add(t.id);
      results.push({
        ticketIds: group.map(t => t.id),
        userIds: group.map(t => t.userId),
        queueType,
        contentId: anchor.contentId ?? undefined,
      });
    }
  }

  return results;
}

/** 만료 티켓 처리 */
async function expireOldTickets(now: number): Promise<string[]> {
  const cutoff = new Date(now - TICKET_TIMEOUT * 1000);
  const expired = await prisma.matchmakingTicket.findMany({
    where: { status: 'waiting', createdAt: { lt: cutoff } },
  });

  if (expired.length > 0) {
    await prisma.matchmakingTicket.updateMany({
      where: { id: { in: expired.map(t => t.id) } },
      data: { status: 'expired' },
    });
  }
  return expired.map(t => t.userId);
}

/** 매칭 완료 처리: 티켓 상태 업데이트 + 파티 생성 */
async function finalizeMatch(result: MatchResult): Promise<string> {
  const now = new Date();

  // 티켓 상태 → matched
  await prisma.matchmakingTicket.updateMany({
    where: { id: { in: result.ticketIds } },
    data: { status: 'matched', matchedAt: now },
  });

  // 자동 파티 생성
  const party = await prisma.party.create({
    data: {
      leaderId: result.userIds[0],
      name: `매칭 파티 (${result.queueType})`,
      maxSize: result.userIds.length,
      members: result.userIds.map((uid, i) => ({
        userId: uid,
        role: i === 0 ? 'leader' : 'member',
        joinedAt: now.toISOString(),
      })),
      status: result.queueType === 'pvp' ? 'open' : 'in_dungeon',
    },
  });

  return party.id;
}

// ── 매칭 루프 ───────────────────────────────────────────────────

/** 매칭 루프 1회차 */
async function runMatchCycle(): Promise<void> {
  const now = Date.now();

  try {
    // 1) 만료 처리
    const expiredUsers = await expireOldTickets(now);
    for (const uid of expiredUsers) {
      ioRef?.to(uid).emit('matchmaking:timeout', { userId: uid });
    }

    // 2) PvP 매칭
    const pvpResults = await matchPvP(now);
    for (const r of pvpResults) {
      const partyId = await finalizeMatch(r);
      for (const uid of r.userIds) {
        ioRef?.to(uid).emit('matchmaking:found', {
          partyId,
          queueType: r.queueType,
          members: r.userIds,
        });
      }
    }

    // 3) 던전 매칭
    const dungeonResults = await matchPvE('dungeon', now);
    for (const r of dungeonResults) {
      const partyId = await finalizeMatch(r);
      for (const uid of r.userIds) {
        ioRef?.to(uid).emit('matchmaking:found', {
          partyId,
          queueType: r.queueType,
          contentId: r.contentId,
          members: r.userIds,
        });
      }
    }

    // 4) 레이드 매칭
    const raidResults = await matchPvE('raid', now);
    for (const r of raidResults) {
      const partyId = await finalizeMatch(r);
      for (const uid of r.userIds) {
        ioRef?.to(uid).emit('matchmaking:found', {
          partyId,
          queueType: r.queueType,
          contentId: r.contentId,
          members: r.userIds,
        });
      }
    }
  } catch (err) {
    console.error('[Matchmaking] 매칭 루프 에러:', err);
  }
}

/** 매칭 시스템 시작 */
export function startMatchmaking(io: Server): void {
  ioRef = io;
  if (matchInterval) return;
  matchInterval = setInterval(() => void runMatchCycle(), MATCH_INTERVAL_MS);
  console.log('[Matchmaking] 매칭 큐 시스템 시작 (3초 간격)');
}

/** 매칭 시스템 정지 */
export function stopMatchmaking(): void {
  if (matchInterval) {
    clearInterval(matchInterval);
    matchInterval = null;
  }
  ioRef = null;
  console.log('[Matchmaking] 매칭 큐 시스템 정지');
}
