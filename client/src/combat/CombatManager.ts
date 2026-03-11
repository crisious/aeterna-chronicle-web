/**
 * CombatManager.ts — 서버 전투 결과 동기화 (P5-05)
 *
 * - 스킬 사용 요청 → 서버 검증 → 결과 적용
 * - 자동 공격 요청 → 서버 동기화
 * - 버프/디버프 시각 효과 데이터
 * - 사운드 연동 (SoundManager.playSFX)
 * - 전리품 관리
 */

import { io, Socket } from 'socket.io-client';
import type { StatusEffectData } from './StatusEffectRenderer';

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 전투 유닛 공통 데이터 */
export interface CombatUnit {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense?: number;
  attackSpeed?: number;  // 1.0 기준 (높을수록 빠름)
  level: number;
  isAlly: boolean;
  buffs?: ActiveBuff[];
}

/** 스킬 슬롯 */
export interface SkillSlot {
  skillId: string;
  name: string;
  damage: number;
  damageScale?: number;
  mpCost: number;
  cooldown: number;       // 최대 쿨타임 (초)
  currentCooldown: number; // 남은 쿨타임 (초)
  element?: string;
  sfxKey?: string;
  icon?: string;
}

/** 활성 버프/디버프 */
export interface ActiveBuff {
  id: string;
  name: string;
  icon: string;
  type: 'buff' | 'debuff';
  remaining: number; // 초
  effect: Record<string, number>; // {attack: 10, defense: -5} 등
}

/** 전리품 아이템 */
export interface LootItem {
  itemId: string;
  name: string;
  quantity: number;
  grade: string;
}

// ─── 서버 이벤트 페이로드 ──────────────────────────────────────

interface AttackResultPayload {
  attackerId: string;
  targetId: string;
  damage: number;
  targetHp: number;
  isCritical: boolean;
}

interface SkillResultPayload {
  userId: string;
  targetId: string;
  skillId: string;
  damage: number;
  targetHp: number;
  mpRemaining: number;
  buffsApplied?: ActiveBuff[];
}

interface BattleEndPayload {
  result: 'victory' | 'defeat';
  loot: LootItem[];
  expGained: number;
  goldGained: number;
}

interface BuffUpdatePayload {
  unitId: string;
  buffs: ActiveBuff[];
}

/** P6-04: 상태이상 업데이트 페이로드 */
interface StatusEffectUpdatePayload {
  unitId: string;
  effects: StatusEffectData[];
}

/** P6-05: 콤보 달성 페이로드 */
interface ComboAchievedPayload {
  playerId: string;
  comboName: string;
  damageBonus: number;
  bonusDescription: string;
  hitCount: number;
  totalMultiplier: number;
  chainLabel: string | null;
}

// ─── 콜백 타입 ─────────────────────────────────────────────────

type OnAttackResult = (data: AttackResultPayload) => void;
type OnSkillResult = (data: SkillResultPayload) => void;
type OnBattleEnd = (data: BattleEndPayload) => void;
type OnBuffUpdate = (data: BuffUpdatePayload) => void;
type OnStatusEffectUpdate = (data: StatusEffectUpdatePayload) => void;
type OnComboAchieved = (data: ComboAchievedPayload) => void;

// ─── CombatManager ─────────────────────────────────────────────

export class CombatManager {
  private socket: Socket | null = null;
  private battleId?: string;

  // 서버 확정 전리품
  private loot: LootItem[] = [];

  // 콜백
  private onAttackResult?: OnAttackResult;
  private onSkillResult?: OnSkillResult;
  private onBattleEnd?: OnBattleEnd;
  private onBuffUpdate?: OnBuffUpdate;
  private onStatusEffectUpdate?: OnStatusEffectUpdate;
  private onComboAchieved?: OnComboAchieved;

  constructor(battleId?: string) {
    this.battleId = battleId;
    this._connectSocket();
  }

  // ─── 소켓 연결 ────────────────────────────────────────────────

  private _connectSocket(): void {
    try {
      const serverUrl = (typeof window !== 'undefined' && window.location)
        ? `${window.location.protocol}//${window.location.hostname}:3000`
        : 'http://localhost:3000';

      this.socket = io(serverUrl, {
        transports: ['websocket'],
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        // 전투 Room 참가
        if (this.battleId) {
          this.socket!.emit('battle:join', { battleId: this.battleId });
        }
      });

      // 서버 결과 수신
      this.socket.on('battle:attack_result', (data: AttackResultPayload) => {
        this.onAttackResult?.(data);
      });

      this.socket.on('battle:skill_result', (data: SkillResultPayload) => {
        this.onSkillResult?.(data);
      });

      this.socket.on('battle:end', (data: BattleEndPayload) => {
        this.loot = data.loot;
        this.onBattleEnd?.(data);
      });

      this.socket.on('battle:buff_update', (data: BuffUpdatePayload) => {
        this.onBuffUpdate?.(data);
      });

      // P6-04: 상태이상 업데이트 수신
      this.socket.on('battle:status_effect_update', (data: StatusEffectUpdatePayload) => {
        this.onStatusEffectUpdate?.(data);
      });

      // P6-05: 콤보 달성 수신
      this.socket.on('battle:combo_achieved', (data: ComboAchievedPayload) => {
        this.onComboAchieved?.(data);
      });
    } catch {
      // 오프라인 모드 — 소켓 없이 로컬 전투
      this.socket = null;
    }
  }

  // ─── 요청 API ────────────────────────────────────────────────

  /** 기본 공격 요청 (서버 검증) */
  requestAttack(attackerId: string, targetId: string, localDamage: number): void {
    if (this.socket?.connected) {
      this.socket.emit('battle:attack', {
        battleId: this.battleId,
        attackerId,
        targetId,
        localDamage,
      });
    }
    // 오프라인이면 로컬 데미지 그대로 사용 (BattleScene에서 처리)
  }

  /** 스킬 사용 요청 (서버 검증) */
  requestSkill(
    userId: string,
    targetId: string,
    skillId: string,
    localDamage: number,
  ): void {
    if (this.socket?.connected) {
      this.socket.emit('battle:skill', {
        battleId: this.battleId,
        userId,
        targetId,
        skillId,
        localDamage,
      });
    }
  }

  // ─── 콜백 등록 ────────────────────────────────────────────────

  setOnAttackResult(cb: OnAttackResult): void { this.onAttackResult = cb; }
  setOnSkillResult(cb: OnSkillResult): void { this.onSkillResult = cb; }
  setOnBattleEnd(cb: OnBattleEnd): void { this.onBattleEnd = cb; }
  setOnBuffUpdate(cb: OnBuffUpdate): void { this.onBuffUpdate = cb; }
  setOnStatusEffectUpdate(cb: OnStatusEffectUpdate): void { this.onStatusEffectUpdate = cb; }
  setOnComboAchieved(cb: OnComboAchieved): void { this.onComboAchieved = cb; }

  // ─── 전리품 조회 ─────────────────────────────────────────────

  /** 전투 종료 후 전리품 목록 반환 */
  getLoot(): LootItem[] {
    // 서버 데이터가 없으면 기본 전리품 생성
    if (this.loot.length === 0) {
      return [
        { itemId: 'gold_drop', name: '골드', quantity: Math.floor(50 + Math.random() * 100), grade: 'common' },
        { itemId: 'potion_hp', name: 'HP 포션', quantity: Math.floor(1 + Math.random() * 3), grade: 'common' },
      ];
    }
    return this.loot;
  }

  // ─── 정리 ────────────────────────────────────────────────────

  destroy(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
