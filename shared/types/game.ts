/**
 * shared/types/game.ts — 게임 상태 DTO
 * P10-06: 서버 ↔ 클라이언트 공유 게임 상태 타입
 */

// ─── 월드 상태 (네트워크 틱 브로드캐스트) ───────────────────

export interface WorldStateBroadcast {
  zone: string;
  timestamp: number;
  spawns: SpawnInfo[];
  activeEffects: ActiveEffectSummary;
}

export interface SpawnInfo {
  id: string;
  monsterId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  state: string;
}

export interface ActiveEffectSummary {
  [targetId: string]: Array<{
    effectId: string;
    type: string;
    remainingMs: number;
  }>;
}

// ─── 캐릭터 기본 정보 ──────────────────────────────────────

export interface CharacterInfo {
  id: string;
  name: string;
  classId: string;
  level: number;
  x?: number;
  y?: number;
  state?: string;
}

// ─── PvP 매치 상태 ──────────────────────────────────────────

export interface PvpMatchState {
  matchId: string;
  player1Id: string;
  player2Id: string;
  player1Score: number;
  player2Score: number;
  status: 'waiting' | 'active' | 'finished';
}
