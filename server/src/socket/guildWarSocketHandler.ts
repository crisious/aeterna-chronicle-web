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
import type { Server, Socket } from 'socket.io';
import {
  declareWar,
  matchWar,
  attackFortress,
  finishWar,
  getWarStatus,
  getWarState,
} from '../guild/guildWarEngine';
import { isGuildMember } from '../guild/guildMembership';
import { prisma } from '../db';
import { computePhysicalDamage } from '../combat/characterCombatStats';

/** 전쟁별 Room 이름 */
function warRoom(warId: string): string {
  return `guildwar:${warId}`;
}

export function setupGuildWarSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {

    /** 길드전 선포 */
    socket.on('guildwar:declare', async (data: { guildId: string }) => {
      const userId = socket.data.userId;
      // SECURITY-IDOR: 선포 주체가 그 길드 소속일 때만 허용(타 길드 명의 선전포고 차단)
      if (!userId || !data.guildId || !(await isGuildMember(data.guildId, userId))) {
        return socket.emit('guildwar:declare:result', { success: false, error: '길드 권한이 없습니다.' });
      }
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
    // [SECURITY] damage 는 클라가 보내지 않는다 — 서버가 공격자 캐릭터 스탯으로 산정(거점은 방어 없음 → def 0).
    socket.on('guildwar:capture', async (data: {
      warId: string;
      fortressId: string;
      guildId: string;
    }) => {
      const userId = socket.data.userId;
      // SECURITY-IDOR: 공격 주체가 그 길드 소속일 때만 허용(타 길드 명의 거점공격 차단).
      // SECURITY-TODO: data.guildId 가 warId 전쟁의 attacker/defender 중 하나인지 구조검증 추가 권장.
      if (!userId || !data.guildId || !(await isGuildMember(data.guildId, userId))) {
        return socket.emit('guildwar:error', { message: '길드 권한이 없습니다.' });
      }
      // 서버 권위 damage: 공격자 캐릭터 ATK 로 산정(거점 방어 0). attackFortress 의 clampValue 는 backstop 유지.
      const character = await prisma.character.findFirst({
        where: { userId, isActive: true },
        select: { classId: true, level: true },
      });
      if (!character) return socket.emit('guildwar:error', { message: '활성 캐릭터가 없습니다.' });
      const damage = computePhysicalDamage({ classId: character.classId, level: character.level }, 0);
      const result = await attackFortress(data.warId, data.fortressId, data.guildId, damage);

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
