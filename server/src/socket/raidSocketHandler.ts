/**
 * raidSocketHandler.ts — 레이드 보스 소켓 이벤트 핸들러
 *
 * - raid:create   — 레이드 세션 생성
 * - raid:join     — 세션 참가
 * - raid:start    — 전투 시작
 * - raid:damage   — 데미지 처리 (DPS 기록)
 * - raid:mechanic — 보스 기믹 알림 (서버→클라이언트)
 * - raid:loot     — 전리품 결과 (서버→클라이언트)
 *
 * Room 기반 브로드캐스트 사용
 */
import { Server, Socket } from 'socket.io';
import { raidManager, LootResult } from '../raid/raidManager';

// ─── Room 이름 헬퍼 ─────────────────────────────────────────────

function raidRoom(sessionId: string): string {
  return `raid:${sessionId}`;
}

// ─── 소켓 페이로드 타입 ─────────────────────────────────────────

interface RaidCreatePayload {
  bossId: string;
  userId: string;
  guildId?: string;
}

interface RaidJoinPayload {
  sessionId: string;
  userId: string;
  role?: string;
}

interface RaidStartPayload {
  sessionId: string;
}

interface RaidDamagePayload {
  sessionId: string;
  userId: string;
  damage: number;
}

// ─── 핸들러 등록 ────────────────────────────────────────────────

export function setupRaidSocketHandlers(io: Server): void {
  // 매니저 콜백 등록 — 메카닉/클리어/실패 시 Room 브로드캐스트
  raidManager.setOnMechanic((sessionId, mechanic) => {
    io.to(raidRoom(sessionId)).emit('raid:mechanic', {
      sessionId,
      mechanic,
    });
  });

  raidManager.setOnBossDefeated((sessionId, loot: LootResult[]) => {
    io.to(raidRoom(sessionId)).emit('raid:loot', {
      sessionId,
      status: 'cleared',
      loot,
    });
  });

  raidManager.setOnSessionFailed((sessionId, reason) => {
    io.to(raidRoom(sessionId)).emit('raid:failed', {
      sessionId,
      reason,
    });
  });

  raidManager.setOnHpUpdate((sessionId, currentHp, maxHp) => {
    io.to(raidRoom(sessionId)).emit('raid:hpUpdate', {
      sessionId,
      currentHp,
      maxHp,
    });
  });

  // ── 소켓 이벤트 핸들링 ────────────────────────────────────

  io.on('connection', (socket: Socket) => {

    /**
     * raid:create — 레이드 세션 생성
     * 생성자는 자동으로 Room에 입장
     */
    socket.on('raid:create', async (data: RaidCreatePayload) => {
      try {
        const session = await raidManager.createSession(
          data.bossId,
          data.userId,
          data.guildId,
        );

        const room = raidRoom(session.sessionId);
        socket.join(room);

        socket.emit('raid:created', {
          sessionId: session.sessionId,
          bossId: session.bossId,
          maxHp: session.maxHp,
          currentHp: session.currentHp,
          minPlayers: session.minPlayers,
          maxPlayers: session.maxPlayers,
          timeLimit: session.timeLimit,
          participants: Array.from(session.participants.values()),
        });
      } catch (err) {
        socket.emit('raid:error', { message: (err as Error).message });
      }
    });

    /**
     * raid:join — 세션 참가
     * 참가자도 Room에 입장, 기존 참가자에게 알림
     */
    socket.on('raid:join', async (data: RaidJoinPayload) => {
      try {
        const session = await raidManager.joinSession(
          data.sessionId,
          data.userId,
          data.role,
        );

        const room = raidRoom(data.sessionId);
        socket.join(room);

        // 참가 알림 — Room 전체에 브로드캐스트
        io.to(room).emit('raid:playerJoined', {
          sessionId: data.sessionId,
          userId: data.userId,
          role: data.role ?? 'dps',
          totalParticipants: session.participants.size,
        });
      } catch (err) {
        socket.emit('raid:error', { message: (err as Error).message });
      }
    });

    /**
     * raid:start — 전투 시작 (최소 인원 충족 시)
     */
    socket.on('raid:start', async (data: RaidStartPayload) => {
      try {
        const session = await raidManager.startSession(data.sessionId);
        const room = raidRoom(data.sessionId);

        io.to(room).emit('raid:started', {
          sessionId: data.sessionId,
          status: 'fighting',
          currentHp: session.currentHp,
          maxHp: session.maxHp,
          timeLimit: session.timeLimit,
        });
      } catch (err) {
        socket.emit('raid:error', { message: (err as Error).message });
      }
    });

    /**
     * raid:damage — 데미지 적용 (DPS 기록)
     * 보스 HP 감소 + 메카닉 트리거 + 클리어 판정
     */
    socket.on('raid:damage', async (data: RaidDamagePayload) => {
      try {
        const result = await raidManager.applyDamage(
          data.sessionId,
          data.userId,
          data.damage,
        );

        // 개인 데미지 확인 응답
        socket.emit('raid:damageAck', {
          sessionId: data.sessionId,
          currentHp: result.currentHp,
          cleared: result.cleared,
        });

        // 메카닉/클리어/HP 업데이트는 매니저 콜백에서 Room 브로드캐스트
      } catch (err) {
        socket.emit('raid:error', { message: (err as Error).message });
      }
    });
  });
}
