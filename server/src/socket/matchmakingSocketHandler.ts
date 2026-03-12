/**
 * matchmakingSocketHandler.ts — 매칭 큐 실시간 소켓 핸들러 (P6-09)
 *
 * 이벤트:
 *   matchmaking:queue   — 큐 등록 요청
 *   matchmaking:cancel  — 큐 취소 요청
 *   matchmaking:found   — (서버→클라) 매칭 완료 알림
 *   matchmaking:accept  — 매칭 수락
 *   matchmaking:timeout — (서버→클라) 타임아웃 알림
 */

import { Server, Socket } from 'socket.io';
import { enqueue, cancelQueue, QueueRequest } from '../matchmaking/matchmakingQueue';
import { dungeonManager } from '../dungeon/dungeonManager';
import { prisma } from '../db';

// ── 페이로드 타입 ───────────────────────────────────────────────

interface QueuePayload {
  userId: string;
  queueType: string;
  contentId?: string;
  role: string;
  level: number;
  gearScore: number;
}

interface CancelPayload {
  userId: string;
}

interface AcceptPayload {
  userId: string;
  partyId: string;
}

// ── 수락 대기 맵 (partyId → { accepted: Set, members: string[], contentId?, queueType }) ──

interface PendingAccept {
  accepted: Set<string>;
  members: string[];
  contentId?: string;
  queueType: string;
  timer: ReturnType<typeof setTimeout>;
}

const pendingAccepts = new Map<string, PendingAccept>();

/** 수락 대기 타임아웃 (30초) */
const ACCEPT_TIMEOUT_MS = 30_000;

// ── 소켓 핸들러 등록 ────────────────────────────────────────────

export function setupMatchmakingSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {

    /** 큐 등록 */
    socket.on('matchmaking:queue', async (payload: QueuePayload) => {
      try {
        if (!payload.userId || !payload.queueType || !payload.role) {
          socket.emit('matchmaking:error', { error: '필수 파라미터 누락' });
          return;
        }

        // userId 기반 룸 가입 (매칭 알림 수신용)
        await socket.join(payload.userId);

        const req: QueueRequest = {
          userId: payload.userId,
          queueType: payload.queueType as QueueRequest['queueType'],
          contentId: payload.contentId,
          role: payload.role as QueueRequest['role'],
          level: payload.level,
          gearScore: payload.gearScore,
        };

        const ticketId = await enqueue(req);
        socket.emit('matchmaking:queued', { ticketId, status: 'waiting' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        socket.emit('matchmaking:error', { error: msg });
      }
    });

    /** 큐 취소 */
    socket.on('matchmaking:cancel', async (payload: CancelPayload) => {
      try {
        const cancelled = await cancelQueue(payload.userId);
        socket.emit('matchmaking:cancelled', { success: cancelled });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        socket.emit('matchmaking:error', { error: msg });
      }
    });

    /** 매칭 수락 → 전원 수락 확인 → 던전 입장 트리거 */
    socket.on('matchmaking:accept', async (payload: AcceptPayload) => {
      try {
        const { userId, partyId } = payload;
        if (!userId || !partyId) {
          socket.emit('matchmaking:error', { error: 'userId와 partyId는 필수입니다' });
          return;
        }

        // 파티 정보 조회 (최초 수락 시 pendingAccepts에 등록)
        if (!pendingAccepts.has(partyId)) {
          const party = await prisma.party.findUnique({ where: { id: partyId } });
          if (!party) {
            socket.emit('matchmaking:error', { error: '파티를 찾을 수 없습니다' });
            return;
          }

          const members = (party.members as Array<{ userId: string }>).map(m => m.userId);
          const timer = setTimeout(() => {
            // 타임아웃: 수락하지 않은 유저에게 알림
            const pending = pendingAccepts.get(partyId);
            if (pending) {
              for (const uid of pending.members) {
                if (!pending.accepted.has(uid)) {
                  io.to(uid).emit('matchmaking:timeout', { partyId, reason: '수락 시간 초과' });
                }
              }
              pendingAccepts.delete(partyId);
            }
          }, ACCEPT_TIMEOUT_MS);

          pendingAccepts.set(partyId, {
            accepted: new Set(),
            members,
            contentId: undefined, // matchFound 이벤트에서 설정됨
            queueType: party.name?.includes('pvp') ? 'pvp' : 'dungeon',
            timer,
          });
        }

        const pending = pendingAccepts.get(partyId)!;

        // 멤버 검증
        if (!pending.members.includes(userId)) {
          socket.emit('matchmaking:error', { error: '이 파티의 멤버가 아닙니다' });
          return;
        }

        // 수락 등록
        pending.accepted.add(userId);
        socket.emit('matchmaking:accepted', { status: 'accepted', partyId });

        // 전원에게 수락 현황 브로드캐스트
        for (const uid of pending.members) {
          io.to(uid).emit('matchmaking:accept_status', {
            partyId,
            accepted: pending.accepted.size,
            total: pending.members.length,
          });
        }

        // 전원 수락 완료 → 던전 입장 트리거
        if (pending.accepted.size >= pending.members.length) {
          clearTimeout(pending.timer);
          pendingAccepts.delete(partyId);

          // PvP는 던전 입장 불필요
          if (pending.queueType === 'pvp') {
            for (const uid of pending.members) {
              io.to(uid).emit('matchmaking:start', { partyId, type: 'pvp' });
            }
            return;
          }

          // 던전 입장 트리거
          const leaderId = pending.members[0];
          const memberIds = pending.members.slice(1);

          // 매칭 티켓에서 contentId(던전 코드) 조회
          const ticket = await prisma.matchmakingTicket.findFirst({
            where: { userId: leaderId, status: 'matched' },
            orderBy: { matchedAt: 'desc' },
          });
          const dungeonCode = ticket?.contentId ?? 'default_dungeon';

          const result = await dungeonManager.enter(dungeonCode, leaderId, memberIds);

          if (result.ok) {
            for (const uid of pending.members) {
              io.to(uid).emit('matchmaking:dungeon_enter', {
                partyId,
                runId: result.runId,
                dungeonCode,
              });
            }
          } else {
            for (const uid of pending.members) {
              io.to(uid).emit('matchmaking:error', {
                error: `던전 입장 실패: ${result.error}`,
              });
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        socket.emit('matchmaking:error', { error: msg });
      }
    });
  });
}
