/**
 * matchmaker.ts — PvP 레이팅 기반 매칭 시스템
 *
 * - 레이팅 ±100 범위로 시작, 10초마다 ±50 확장, 최대 ±300
 * - 메모리 큐 + Redis 백업 (Redis 미연결 시 메모리 단독 동작)
 * - 매치 성사 시 양쪽 소켓에 pvp:matched 이벤트 발송
 */
import { Server } from 'socket.io';
import { prisma } from '../db';
import { redisClient, redisConnected } from '../redis';

// ─── 타입 정의 ──────────────────────────────────────────────
export interface QueueEntry {
  userId: string;
  characterId: string;
  socketId: string;
  rating: number;
  arenaType: string;
  enqueuedAt: number;  // Date.now()
}

// ─── 매칭 상수 ──────────────────────────────────────────────
const BASE_RANGE = 100;       // 초기 레이팅 검색 범위
const EXPAND_STEP = 50;       // 10초마다 확장 폭
const EXPAND_INTERVAL = 10_000; // 확장 주기 (ms)
const MAX_RANGE = 300;         // 최대 레이팅 검색 범위
const MATCH_TICK_MS = 3_000;   // 매칭 루프 주기

// ─── 메모리 큐 ──────────────────────────────────────────────
const matchQueue: Map<string, QueueEntry> = new Map();  // userId → QueueEntry
let matchInterval: ReturnType<typeof setInterval> | null = null;
let ioRef: Server | null = null;

/** 현재 시즌 (환경변수 또는 기본값 1) */
export function getCurrentSeason(): number {
  return parseInt(process.env.PVP_SEASON || '1', 10);
}

/** 매칭 큐에 등록 */
export async function enqueue(entry: QueueEntry): Promise<void> {
  matchQueue.set(entry.userId, entry);

  // Redis 백업 (비동기, 실패해도 무시)
  if (redisConnected) {
    try {
      await redisClient.hSet('pvp:queue', entry.userId, JSON.stringify(entry));
    } catch (err) {
      console.warn('[Matchmaker] Redis 큐 백업 실패:', err);
    }
  }
}

/** 매칭 큐에서 제거 */
export async function dequeue(userId: string): Promise<boolean> {
  const removed = matchQueue.delete(userId);

  if (redisConnected) {
    try {
      await redisClient.hDel('pvp:queue', userId);
    } catch {
      // 무시
    }
  }

  return removed;
}

/** 유저가 큐에 있는지 확인 */
export function isInQueue(userId: string): boolean {
  return matchQueue.has(userId);
}

/**
 * 매칭 루프 — 큐 내 엔트리를 순회하며 레이팅 범위 내 상대를 찾는다.
 * 매치 성사 시 DB에 PvpMatch 생성 + 소켓 알림
 */
async function matchTick(): Promise<void> {
  if (!ioRef) return;
  const now = Date.now();
  const matched = new Set<string>();

  const entries = Array.from(matchQueue.values());

  for (let i = 0; i < entries.length; i++) {
    const a = entries[i];
    if (matched.has(a.userId)) continue;

    // 시간 경과에 따른 레이팅 범위 확장
    const elapsed = now - a.enqueuedAt;
    const expandCount = Math.floor(elapsed / EXPAND_INTERVAL);
    const range = Math.min(BASE_RANGE + expandCount * EXPAND_STEP, MAX_RANGE);

    for (let j = i + 1; j < entries.length; j++) {
      const b = entries[j];
      if (matched.has(b.userId)) continue;
      if (a.arenaType !== b.arenaType) continue;

      const ratingDiff = Math.abs(a.rating - b.rating);
      if (ratingDiff <= range) {
        // 매치 성사
        matched.add(a.userId);
        matched.add(b.userId);

        try {
          await createMatch(a, b);
        } catch (err) {
          console.error('[Matchmaker] 매치 생성 실패:', err);
        }
        break;
      }
    }
  }

  // 매칭된 유저를 큐에서 제거
  for (const userId of matched) {
    await dequeue(userId);
  }
}

/** DB에 PvpMatch 생성 + 양쪽 소켓에 pvp:matched 이벤트 발송 */
async function createMatch(a: QueueEntry, b: QueueEntry): Promise<void> {
  const season = getCurrentSeason();

  const match = await prisma.pvpMatch.create({
    data: {
      player1Id: a.userId,
      player2Id: b.userId,
      arenaType: a.arenaType,
      season,
      status: 'ready',
    },
  });

  console.log(`[Matchmaker] 매치 성사: ${match.id} (${a.userId} vs ${b.userId})`);

  // 양쪽 소켓에 알림
  const payload = {
    matchId: match.id,
    opponent: { userId: '', characterId: '', rating: 0 },
    arenaType: match.arenaType,
    season,
  };

  const socketA = ioRef?.sockets.sockets.get(a.socketId);
  const socketB = ioRef?.sockets.sockets.get(b.socketId);

  if (socketA) {
    socketA.emit('pvp:matched', {
      ...payload,
      opponent: { userId: b.userId, characterId: b.characterId, rating: b.rating },
    });
  }

  if (socketB) {
    socketB.emit('pvp:matched', {
      ...payload,
      opponent: { userId: a.userId, characterId: a.characterId, rating: a.rating },
    });
  }
}

/** 매칭 시스템 시작 — 서버 부팅 시 호출 */
export function startMatchmaker(io: Server): void {
  ioRef = io;

  if (matchInterval) {
    clearInterval(matchInterval);
  }

  matchInterval = setInterval(() => {
    matchTick().catch((err) => {
      console.error('[Matchmaker] matchTick 에러:', err);
    });
  }, MATCH_TICK_MS);

  console.log('[Matchmaker] 매칭 시스템 시작');
}

/** 매칭 시스템 정지 — graceful shutdown 시 호출 */
export function stopMatchmaker(): void {
  if (matchInterval) {
    clearInterval(matchInterval);
    matchInterval = null;
  }
  ioRef = null;
  console.log('[Matchmaker] 매칭 시스템 정지');
}
