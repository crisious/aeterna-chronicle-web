/**
 * worldSocketHandler.ts — 월드맵 실시간 소켓 이벤트 (P5-04)
 *
 * - world:move   — 존 이동 요청 + Room 전환
 * - world:enter  — 존 진입 브로드캐스트 (서버→클라이언트)
 * - world:leave  — 존 퇴장 브로드캐스트 (서버→클라이언트)
 *
 * Zone Room 기반 브로드캐스트로 같은 존 플레이어에게 진입/퇴장 알림
 */
import type { Server, Socket } from 'socket.io';
import { worldManager } from '../world/worldManager';

// ─── Room 이름 헬퍼 ─────────────────────────────────────────────

function zoneRoom(zoneCode: string): string {
  return `zone:${zoneCode}`;
}

// ─── 소켓 페이로드 타입 ─────────────────────────────────────────

// SECURITY-IDOR: actor userId 는 payload 가 아니라 socket.data.userId(핸드셰이크 인증)를 쓴다.
// (이전에는 payload.userId 로 타인 명의 존이동/위치 위조가 가능했다)
interface WorldMovePayload {
  targetZoneCode: string;
}

interface WorldTeleportPayload {
  targetZoneCode: string;
}

// ─── 유저 → 현재 존 코드 추적 ──────────────────────────────────

const userCurrentZone = new Map<string, string>();

function isZoneTransitionPayload(payload: unknown): payload is WorldMovePayload {
  if (!payload || typeof payload !== 'object') return false;
  const data = payload as Partial<WorldMovePayload>;
  return typeof data.targetZoneCode === 'string'
    && data.targetZoneCode.trim().length > 0;
}

function ackInvalidPayload(ack: ((res: unknown) => void) | undefined): void {
  if (typeof ack === 'function') {
    ack({ ok: false, error: 'targetZoneCode는 필수입니다.' });
  }
}

// ─── 핸들러 등록 ────────────────────────────────────────────────

export function setupWorldSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    // ── 존 이동 ──
    socket.on('world:move', async (payload: WorldMovePayload, ack?: (res: unknown) => void) => {
      const userId = socket.data.userId; // SECURITY-IDOR: 이동 주체 = 인증 사용자
      if (!userId || !isZoneTransitionPayload(payload)) {
        ackInvalidPayload(ack);
        return;
      }

      const { targetZoneCode } = payload;

      try {
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
      } catch (err) {
        console.error('[WorldSocket] world:move 처리 실패:', err);
        if (typeof ack === 'function') ack({ ok: false, error: '월드 이동 처리 중 오류가 발생했습니다.' });
      }
    });

    // ── 텔레포트 ──
    socket.on('world:teleport', async (payload: WorldTeleportPayload, ack?: (res: unknown) => void) => {
      const userId = socket.data.userId; // SECURITY-IDOR: 텔레포트 주체 = 인증 사용자
      if (!userId || !isZoneTransitionPayload(payload)) {
        ackInvalidPayload(ack);
        return;
      }

      const { targetZoneCode } = payload;

      try {
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
      } catch (err) {
        console.error('[WorldSocket] world:teleport 처리 실패:', err);
        if (typeof ack === 'function') ack({ ok: false, error: '월드 텔레포트 처리 중 오류가 발생했습니다.' });
      }
    });

    // ── 연결 해제 시 퇴장 처리 ──
    // socket.data.userId(인증값)로 현재 존을 정리한다. 이전에는 socket↔userId 역매핑이 없어
    // userCurrentZone 와 zone-leave 브로드캐스트가 누락돼 좀비 존 상태가 잔존했다.
    socket.on('disconnect', () => {
      const userId = socket.data.userId;
      if (!userId) return;
      const prevZone = userCurrentZone.get(userId);
      if (prevZone) {
        socket.to(zoneRoom(prevZone)).emit('world:leave', { userId, zoneCode: prevZone });
        userCurrentZone.delete(userId);
      }
    });
  });
}
