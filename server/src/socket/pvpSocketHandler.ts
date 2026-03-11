/**
 * pvpSocketHandler.ts — PvP 소켓 이벤트 핸들러
 *
 * - pvp:ready    — 준비 완료 (양쪽 준비 시 fighting 전환)
 * - pvp:action   — 전투 액션 (상대에게 릴레이)
 * - pvp:result   — 매치 결과 제출
 */
import { Server, Socket } from 'socket.io';
import {
  isBinary,
  decodePvpAction,
  encodePvpResult,
} from '../../../shared/codec/gameCodec';
import { startMatch, finishMatch } from '../pvp/arenaHandler';

/** 매치별 준비 상태 추적 (matchId → Set<userId>) */
const readyMap = new Map<string, Set<string>>();

/** 매치별 소켓 매핑 (matchId → { userId → socketId }) */
const matchSockets = new Map<string, Map<string, string>>();

/** PvP 소켓 핸들러 등록 */
export function setupPvpSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {

    /**
     * pvp:ready — 플레이어 준비 완료
     * 양쪽 모두 준비되면 fighting 상태로 전환
     */
    socket.on('pvp:ready', async (data: { matchId: string; userId: string }) => {
      const { matchId, userId } = data;

      // 소켓 매핑 저장
      if (!matchSockets.has(matchId)) {
        matchSockets.set(matchId, new Map());
      }
      matchSockets.get(matchId)!.set(userId, socket.id);

      // 준비 상태 추적
      if (!readyMap.has(matchId)) {
        readyMap.set(matchId, new Set());
      }
      const readySet = readyMap.get(matchId)!;
      readySet.add(userId);

      // 매치 전용 룸 참가
      socket.join(`pvp:${matchId}`);

      console.log(`[PvP] ${userId} 준비 완료 (${matchId}), 현재 ${readySet.size}/2`);

      // 양쪽 준비 완료 → fighting 시작
      if (readySet.size >= 2) {
        try {
          await startMatch(matchId);
          io.to(`pvp:${matchId}`).emit('pvp:start', { matchId, status: 'fighting' });
          console.log(`[PvP] 매치 시작: ${matchId}`);
        } catch (err) {
          console.error(`[PvP] 매치 시작 실패: ${matchId}`, err);
        }
        readyMap.delete(matchId);
      }
    });

    /**
     * pvp:action — 전투 액션 (Protobuf 바이너리 또는 JSON)
     * 상대 플레이어에게 릴레이
     */
    socket.on('pvp:action', (data: unknown) => {
      let actionData: {
        matchId: string;
        characterId: string;
        actionType: string;
        targetId?: string;
        damage?: number;
        skillId?: string;
      };

      if (isBinary(data)) {
        const decoded = decodePvpAction(new Uint8Array(data));
        // matchId는 Protobuf에 없으므로 방 정보에서 추출
        const pvpRoom = Array.from(socket.rooms).find((r) => r.startsWith('pvp:'));
        const matchId = pvpRoom ? pvpRoom.slice(4) : '';
        actionData = { matchId, ...decoded };
      } else {
        actionData = data as typeof actionData;
      }

      // 같은 매치 룸의 상대에게 전달
      socket.to(`pvp:${actionData.matchId}`).emit('pvp:action', data);
    });

    /**
     * pvp:result — 매치 결과 제출
     * 서버에서 승패 확정 + ELO 업데이트 + 결과 브로드캐스트
     */
    socket.on('pvp:result', async (data: {
      matchId: string;
      winnerId: string;
      player1Score: number;
      player2Score: number;
    }) => {
      const { matchId, winnerId, player1Score, player2Score } = data;

      try {
        const eloResult = await finishMatch(matchId, winnerId, player1Score, player2Score);

        // Protobuf 인코딩으로 결과 전송
        const resultBuf = encodePvpResult({
          matchId,
          winnerId,
          player1Score,
          player2Score,
          ratingChange: eloResult.winnerChange,
        });

        io.to(`pvp:${matchId}`).emit('pvp:result', resultBuf);

        console.log(`[PvP] 매치 종료: ${matchId}, 승자: ${winnerId}, ELO 변동: +${eloResult.winnerChange}/${eloResult.loserChange}`);

        // 정리
        readyMap.delete(matchId);
        matchSockets.delete(matchId);

        // 룸에서 소켓 제거
        const sockets = await io.in(`pvp:${matchId}`).fetchSockets();
        for (const s of sockets) {
          s.leave(`pvp:${matchId}`);
        }
      } catch (err) {
        console.error(`[PvP] 결과 처리 실패: ${matchId}`, err);
        socket.emit('pvp:error', { matchId, error: '결과 처리 중 오류 발생' });
      }
    });
  });

  console.log('[PvP] 소켓 핸들러 등록 완료');
}
