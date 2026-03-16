// ─── 실시간 전투 소켓 핸들러 (P24-18) ─────────────────────────
// combat:start, combat:action, combat:tick, combat:end

import { Server, Socket } from 'socket.io';
import {
  combatInstanceManager,
  CombatEngine,
  PlayerAction,
  TickResult,
  CombatParticipant,
} from '../combat/combatEngine';
import type { ElementType } from '../combat/damageCalculator';
import type { DropEntry } from '../combat/rewardEngine';

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

interface CombatQueryPayload {
  combatId: string;
}

// ─── 전투 틱 루프 관리 ─────────────────────────────────────────

const activeTickLoops = new Map<string, NodeJS.Timer>();

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
      setTimeout(() => combatInstanceManager.remove(combatId), 60_000);
    }
  }, engine['config'].tickIntervalMs);

  activeTickLoops.set(combatId, interval);
}

// ─── 소켓 핸들러 등록 ──────────────────────────────────────────

export function setupCombatSocketHandler(io: Server): void {
  io.on('connection', (socket: Socket) => {

    // ── combat:start — 전투 시작 ───────────────────────────
    socket.on('combat:start', (payload: CombatStartPayload, callback?: (resp: any) => void) => {
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

        // 소켓 룸 참여
        socket.join(`combat:${engine.combatId}`);

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
    socket.on('combat:join', (payload: CombatQueryPayload) => {
      const engine = combatInstanceManager.get(payload.combatId);
      if (!engine) {
        socket.emit('combat:error', { error: '전투를 찾을 수 없습니다.' });
        return;
      }
      socket.join(`combat:${payload.combatId}`);
      socket.emit('combat:state', {
        combatId: payload.combatId,
        state: engine.getState(),
        tick: engine.getCurrentTick(),
        participants: engine.getSnapshot(),
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

      const accepted = engine.submitAction(payload.action);
      const resp = { success: accepted };
      callback?.(resp);
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
    });

    // ── disconnect 시 전투 룸 정리 ─────────────────────────
    socket.on('disconnect', () => {
      // Socket.IO가 자동으로 룸에서 제거
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
