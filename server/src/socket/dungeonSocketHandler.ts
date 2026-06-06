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
import type { Server, Socket } from 'socket.io';
import type { DungeonClearResult, DungeonWave } from '../dungeon/dungeonManager';
import { dungeonManager } from '../dungeon/dungeonManager';
import { prisma } from '../db';
import { computePhysicalDamage } from '../combat/characterCombatStats';

// ─── Room 이름 헬퍼 ─────────────────────────────────────────────

function dungeonRoom(runId: string): string {
  return `dungeon:${runId}`;
}

/** SECURITY-IDOR: socket.data.userId 가 해당 run 의 리더/멤버인지 검증. */
function isRunParticipant(runId: string, userId: string): boolean {
  const run = dungeonManager.getRunStatus(runId);
  if (!run) return false;
  return run.leaderId === userId || run.members.some((m) => m.userId === userId);
}

// ─── 소켓 페이로드 타입 ─────────────────────────────────────────
// SECURITY-IDOR: actor(leaderId/userId)는 payload 가 아니라 socket.data.userId(핸드셰이크 인증)를 쓴다.

interface DungeonEnterPayload {
  dungeonCode: string;
  memberIds?: string[];
}

interface DungeonWavePayload {
  // SECURITY: damageDealt 는 클라가 보내지 않는다 — 서버가 공격자 캐릭터 ATK 로 산정(리더보드 전용).
  runId: string;
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
      const leaderId = socket.data.userId; // SECURITY-IDOR: 리더 = 인증 사용자
      if (!leaderId) { if (typeof ack === 'function') ack({ ok: false, error: '인증이 필요합니다.' }); return; }
      const { dungeonCode, memberIds } = payload;
      // SECURITY-TODO: memberIds 동행자 본인 동의/캐릭터 검증(현 manager 는 레벨만 확인).
      const result = await dungeonManager.enter(dungeonCode, leaderId, memberIds ?? []);

      if (result.ok) {
        // 리더 소켓을 Room에 join
        await socket.join(dungeonRoom(result.runId));
      }

      if (typeof ack === 'function') ack(result);
    });

    // ── 웨이브 진행 ──
    socket.on('dungeon:wave', async (payload: DungeonWavePayload, ack?: (res: unknown) => void) => {
      const userId = socket.data.userId; // SECURITY-IDOR: 진행 주체 = 인증 사용자
      const { runId } = payload;
      if (!userId || !isRunParticipant(runId, userId)) {
        if (typeof ack === 'function') ack({ ok: false, error: 'run 참가자가 아닙니다.' });
        return;
      }
      // [SECURITY] 서버 권위 damageDealt: 클라 값 대신 공격자 캐릭터 ATK 로 산정(리더보드 전용, 던전
      // 몬스터 방어는 별도 조회 생략하고 def 0 기준 기본공격). 보상은 DB 산정이라 무관. (raid #246 동일 패턴)
      const character = await prisma.character.findFirst({
        where: { userId, isActive: true },
        select: { classId: true, level: true },
      });
      const damage = character
        ? computePhysicalDamage({ classId: character.classId, level: character.level }, 0)
        : 0;
      const result = await dungeonManager.advanceWave(runId, userId, damage);
      if (typeof ack === 'function') ack(result);
    });

    // ── 클리어 ──
    socket.on('dungeon:clear', async (payload: DungeonClearPayload, ack?: (res: unknown) => void) => {
      const userId = socket.data.userId;
      const { runId } = payload;
      // SECURITY-IDOR: run 참가자만 클리어 처리(타인 run 조작 차단)
      if (!userId || !isRunParticipant(runId, userId)) {
        if (typeof ack === 'function') ack({ ok: false, error: 'run 참가자가 아닙니다.' });
        return;
      }
      const result = await dungeonManager.clear(runId);
      if (typeof ack === 'function') ack(result);
    });

    // ── 실패/포기 ──
    socket.on('dungeon:fail', async (payload: DungeonFailPayload) => {
      const userId = socket.data.userId;
      const { runId, reason } = payload;
      // SECURITY-IDOR: run 참가자만 실패/포기 처리(타인 run 강제 abandon DoS 차단)
      if (!userId || !isRunParticipant(runId, userId)) return;
      if (reason === 'abandon') {
        await dungeonManager.abandon(runId);
      } else {
        await dungeonManager.fail(runId, reason ?? '전멸');
      }
    });
  });
}
