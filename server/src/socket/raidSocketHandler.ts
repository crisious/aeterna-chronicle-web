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
import type { Server, Socket } from 'socket.io';
import type { LootResult } from '../raid/raidManager';
import { raidManager } from '../raid/raidManager';
import { isGuildMember } from '../guild/guildMembership';
import { prisma } from '../db';
import { computePhysicalDamage } from '../combat/characterCombatStats';
import { allowAction, DAMAGE_ACTION_PROFILE } from '../security/actionRateLimiter';

// ─── Room 이름 헬퍼 ─────────────────────────────────────────────

function raidRoom(sessionId: string): string {
  return `raid:${sessionId}`;
}

// ─── 소켓 페이로드 타입 ─────────────────────────────────────────
// SECURITY-IDOR: actor userId 는 payload 가 아니라 socket.data.userId(핸드셰이크 인증)를 쓴다.

interface RaidCreatePayload {
  bossId: string;
  guildId?: string;
}

interface RaidJoinPayload {
  sessionId: string;
  role?: string;
}

interface RaidStartPayload {
  sessionId: string;
}

interface RaidDamagePayload {
  // SECURITY: damage 는 클라가 보내지 않는다 — 서버가 공격자 스탯×보스 방어로 산정.
  sessionId: string;
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
        const userId = socket.data.userId; // SECURITY-IDOR: 생성자 = 인증 사용자
        if (!userId) return socket.emit('raid:error', { message: '인증이 필요합니다.' });
        // 길드 레이드면 본인이 그 길드원일 때만 guildId 부여(타 길드 명의 차단), 아니면 무소속.
        const guildId = data.guildId && (await isGuildMember(data.guildId, userId))
          ? data.guildId
          : undefined;
        const session = await raidManager.createSession(
          data.bossId,
          userId,
          guildId,
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
        const userId = socket.data.userId; // SECURITY-IDOR: 참가자 = 인증 사용자
        if (!userId) return socket.emit('raid:error', { message: '인증이 필요합니다.' });
        const session = await raidManager.joinSession(
          data.sessionId,
          userId,
          data.role,
        );

        const room = raidRoom(data.sessionId);
        socket.join(room);

        // 참가 알림 — Room 전체에 브로드캐스트
        io.to(room).emit('raid:playerJoined', {
          sessionId: data.sessionId,
          userId,
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
        const userId = socket.data.userId;
        if (!userId) return socket.emit('raid:error', { message: '인증이 필요합니다.' });
        // SECURITY: 세션 참가자만 시작 가능(타인 세션 강제 시작 차단)
        const existing = raidManager.getSession(data.sessionId);
        if (!existing || !existing.participants.has(userId)) {
          return socket.emit('raid:error', { message: '세션 참가자만 시작할 수 있습니다.' });
        }
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
        const userId = socket.data.userId; // SECURITY-IDOR: 데미지 기여자 = 인증 사용자(비참가자 거부 실효화)
        if (!userId) return socket.emit('raid:error', { message: '인증이 필요합니다.' });
        // SECURITY(호출빈도): 서버 산정 damage 라도 초당 반복호출로 DPS 초과 가능 → 1인당 빈도 제한.
        if (!(await allowAction(userId, 'raid:damage', DAMAGE_ACTION_PROFILE.windowSec, DAMAGE_ACTION_PROFILE.maxPerWindow))) {
          return socket.emit('raid:error', { message: '데미지 입력이 너무 빠릅니다.' });
        }

        // SECURITY(서버 권위 damage): 클라가 보낸 damage 를 신뢰하지 않는다. 공격자 캐릭터의 클래스/레벨에서
        // ATK 를 서버가 도출하고 보스 방어력으로 damageCalculator(메인 전투 동일 공식) 산정한다.
        // (참가자 검증은 applyDamage 내부 participants.get 가 socket.data.userId 로 실효)
        // SECURITY-TODO: skillId 기반 스킬 배율은 후속(현재는 기본 공격 1.0). damageCalculator 의 크리/분산 포함.
        const session = raidManager.getSession(data.sessionId);
        if (!session) return socket.emit('raid:error', { message: '세션을 찾을 수 없습니다.' });
        const character = await prisma.character.findFirst({
          where: { userId, isActive: true },
          select: { classId: true, level: true },
        });
        if (!character) return socket.emit('raid:error', { message: '활성 캐릭터가 없습니다.' });
        const damage = computePhysicalDamage(
          { classId: character.classId, level: character.level },
          session.bossDefense,
        );

        const result = await raidManager.applyDamage(
          data.sessionId,
          userId,
          damage,
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
