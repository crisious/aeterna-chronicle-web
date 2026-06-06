// ─── 실시간 전투 소켓 핸들러 (P24-18) ─────────────────────────
// combat:start, combat:action, combat:tick, combat:end

import type { Server, Socket } from 'socket.io';
import type {
  CombatEngine,
  PlayerAction,
  TickResult,
  CombatParticipant} from '../combat/combatEngine';
import {
  combatInstanceManager
} from '../combat/combatEngine';
import { combatReconnectManager } from '../combat/combatReconnectManager';
import type { ElementType } from '../combat/damageCalculator';
import type { DropEntry } from '../combat/rewardEngine';
import { grantCombatGold, clearCombatReward } from '../combat/rewardGranter';
import { prisma } from '../db';

/** SECURITY-IDOR: socket.data.userId 가 characterId 를 소유하는지(전투 행동권 바인딩 게이트). */
async function ownsCharacter(userId: string | undefined, characterId: string): Promise<boolean> {
  if (!userId || !characterId) return false;
  const c = await prisma.character.findFirst({ where: { id: characterId, userId }, select: { id: true } });
  return c !== null;
}

// ─── 이벤트 페이로드 타입 ──────────────────────────────────────

interface CombatStartPayload {
  /** 파티원 정보 */
  party: ParticipantInput[];
  /** 몬스터 정보 */
  monsters: ParticipantInput[];
  /** 자동 전투 여부 */
  autoMode?: boolean;
}

interface ParticipantInput {
  id: string;
  name: string;
  classId: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  matk: number;
  mdef: number;
  spd: number;
  critRate: number;
  critDamage: number;
  armorPenetration?: number;
  armorPenetrationPercent?: number;
  element?: ElementType;
  isBoss?: boolean;
  baseExp?: number;
  baseGold?: number;
  dropTable?: DropEntry[];
}

interface CombatActionPayload {
  combatId: string;
  action: PlayerAction;
}

// CHRONO-S22: 2인 협공 페이로드
interface CombatDualTechPayload {
  combatId: string;
  actorIdA: string;
  actorIdB: string;
  techId: string;
  targetId: string;
}

// CHRONO-S64: 3인 협공 페이로드
interface CombatTripleTechPayload {
  combatId: string;
  actorIds: [string, string, string];
  techId: string;
  targetId: string;
}

interface CombatQueryPayload {
  combatId: string;
  participantId?: string;
}

// ─── 전투 틱 루프 관리 ─────────────────────────────────────────

const activeTickLoops = new Map<string, NodeJS.Timeout>();
const orphanCleanupTimers = new Map<string, NodeJS.Timeout>();

function startTickLoop(combatId: string, engine: CombatEngine, io: Server): void {
  if (activeTickLoops.has(combatId)) return;

  const interval = setInterval(() => {
    if (engine.getState() !== 'IN_PROGRESS') {
      clearInterval(interval);
      activeTickLoops.delete(combatId);
      return;
    }

    const result: TickResult = engine.processTick();

    // 전투 룸에 브로드캐스트
    io.to(`combat:${combatId}`).emit('combat:tick', result);

    // 전투 종료 시
    if (result.combatEnded) {
      // SECURITY/경제: 파티 승리 시 서버 산정 골드 자동 지급 (HTTP /combat/:id/tick 과 동일, combatId 당 1회)
      if (result.winner === 'party' && result.rewards) {
        const partyIds = engine.getSnapshot().filter((p) => p.team === 'party').map((p) => p.id);
        grantCombatGold(combatId, partyIds, result.rewards).catch((e) =>
          console.error('[combatSocket] 보상 지급 실패:', e),
        );
      }
      io.to(`combat:${combatId}`).emit('combat:end', {
        combatId,
        winner: result.winner,
        rewards: result.rewards,
        levelUps: result.levelUps,
        statistics: engine.getStatistics(),
      });

      clearInterval(interval);
      activeTickLoops.delete(combatId);

      // 60초 후 인스턴스 정리
      setTimeout(() => {
        combatInstanceManager.remove(combatId);
        clearCombatReward(combatId);
      }, 60_000);
    }
  }, engine.getTickIntervalMs());

  activeTickLoops.set(combatId, interval);
}

function stopTickLoop(combatId: string): void {
  const interval = activeTickLoops.get(combatId);
  if (!interval) return;
  clearInterval(interval);
  activeTickLoops.delete(combatId);
}

function scheduleOrphanCleanup(combatId: string): void {
  if (orphanCleanupTimers.has(combatId)) return;

  const timer = setTimeout(() => {
    orphanCleanupTimers.delete(combatId);

    const beforePrune = combatReconnectManager.getPresence(combatId);
    combatReconnectManager.pruneExpired();
    const afterPrune = combatReconnectManager.getPresence(combatId);

    if (
      beforePrune.total > 0 &&
      afterPrune.connectedCount === 0 &&
      afterPrune.recoveringCount === 0
    ) {
      stopTickLoop(combatId);
      combatInstanceManager.remove(combatId);
      combatReconnectManager.removeCombat(combatId);
    }
  }, combatReconnectManager.getGraceMs() + 100);

  orphanCleanupTimers.set(combatId, timer);
}

function registerParticipantSocket(
  io: Server,
  socket: Socket,
  combatId: string,
  participantId: string,
): { reconnected: boolean } {
  const result = combatReconnectManager.register(combatId, participantId, socket.id);
  if (result.previousSocketId) {
    const previousSocket = io.sockets.sockets.get(result.previousSocketId);
    previousSocket?.emit('combat:session_replaced', { combatId, participantId });
    previousSocket?.leave(`combat:${combatId}`);
  }
  return { reconnected: result.reconnected };
}

// ─── 소켓 핸들러 등록 ──────────────────────────────────────────

export function setupCombatSocketHandler(io: Server): void {
  // SECURITY: combat:start/join 의 참가자-소켓 바인딩(전투 행동권)은 이제 socket.data.userId 소유
  // 캐릭터일 때만 등록한다(ownsCharacter 게이트) → 타인 캐릭터 제어권 선점 차단. canControl 신뢰사슬의
  // 최초 바인딩 출처가 검증됨. damage 발동 가능여부는 combatEngine 이 서버 산정(value 권위 충족).
  // SECURITY-TODO(잔여, 큰 작업): combat:start 의 party 스탯/골드 수령자(p.id)는 여전히 클라값 —
  // HTTP combatRoutes 처럼 payload party 를 캐릭터 id+소유검증→서버 스탯(CLASS_BASE) 도출로 재작성 필요.
  // 단 라이브 클라는 HTTP /combat/start 사용(dead-on-client)이라 우선순위 낮음.
  io.on('connection', (socket: Socket) => {

    // ── combat:start — 전투 시작 ───────────────────────────
    socket.on('combat:start', async (payload: CombatStartPayload, callback?: (resp: any) => void) => {
      try {
        const engine = combatInstanceManager.create({
          autoMode: payload.autoMode ?? false,
        });

        // 파티원 등록
        for (const p of payload.party) {
          engine.addParticipant(toParticipant(p, 'party'));
        }

        // 몬스터 등록
        for (const m of payload.monsters) {
          engine.addParticipant(toParticipant(m, 'monsters'));
        }

        // 전투 시작
        engine.start();

        // 소켓 룸 참여. SECURITY-IDOR: 이 소켓은 본인 소유 캐릭터에만 전투 행동권을 바인딩한다
        // (이전엔 party 의 모든 id 를 바인딩해 타인 캐릭터까지 제어 가능했음). 타 파티원은 각자 combat:join.
        // SECURITY-TODO(잔여): party 스탯/골드 수령자(p.id)는 여전히 클라값 — 서버권위 party(HTTP /combat/start
        // 처럼 캐릭터 id+소유검증→서버 스탯 도출)는 별도 큰 작업. 현재는 행동권 바인딩만 소유게이트.
        socket.join(`combat:${engine.combatId}`);
        for (const p of payload.party) {
          if (await ownsCharacter(socket.data.userId, p.id)) {
            registerParticipantSocket(io, socket, engine.combatId, p.id);
          }
        }

        // 틱 루프 시작
        startTickLoop(engine.combatId, engine, io);

        const resp = {
          success: true,
          combatId: engine.combatId,
          participants: engine.getSnapshot(),
        };

        callback?.(resp);
        socket.emit('combat:started', resp);

      } catch (err: any) {
        const errResp = { success: false, error: err.message };
        callback?.(errResp);
        socket.emit('combat:error', errResp);
      }
    });

    // ── combat:join — 기존 전투 참관 ───────────────────────
    socket.on('combat:join', async (payload: CombatQueryPayload) => {
      const engine = combatInstanceManager.get(payload.combatId);
      if (!engine) {
        socket.emit('combat:error', { error: '전투를 찾을 수 없습니다.' });
        return;
      }
      socket.join(`combat:${payload.combatId}`);
      // SECURITY-IDOR: 본인 소유 캐릭터일 때만 전투 행동권 바인딩(타 참가자 제어권 선점 차단). 미소유면 관전만.
      const recovery = payload.participantId && (await ownsCharacter(socket.data.userId, payload.participantId))
        ? registerParticipantSocket(io, socket, payload.combatId, payload.participantId)
        : { reconnected: false };
      socket.emit('combat:state', {
        combatId: payload.combatId,
        state: engine.getState(),
        tick: engine.getCurrentTick(),
        participants: engine.getSnapshot(),
        recovery,
      });
    });

    // ── combat:action — 행동 입력 ──────────────────────────
    socket.on('combat:action', (payload: CombatActionPayload, callback?: (resp: any) => void) => {
      const engine = combatInstanceManager.get(payload.combatId);
      if (!engine) {
        const err = { success: false, error: '전투를 찾을 수 없습니다.' };
        callback?.(err);
        return;
      }

      if (!combatReconnectManager.canControl(payload.combatId, payload.action.actorId, socket.id)) {
        const err = { success: false, error: '이 소켓은 해당 참가자의 전투 행동 권한이 없습니다.' };
        callback?.(err);
        socket.emit('combat:error', err);
        return;
      }

      const accepted = engine.submitAction(payload.action);
      const resp = { success: accepted };
      callback?.(resp);
    });

    // ── combat:dual_tech — 2인 협공 (CHRONO-S22) ───────────
    socket.on('combat:dual_tech', (payload: CombatDualTechPayload, callback?: (resp: any) => void) => {
      const engine = combatInstanceManager.get(payload.combatId);
      if (!engine) {
        callback?.({ success: false, error: '전투를 찾을 수 없습니다.' });
        return;
      }

      // 양쪽 actor 모두 socket 권한 보유 확인
      const canA = combatReconnectManager.canControl(payload.combatId, payload.actorIdA, socket.id);
      const canB = combatReconnectManager.canControl(payload.combatId, payload.actorIdB, socket.id);
      if (!canA || !canB) {
        const err = { success: false, error: '협공 발동 권한이 없습니다 (한쪽 또는 양쪽 actor 미허용).' };
        callback?.(err);
        socket.emit('combat:error', err);
        return;
      }

      const accepted = engine.submitDualTech(
        payload.actorIdA,
        payload.actorIdB,
        payload.techId,
        payload.targetId,
      );
      callback?.({
        success: accepted,
        error: accepted ? undefined : '협공 발동 불가 (ATB/클래스/MP/techId 검증 실패).',
      });
    });

    // ── combat:triple_tech — 3인 협공 (CHRONO-S64) ─────────
    socket.on('combat:triple_tech', (payload: CombatTripleTechPayload, callback?: (resp: any) => void) => {
      const engine = combatInstanceManager.get(payload.combatId);
      if (!engine) {
        callback?.({ success: false, error: '전투를 찾을 수 없습니다.' });
        return;
      }

      // 3-actor 모두 socket 권한 검증
      const allOk = payload.actorIds.every((aid) =>
        combatReconnectManager.canControl(payload.combatId, aid, socket.id),
      );
      if (!allOk) {
        const err = { success: false, error: '3인 협공 발동 권한 부족 (한 명 이상 미허용).' };
        callback?.(err);
        socket.emit('combat:error', err);
        return;
      }

      const accepted = engine.submitTripleTech(payload.actorIds, payload.techId, payload.targetId);
      callback?.({
        success: accepted,
        error: accepted ? undefined : '3인 협공 발동 불가 (ATB/클래스/MP/techId 검증 실패).',
      });
    });

    // ── combat:state — 상태 조회 ───────────────────────────
    socket.on('combat:state', (payload: CombatQueryPayload) => {
      const engine = combatInstanceManager.get(payload.combatId);
      if (!engine) {
        socket.emit('combat:error', { error: '전투를 찾을 수 없습니다.' });
        return;
      }

      socket.emit('combat:state', {
        combatId: payload.combatId,
        state: engine.getState(),
        tick: engine.getCurrentTick(),
        participants: engine.getSnapshot(),
      });
    });

    // ── combat:log — 전투 로그 조회 ────────────────────────
    socket.on('combat:log', (payload: CombatQueryPayload) => {
      const engine = combatInstanceManager.get(payload.combatId);
      if (!engine) {
        socket.emit('combat:error', { error: '전투를 찾을 수 없습니다.' });
        return;
      }

      socket.emit('combat:log', {
        combatId: payload.combatId,
        entries: engine.getLogger().getEntries(),
      });
    });

    // ── combat:leave — 전투 퇴장 ───────────────────────────
    socket.on('combat:leave', (payload: CombatQueryPayload) => {
      socket.leave(`combat:${payload.combatId}`);
      combatReconnectManager.markCombatSocketDisconnected(payload.combatId, socket.id);
      scheduleOrphanCleanup(payload.combatId);
    });

    // ── disconnect 시 전투 룸 정리 ─────────────────────────
    socket.on('disconnect', () => {
      const sessions = combatReconnectManager.markSocketDisconnected(socket.id);
      for (const session of sessions) {
        scheduleOrphanCleanup(session.combatId);
      }
    });
  });
}

// ─── 헬퍼 ──────────────────────────────────────────────────────

function toParticipant(
  input: ParticipantInput,
  team: 'party' | 'monsters',
): CombatParticipant {
  return {
    id: input.id,
    name: input.name,
    isMonster: team === 'monsters',
    classId: input.classId,
    level: input.level,
    hp: input.hp,
    maxHp: input.maxHp,
    mp: input.mp,
    maxMp: input.maxMp,
    atk: input.atk,
    def: input.def,
    matk: input.matk,
    mdef: input.mdef,
    spd: input.spd,
    critRate: input.critRate,
    critDamage: input.critDamage,
    armorPenetration: input.armorPenetration ?? 0,
    armorPenetrationPercent: input.armorPenetrationPercent ?? 0,
    element: input.element ?? 'neutral',
    atbGauge: 0,
    alive: true,
    team,
    isBoss: input.isBoss ?? false,
    baseExp: input.baseExp ?? 0,
    baseGold: input.baseGold ?? 0,
    dropTable: input.dropTable ?? [],
  };
}
