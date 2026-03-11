/**
 * guildWarSocketHandler.ts — 길드전 실시간 소켓 핸들러 (P6-07)
 *
 * 이벤트:
 *   guildwar:declare  — 길드전 선포
 *   guildwar:match    — 매칭 요청
 *   guildwar:capture  — 거점 공격
 *   guildwar:result   — 전쟁 종료 요청
 *   guildwar:status   — 전쟁 상태 조회
 */
import { Server, Socket } from 'socket.io';
import {
  declareWar,
  matchWar,
  attackFortress,
  finishWar,
  getWarStatus,
  getWarState,
} from '../guild/guildWarEngine';

/** 전쟁별 Room 이름 */
function warRoom(warId: string): string {
  return `guildwar:${warId}`;
}

export function setupGuildWarSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {

    /** 길드전 선포 */
    socket.on('guildwar:declare', async (data: { guildId: string }) => {
      const result = await declareWar(data.guildId);
      socket.emit('guildwar:declare:result', result);

      if (result.success && result.warId) {
        socket.join(warRoom(result.warId));

        // 자동 매칭 시도
        const matchResult = await matchWar(result.warId);
        socket.emit('guildwar:match:result', matchResult);

        if (matchResult.success && matchResult.warId) {
          // 양쪽 길드에 전쟁 시작 알림
          io.to(warRoom(matchResult.warId)).emit('guildwar:started', {
            warId: matchResult.warId,
            defenderId: matchResult.defenderId,
          });
        }
      }
    });

    /** 매칭 요청 (수동) */
    socket.on('guildwar:match', async (data: { warId: string }) => {
      const result = await matchWar(data.warId);
      socket.emit('guildwar:match:result', result);

      if (result.success && result.warId) {
        io.to(warRoom(result.warId)).emit('guildwar:started', {
          warId: result.warId,
          defenderId: result.defenderId,
        });
      }
    });

    /** 전쟁 Room 참가 */
    socket.on('guildwar:join', (data: { warId: string }) => {
      socket.join(warRoom(data.warId));
    });

    /** 거점 공격 */
    socket.on('guildwar:capture', async (data: {
      warId: string;
      fortressId: string;
      guildId: string;
      damage: number;
    }) => {
      const result = await attackFortress(data.warId, data.fortressId, data.guildId, data.damage);

      // 전체 참가자에게 거점 상태 브로드캐스트
      io.to(warRoom(data.warId)).emit('guildwar:fortress:update', {
        warId: data.warId,
        fortressId: data.fortressId,
        ...result,
      });

      // 점령 성공 시 알림
      if (result.captured) {
        io.to(warRoom(data.warId)).emit('guildwar:fortress:captured', {
          warId: data.warId,
          fortressId: data.fortressId,
          capturedBy: result.capturedBy,
        });

        // 모든 거점이 한 쪽에 점령되었는지 확인 (조기 종료)
        const state = getWarState(data.warId);
        if (state) {
          const owners = Object.values(state).map((f) => f.owner).filter(Boolean);
          const allSameOwner = owners.length === 3 && new Set(owners).size === 1;
          if (allSameOwner) {
            const warResult = await finishWar(data.warId);
            if (warResult) {
              io.to(warRoom(data.warId)).emit('guildwar:finished', warResult);
            }
          }
        }
      }
    });

    /** 전쟁 종료 요청 (관리자/타이머) */
    socket.on('guildwar:result', async (data: { warId: string }) => {
      const result = await finishWar(data.warId);
      if (result) {
        io.to(warRoom(data.warId)).emit('guildwar:finished', result);
      }
    });

    /** 전쟁 상태 조회 */
    socket.on('guildwar:status', async (data: { warId: string }) => {
      const status = await getWarStatus(data.warId);
      socket.emit('guildwar:status:result', status);
    });
  });

  console.log('[GuildWar] 소켓 핸들러 등록 완료');
}
