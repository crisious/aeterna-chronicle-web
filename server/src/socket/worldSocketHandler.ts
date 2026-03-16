/**
 * worldSocketHandler.ts — 월드맵 실시간 소켓 이벤트 (P5-04)
 *
 * - world:move   — 존 이동 요청 + Room 전환
 * - world:enter  — 존 진입 브로드캐스트 (서버→클라이언트)
 * - world:leave  — 존 퇴장 브로드캐스트 (서버→클라이언트)
 *
 * Zone Room 기반 브로드캐스트로 같은 존 플레이어에게 진입/퇴장 알림
 */
import { Server, Socket } from 'socket.io';
import { worldManager } from '../world/worldManager';

// ─── Room 이름 헬퍼 ─────────────────────────────────────────────

function zoneRoom(zoneCode: string): string {
  return `zone:${zoneCode}`;
}

// ─── 소켓 페이로드 타입 ─────────────────────────────────────────

interface WorldMovePayload {
  userId: string;
  targetZoneCode: string;
}

interface WorldTeleportPayload {
  userId: string;
  targetZoneCode: string;
}

// ─── 유저 → 현재 존 코드 추적 ──────────────────────────────────

const userCurrentZone = new Map<string, string>();

// ─── 핸들러 등록 ────────────────────────────────────────────────

export function setupWorldSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    // ── 존 이동 ──
    socket.on('world:move', async (payload: WorldMovePayload, ack?: (res: unknown) => void) => {
      const { userId, targetZoneCode } = payload;

      // 이동 전 현재 존 퇴장 브로드캐스트
      const prevZone = userCurrentZone.get(userId);
      if (prevZone) {
        socket.to(zoneRoom(prevZone)).emit('world:leave', { userId, zoneCode: prevZone });
        await socket.leave(zoneRoom(prevZone));
      }

      // 이동 처리
      const result = await worldManager.moveToZone(userId, targetZoneCode);

      if (result.ok) {
        // 새 존 Room 참가
        await socket.join(zoneRoom(targetZoneCode));
        userCurrentZone.set(userId, targetZoneCode);

        // 진입 브로드캐스트 (자신 제외)
        socket.to(zoneRoom(targetZoneCode)).emit('world:enter', {
          userId,
          zone: result.zone,
          position: result.position,
        });
      }

      if (typeof ack === 'function') ack(result);
    });

    // ── 텔레포트 ──
    socket.on('world:teleport', async (payload: WorldTeleportPayload, ack?: (res: unknown) => void) => {
      const { userId, targetZoneCode } = payload;

      // 이전 존 퇴장
      const prevZone = userCurrentZone.get(userId);
      if (prevZone) {
        socket.to(zoneRoom(prevZone)).emit('world:leave', { userId, zoneCode: prevZone });
        await socket.leave(zoneRoom(prevZone));
      }

      const result = await worldManager.teleportToHub(userId, targetZoneCode);

      if (result.ok) {
        await socket.join(zoneRoom(targetZoneCode));
        userCurrentZone.set(userId, targetZoneCode);

        socket.to(zoneRoom(targetZoneCode)).emit('world:enter', {
          userId,
          zone: result.zone,
          position: { x: 0, y: 0 },
        });
      }

      if (typeof ack === 'function') ack(result);
    });

    // ── 연결 해제 시 퇴장 처리 ──
    socket.on('disconnect', () => {
      // 소켓 ID로 userId 역추적은 별도 매핑 필요 — 현재는 Room 자동 정리에 의존
    });
  });
}
