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

    /** 매칭 수락 (추후 준비 확인 시스템 연동) */
    socket.on('matchmaking:accept', (_payload: AcceptPayload) => {
      // TODO: 전원 수락 확인 → 던전 입장 트리거
      socket.emit('matchmaking:accepted', { status: 'accepted' });
    });
  });
}
