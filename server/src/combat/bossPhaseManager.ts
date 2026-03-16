// ─── 보스 페이즈 매니저 (P24-15/16) ───────────────────────────
// HP% 기반 페이즈 전환, 스킬셋 변경, 소환, 분노 타이머

import type { MonsterSkillDef } from './monsterAI';

// ─── 페이즈 정의 ───────────────────────────────────────────────

export interface BossPhase {
  /** 페이즈 번호 (1부터) */
  phaseNumber: number;
  /** 이 페이즈가 활성화되는 HP% (이하) */
  hpThreshold: number;
  /** 페이즈별 스킬셋 */
  skills: MonsterSkillDef[];
  /** 페이즈 진입 시 발동 효과 */
  onEnter?: PhaseEffect;
  /** 페이즈별 공격력 배율 */
  attackMultiplier: number;
  /** 페이즈별 방어력 배율 */
  defenseMultiplier: number;
}

export type PhaseEffectType = 'summon' | 'aoe_attack' | 'heal_self' | 'buff_self' | 'debuff_all';

export interface PhaseEffect {
  type: PhaseEffectType;
  /** 소환 시 몬스터 ID 목록 */
  summonIds?: string[];
  /** 광역 공격 데미지 배율 */
  aoeDamageMultiplier?: number;
  /** 자가 힐 HP% */
  healPercent?: number;
  /** 버프/디버프 상태이상 ID */
  statusEffect?: string;
  /** 효과 설명 */
  description: string;
}

// ─── 분노(Enrage) 설정 ────────────────────────────────────────

export interface EnrageConfig {
  /** 분노 타이머 (초) */
  timerSeconds: number;
  /** 분노 시 공격력 배율 */
  attackMultiplier: number;
  /** 분노 시 속도 배율 */
  speedMultiplier: number;
  /** 분노 시 추가 효과 */
  effect?: PhaseEffect;
}

// ─── 보스 전투 설정 ────────────────────────────────────────────

export interface BossConfig {
  bossId: string;
  name: string;
  phases: BossPhase[];
  enrage?: EnrageConfig;
}

// ─── 보스 전투 상태 ────────────────────────────────────────────

export interface BossState {
  bossId: string;
  currentPhase: number;
  isEnraged: boolean;
  elapsedSeconds: number;
  /** 소환된 추가 몬스터 ID 목록 */
  summonedMobs: string[];
}

// ─── 기본 페이즈 (범용) ────────────────────────────────────────

export function createDefaultPhases(): BossPhase[] {
  return [
    {
      phaseNumber: 1,
      hpThreshold: 100,
      skills: [],
      attackMultiplier: 1.0,
      defenseMultiplier: 1.0,
    },
    {
      phaseNumber: 2,
      hpThreshold: 75,
      skills: [],
      onEnter: {
        type: 'buff_self',
        statusEffect: 'attack_up',
        description: '보스가 분노하기 시작한다!',
      },
      attackMultiplier: 1.2,
      defenseMultiplier: 1.0,
    },
    {
      phaseNumber: 3,
      hpThreshold: 50,
      skills: [],
      onEnter: {
        type: 'summon',
        summonIds: ['minion_a', 'minion_b'],
        description: '보스가 부하를 소환한다!',
      },
      attackMultiplier: 1.4,
      defenseMultiplier: 0.9,
    },
    {
      phaseNumber: 4,
      hpThreshold: 25,
      skills: [],
      onEnter: {
        type: 'aoe_attack',
        aoeDamageMultiplier: 2.0,
        description: '보스가 광역 공격을 시전한다!',
      },
      attackMultiplier: 1.6,
      defenseMultiplier: 0.8,
    },
    {
      phaseNumber: 5,
      hpThreshold: 10,
      skills: [],
      onEnter: {
        type: 'heal_self',
        healPercent: 5,
        description: '보스가 최후의 발악으로 체력을 회복한다!',
      },
      attackMultiplier: 2.0,
      defenseMultiplier: 0.7,
    },
  ];
}

// ─── 보스 페이즈 매니저 ────────────────────────────────────────

export class BossPhaseManager {
  private config: BossConfig;
  private state: BossState;

  constructor(config: BossConfig) {
    this.config = config;
    this.state = {
      bossId: config.bossId,
      currentPhase: 1,
      isEnraged: false,
      elapsedSeconds: 0,
      summonedMobs: [],
    };
  }

  getState(): BossState {
    return { ...this.state };
  }

  getCurrentPhase(): BossPhase {
    return this.config.phases.find(p => p.phaseNumber === this.state.currentPhase)
      ?? this.config.phases[0];
  }

  /**
   * HP% 변경에 따른 페이즈 전환 체크
   * @returns 페이즈 전환 이벤트 (없으면 null)
   */
  checkPhaseTransition(currentHpPercent: number): PhaseTransitionEvent | null {
    const applicablePhases = this.config.phases
      .filter(p => currentHpPercent <= p.hpThreshold && p.phaseNumber > this.state.currentPhase)
      .sort((a, b) => b.phaseNumber - a.phaseNumber);

    if (applicablePhases.length === 0) return null;

    const newPhase = applicablePhases[0];
    const oldPhase = this.state.currentPhase;
    this.state.currentPhase = newPhase.phaseNumber;

    return {
      bossId: this.config.bossId,
      fromPhase: oldPhase,
      toPhase: newPhase.phaseNumber,
      hpPercent: currentHpPercent,
      effect: newPhase.onEnter ?? null,
      newAttackMultiplier: newPhase.attackMultiplier,
      newDefenseMultiplier: newPhase.defenseMultiplier,
    };
  }

  /**
   * 틱 처리 (분노 타이머 체크)
   * @param tickSeconds 1틱의 초 단위 길이
   */
  tick(tickSeconds: number): EnrageEvent | null {
    this.state.elapsedSeconds += tickSeconds;

    if (this.config.enrage && !this.state.isEnraged) {
      if (this.state.elapsedSeconds >= this.config.enrage.timerSeconds) {
        this.state.isEnraged = true;
        return {
          bossId: this.config.bossId,
          elapsedSeconds: this.state.elapsedSeconds,
          attackMultiplier: this.config.enrage.attackMultiplier,
          speedMultiplier: this.config.enrage.speedMultiplier,
          effect: this.config.enrage.effect ?? null,
        };
      }
    }

    return null;
  }

  /** 소환 몬스터 추가 */
  addSummon(mobId: string): void {
    this.state.summonedMobs.push(mobId);
  }

  /** 소환 몬스터 제거 (처치됨) */
  removeSummon(mobId: string): void {
    const idx = this.state.summonedMobs.indexOf(mobId);
    if (idx !== -1) this.state.summonedMobs.splice(idx, 1);
  }

  /** 현재 공격력 배율 (페이즈 + 분노) */
  getAttackMultiplier(): number {
    const phase = this.getCurrentPhase();
    let mult = phase.attackMultiplier;
    if (this.state.isEnraged && this.config.enrage) {
      mult *= this.config.enrage.attackMultiplier;
    }
    return mult;
  }

  /** 현재 방어력 배율 */
  getDefenseMultiplier(): number {
    return this.getCurrentPhase().defenseMultiplier;
  }

  /** 리셋 */
  reset(): void {
    this.state = {
      bossId: this.config.bossId,
      currentPhase: 1,
      isEnraged: false,
      elapsedSeconds: 0,
      summonedMobs: [],
    };
  }
}

// ─── 이벤트 타입 ───────────────────────────────────────────────

export interface PhaseTransitionEvent {
  bossId: string;
  fromPhase: number;
  toPhase: number;
  hpPercent: number;
  effect: PhaseEffect | null;
  newAttackMultiplier: number;
  newDefenseMultiplier: number;
}

export interface EnrageEvent {
  bossId: string;
  elapsedSeconds: number;
  attackMultiplier: number;
  speedMultiplier: number;
  effect: PhaseEffect | null;
}
