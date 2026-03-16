/**
 * dungeonSocketHandler.ts — 던전 실시간 소켓 이벤트 (P5-03)
 *
 * - dungeon:enter   — 던전 입장 + Room 생성
 * - dungeon:wave    — 웨이브 진행
 * - dungeon:boss    — 보스전 알림 (서버→클라이언트)
 * - dungeon:clear   — 클리어 처리
 * - dungeon:fail    — 실패/포기
 *
 * Room 기반 브로드캐스트
 */
import { Server, Socket } from 'socket.io';
import { dungeonManager, DungeonClearResult, DungeonWave } from '../dungeon/dungeonManager';

// ─── Room 이름 헬퍼 ─────────────────────────────────────────────

function dungeonRoom(runId: string): string {
  return `dungeon:${runId}`;
}

// ─── 소켓 페이로드 타입 ─────────────────────────────────────────

interface DungeonEnterPayload {
  dungeonCode: string;
  leaderId: string;
  memberIds?: string[];
}

interface DungeonWavePayload {
  runId: string;
  userId: string;
  damageDealt?: number;
}

interface DungeonClearPayload {
  runId: string;
}

interface DungeonFailPayload {
  runId: string;
  reason?: string;
}

// ─── 핸들러 등록 ────────────────────────────────────────────────

export function setupDungeonSocketHandlers(io: Server): void {
  // 매니저 콜백 등록 — 이벤트 발생 시 Room 브로드캐스트
  dungeonManager.setOnWaveClear((runId: string, wave: number, nextWave: number | null) => {
    io.to(dungeonRoom(runId)).emit('dungeon:wave_cleared', { runId, wave, nextWave });
  });

  dungeonManager.setOnBoss((runId: string, bossWave: DungeonWave) => {
    io.to(dungeonRoom(runId)).emit('dungeon:boss', { runId, bossWave });
  });

  dungeonManager.setOnClear((runId: string, result: DungeonClearResult) => {
    io.to(dungeonRoom(runId)).emit('dungeon:clear', { runId, result });
  });

  dungeonManager.setOnFail((runId: string, reason: string) => {
    io.to(dungeonRoom(runId)).emit('dungeon:fail', { runId, reason });
  });

  io.on('connection', (socket: Socket) => {
    // ── 던전 입장 ──
    socket.on('dungeon:enter', async (payload: DungeonEnterPayload, ack?: (res: unknown) => void) => {
      const { dungeonCode, leaderId, memberIds } = payload;
      const result = await dungeonManager.enter(dungeonCode, leaderId, memberIds ?? []);

      if (result.ok) {
        // 리더 소켓을 Room에 join
        await socket.join(dungeonRoom(result.runId));
      }

      if (typeof ack === 'function') ack(result);
    });

    // ── 웨이브 진행 ──
    socket.on('dungeon:wave', async (payload: DungeonWavePayload, ack?: (res: unknown) => void) => {
      const { runId, userId, damageDealt } = payload;
      const result = await dungeonManager.advanceWave(runId, userId, damageDealt ?? 0);
      if (typeof ack === 'function') ack(result);
    });

    // ── 클리어 ──
    socket.on('dungeon:clear', async (payload: DungeonClearPayload, ack?: (res: unknown) => void) => {
      const { runId } = payload;
      const result = await dungeonManager.clear(runId);
      if (typeof ack === 'function') ack(result);
    });

    // ── 실패/포기 ──
    socket.on('dungeon:fail', async (payload: DungeonFailPayload) => {
      const { runId, reason } = payload;
      if (reason === 'abandon') {
        await dungeonManager.abandon(runId);
      } else {
        await dungeonManager.fail(runId, reason ?? '전멸');
      }
    });
  });
}
