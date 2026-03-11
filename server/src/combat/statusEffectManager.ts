// ─── 상태이상 시스템 (P6-04) ────────────────────────────────────
// 10종 상태이상 + 5종 버프, 확률 기반 적용, 저항 계산,
// 면역 시스템, 틱 데미지(DoT), 해제 조건 관리

// ─── 상태이상 ID 타입 ──────────────────────────────────────────

export type StatusEffectId =
  | 'poison' | 'burn' | 'freeze' | 'stun' | 'silence'
  | 'slow' | 'blind' | 'bleed' | 'curse' | 'charm';

export type BuffId =
  | 'attack_up' | 'defense_up' | 'haste' | 'regen' | 'shield';

export type EffectId = StatusEffectId | BuffId;

// ─── CC 카테고리 (면역 시스템용) ────────────────────────────────

type CCCategory = 'hard_cc' | 'soft_cc' | 'dot' | 'buff';

const CC_CATEGORY: Record<EffectId, CCCategory> = {
  // 상태이상
  poison: 'dot',
  burn: 'dot',
  freeze: 'hard_cc',
  stun: 'hard_cc',
  silence: 'soft_cc',
  slow: 'soft_cc',
  blind: 'soft_cc',
  bleed: 'dot',
  curse: 'soft_cc',
  charm: 'hard_cc',
  // 버프
  attack_up: 'buff',
  defense_up: 'buff',
  haste: 'buff',
  regen: 'buff',
  shield: 'buff',
};

// ─── 상태이상 정의 테이블 ──────────────────────────────────────

export interface StatusEffectDef {
  id: EffectId;
  name: string;
  description: string;
  defaultDuration: number;   // 초
  maxStacks: number;         // 1 = 중첩 불가
  tickInterval: number;      // 초 (0 = 틱 없음)
  isDebuff: boolean;
  icon: string;              // 클라이언트 아이콘 키
}

const STATUS_EFFECT_DEFS: Record<EffectId, StatusEffectDef> = {
  // ── 상태이상 10종 ──
  poison: {
    id: 'poison', name: '맹독',
    description: '2초마다 최대HP 3% 데미지',
    defaultDuration: 10, maxStacks: 3, tickInterval: 2,
    isDebuff: true, icon: 'icon_poison',
  },
  burn: {
    id: 'burn', name: '화상',
    description: '3초마다 고정 데미지 + 방어력 -10%',
    defaultDuration: 8, maxStacks: 1, tickInterval: 3,
    isDebuff: true, icon: 'icon_burn',
  },
  freeze: {
    id: 'freeze', name: '빙결',
    description: '이동/공격 불가',
    defaultDuration: 3, maxStacks: 1, tickInterval: 0,
    isDebuff: true, icon: 'icon_freeze',
  },
  stun: {
    id: 'stun', name: '기절',
    description: '모든 행동 불가',
    defaultDuration: 2, maxStacks: 1, tickInterval: 0,
    isDebuff: true, icon: 'icon_stun',
  },
  silence: {
    id: 'silence', name: '침묵',
    description: '스킬 사용 불가',
    defaultDuration: 5, maxStacks: 1, tickInterval: 0,
    isDebuff: true, icon: 'icon_silence',
  },
  slow: {
    id: 'slow', name: '감속',
    description: '이동속도/공격속도 -30%',
    defaultDuration: 6, maxStacks: 1, tickInterval: 0,
    isDebuff: true, icon: 'icon_slow',
  },
  blind: {
    id: 'blind', name: '실명',
    description: '명중률 -50%',
    defaultDuration: 4, maxStacks: 1, tickInterval: 0,
    isDebuff: true, icon: 'icon_blind',
  },
  bleed: {
    id: 'bleed', name: '출혈',
    description: '이동 시 추가 데미지',
    defaultDuration: 8, maxStacks: 5, tickInterval: 1,
    isDebuff: true, icon: 'icon_bleed',
  },
  curse: {
    id: 'curse', name: '저주',
    description: '힐 효과 -50%',
    defaultDuration: 10, maxStacks: 1, tickInterval: 0,
    isDebuff: true, icon: 'icon_curse',
  },
  charm: {
    id: 'charm', name: '매혹',
    description: '랜덤 타겟 공격 (아군 포함)',
    defaultDuration: 3, maxStacks: 1, tickInterval: 0,
    isDebuff: true, icon: 'icon_charm',
  },

  // ── 버프 5종 ──
  attack_up: {
    id: 'attack_up', name: '공격력 증가',
    description: '공격력 증가',
    defaultDuration: 10, maxStacks: 1, tickInterval: 0,
    isDebuff: false, icon: 'icon_atk_up',
  },
  defense_up: {
    id: 'defense_up', name: '방어력 증가',
    description: '방어력 증가',
    defaultDuration: 10, maxStacks: 1, tickInterval: 0,
    isDebuff: false, icon: 'icon_def_up',
  },
  haste: {
    id: 'haste', name: '가속',
    description: '이동속도/공격속도 증가',
    defaultDuration: 8, maxStacks: 1, tickInterval: 0,
    isDebuff: false, icon: 'icon_haste',
  },
  regen: {
    id: 'regen', name: '재생',
    description: 'HP 지속 회복',
    defaultDuration: 10, maxStacks: 1, tickInterval: 2,
    isDebuff: false, icon: 'icon_regen',
  },
  shield: {
    id: 'shield', name: '보호막',
    description: '피해 흡수 보호막',
    defaultDuration: 8, maxStacks: 1, tickInterval: 0,
    isDebuff: false, icon: 'icon_shield',
  },
};

// ─── 활성 효과 인스턴스 ────────────────────────────────────────

export interface ActiveEffect {
  effectId: EffectId;
  sourceId: string;          // 시전자 ID
  targetId: string;          // 대상 ID
  stacks: number;
  remainingDuration: number; // 초
  tickTimer: number;         // 다음 틱까지 남은 초
  value: number;             // 효과 수치 (데미지량, 버프 %, 보호막 HP 등)
  appliedAt: number;         // 적용 시각 (Date.now())
}

// ─── 저항 계산용 스탯 인터페이스 ────────────────────────────────

export interface ResistStats {
  baseResist: number;
  wis: number;
  equipResist: number;
}

// ─── 틱 데미지 결과 ────────────────────────────────────────────

export interface TickDamageResult {
  targetId: string;
  effectId: EffectId;
  damage: number;
  stacks: number;
}

// ─── 면역 기록 ─────────────────────────────────────────────────

interface ImmunityRecord {
  effectId: EffectId;
  targetId: string;
  expireAt: number; // Date.now() 기준
}

// ─── 상수 ──────────────────────────────────────────────────────

const IMMUNITY_WINDOW_MS = 3000; // 같은 CC 3초 내 재적용 시 면역

// ─── StatusEffectManager ───────────────────────────────────────

export class StatusEffectManager {
  /** targetId → 활성 효과 배열 */
  private effects: Map<string, ActiveEffect[]> = new Map();
  /** 면역 기록 */
  private immunities: ImmunityRecord[] = [];

  // ─── 효과 정의 조회 ──────────────────────────────────────────

  getDefinition(effectId: EffectId): StatusEffectDef {
    return STATUS_EFFECT_DEFS[effectId];
  }

  // ─── 저항 확률 계산 ──────────────────────────────────────────

  /**
   * 상태이상 저항률 계산
   * resistRate = baseResist + (WIS × 0.5) + equipResist
   * 최종 적용 확률 = applyChance × (1 - resistRate / 100)
   */
  calculateResistRate(stats: ResistStats): number {
    const rate = stats.baseResist + (stats.wis * 0.5) + stats.equipResist;
    return Math.min(95, Math.max(0, rate)); // 0~95% 캡
  }

  // ─── 면역 체크 ───────────────────────────────────────────────

  /** 같은 hard_cc가 3초 이내 재적용되는지 확인 */
  private isImmune(targetId: string, effectId: EffectId): boolean {
    const category = CC_CATEGORY[effectId];
    if (category !== 'hard_cc') return false; // hard_cc만 면역 적용

    const now = Date.now();
    // 만료된 면역 정리
    this.immunities = this.immunities.filter(i => i.expireAt > now);

    return this.immunities.some(
      i => i.targetId === targetId && i.effectId === effectId
    );
  }

  /** 면역 기록 추가 (hard_cc 해제 시 호출) */
  private addImmunity(targetId: string, effectId: EffectId): void {
    const category = CC_CATEGORY[effectId];
    if (category !== 'hard_cc') return;

    this.immunities.push({
      effectId,
      targetId,
      expireAt: Date.now() + IMMUNITY_WINDOW_MS,
    });
  }

  // ─── 효과 적용 ───────────────────────────────────────────────

  /**
   * 상태이상/버프 적용 시도
   * @returns 적용 성공 여부 + 사유
   */
  applyEffect(
    effectId: EffectId,
    sourceId: string,
    targetId: string,
    applyChance: number,
    targetResist: ResistStats,
    value: number,
    durationOverride?: number,
  ): { applied: boolean; reason?: string } {
    const def = STATUS_EFFECT_DEFS[effectId];
    if (!def) return { applied: false, reason: '알 수 없는 효과 ID' };

    // 버프는 저항/면역 없이 바로 적용
    if (!def.isDebuff) {
      return this._doApply(effectId, sourceId, targetId, value, durationOverride);
    }

    // 면역 체크
    if (this.isImmune(targetId, effectId)) {
      return { applied: false, reason: '면역 상태' };
    }

    // 저항 계산
    const resistRate = this.calculateResistRate(targetResist);
    const finalChance = applyChance * (1 - resistRate / 100);
    const roll = Math.random() * 100;

    if (roll >= finalChance) {
      return { applied: false, reason: `저항 성공 (확률 ${finalChance.toFixed(1)}%)` };
    }

    return this._doApply(effectId, sourceId, targetId, value, durationOverride);
  }

  /** 실제 적용 로직 (내부) */
  private _doApply(
    effectId: EffectId,
    sourceId: string,
    targetId: string,
    value: number,
    durationOverride?: number,
  ): { applied: boolean; reason?: string } {
    const def = STATUS_EFFECT_DEFS[effectId];
    const duration = durationOverride ?? def.defaultDuration;

    const targetEffects = this.effects.get(targetId) ?? [];

    // 기존 동일 효과 찾기
    const existing = targetEffects.find(e => e.effectId === effectId);

    if (existing) {
      if (def.maxStacks > 1 && existing.stacks < def.maxStacks) {
        // 중첩 추가
        existing.stacks += 1;
        existing.remainingDuration = duration; // 지속시간 갱신
        existing.appliedAt = Date.now();
        return { applied: true };
      } else if (def.maxStacks <= 1) {
        // 중첩 불가 → 지속시간만 갱신
        existing.remainingDuration = Math.max(existing.remainingDuration, duration);
        existing.value = Math.max(existing.value, value);
        existing.appliedAt = Date.now();
        return { applied: true };
      } else {
        return { applied: false, reason: `최대 중첩 (${def.maxStacks})` };
      }
    }

    // 신규 적용
    const newEffect: ActiveEffect = {
      effectId,
      sourceId,
      targetId,
      stacks: 1,
      remainingDuration: duration,
      tickTimer: def.tickInterval,
      value,
      appliedAt: Date.now(),
    };

    targetEffects.push(newEffect);
    this.effects.set(targetId, targetEffects);

    return { applied: true };
  }

  // ─── 틱 업데이트 ─────────────────────────────────────────────

  /**
   * 매 서버 틱마다 호출. 지속시간 감소 + DoT 처리
   * @param deltaSec 경과 시간 (초)
   * @param getMaxHp targetId → 최대 HP 조회 함수
   * @returns 이번 틱에 발생한 DoT 데미지 목록
   */
  tick(
    deltaSec: number,
    getMaxHp: (targetId: string) => number,
  ): TickDamageResult[] {
    const damages: TickDamageResult[] = [];

    for (const [targetId, effects] of this.effects.entries()) {
      const toRemove: number[] = [];

      for (let i = 0; i < effects.length; i++) {
        const eff = effects[i];
        eff.remainingDuration -= deltaSec;

        // 만료 체크
        if (eff.remainingDuration <= 0) {
          toRemove.push(i);
          // hard_cc 해제 → 면역 부여
          this.addImmunity(targetId, eff.effectId);
          continue;
        }

        // 틱 데미지 처리
        const def = STATUS_EFFECT_DEFS[eff.effectId];
        if (def.tickInterval > 0) {
          eff.tickTimer -= deltaSec;

          if (eff.tickTimer <= 0) {
            eff.tickTimer += def.tickInterval;
            const dmg = this._calculateTickDamage(eff, getMaxHp(targetId));
            if (dmg > 0) {
              damages.push({
                targetId,
                effectId: eff.effectId,
                damage: dmg,
                stacks: eff.stacks,
              });
            }
          }
        }
      }

      // 만료 효과 제거 (역순)
      for (let j = toRemove.length - 1; j >= 0; j--) {
        effects.splice(toRemove[j], 1);
      }

      // 빈 배열 정리
      if (effects.length === 0) {
        this.effects.delete(targetId);
      }
    }

    return damages;
  }

  /** 틱 데미지 계산 (효과 종류별) */
  private _calculateTickDamage(effect: ActiveEffect, maxHp: number): number {
    switch (effect.effectId) {
      case 'poison':
        // 2초마다 최대HP 3% × 중첩 수
        return Math.floor(maxHp * 0.03 * effect.stacks);

      case 'burn':
        // 3초마다 고정 데미지 (value 기반)
        return Math.floor(effect.value);

      case 'bleed':
        // 1초마다 고정 데미지 × 중첩 수
        return Math.floor(effect.value * effect.stacks);

      case 'regen':
        // 버프: 음수 데미지 = 힐 (호출측에서 처리)
        return -Math.floor(effect.value);

      default:
        return 0;
    }
  }

  // ─── 효과 조회 ───────────────────────────────────────────────

  /** 특정 대상의 활성 효과 목록 */
  getActiveEffects(targetId: string): ActiveEffect[] {
    return this.effects.get(targetId) ?? [];
  }

  /** 특정 효과가 활성인지 확인 */
  hasEffect(targetId: string, effectId: EffectId): boolean {
    const effects = this.effects.get(targetId);
    return effects?.some(e => e.effectId === effectId) ?? false;
  }

  /** 행동 불가 상태인지 (빙결/기절) */
  isIncapacitated(targetId: string): boolean {
    return this.hasEffect(targetId, 'freeze') || this.hasEffect(targetId, 'stun');
  }

  /** 스킬 사용 불가 상태인지 (침묵 + 행동 불가) */
  isSilenced(targetId: string): boolean {
    return this.hasEffect(targetId, 'silence') || this.isIncapacitated(targetId);
  }

  /** 매혹 상태인지 */
  isCharmed(targetId: string): boolean {
    return this.hasEffect(targetId, 'charm');
  }

  // ─── 스탯 수정자 계산 ────────────────────────────────────────

  /** 이동/공격 속도 배율 (1.0 기준, 감속/가속 반영) */
  getSpeedMultiplier(targetId: string): number {
    let multiplier = 1.0;
    const effects = this.getActiveEffects(targetId);

    for (const eff of effects) {
      if (eff.effectId === 'slow') multiplier -= 0.30;
      if (eff.effectId === 'haste') multiplier += eff.value / 100;
      if (eff.effectId === 'freeze') multiplier = 0;
    }

    return Math.max(0, multiplier);
  }

  /** 방어력 수정자 (가산) */
  getDefenseModifier(targetId: string): number {
    let modifier = 0;
    const effects = this.getActiveEffects(targetId);

    for (const eff of effects) {
      if (eff.effectId === 'burn') modifier -= 10; // 방어력 -10%
      if (eff.effectId === 'defense_up') modifier += eff.value;
    }

    return modifier;
  }

  /** 공격력 수정자 (%) */
  getAttackModifier(targetId: string): number {
    let modifier = 0;
    const effects = this.getActiveEffects(targetId);

    for (const eff of effects) {
      if (eff.effectId === 'attack_up') modifier += eff.value;
    }

    return modifier;
  }

  /** 명중률 배율 (실명 반영) */
  getAccuracyMultiplier(targetId: string): number {
    if (this.hasEffect(targetId, 'blind')) return 0.5;
    return 1.0;
  }

  /** 힐 효과 배율 (저주 반영) */
  getHealMultiplier(targetId: string): number {
    if (this.hasEffect(targetId, 'curse')) return 0.5;
    return 1.0;
  }

  /** 보호막 잔량 */
  getShieldAmount(targetId: string): number {
    const effects = this.getActiveEffects(targetId);
    const shield = effects.find(e => e.effectId === 'shield');
    return shield?.value ?? 0;
  }

  /** 보호막 데미지 흡수 (남은 데미지 반환) */
  absorbShieldDamage(targetId: string, damage: number): number {
    const effects = this.effects.get(targetId);
    if (!effects) return damage;

    const shield = effects.find(e => e.effectId === 'shield');
    if (!shield) return damage;

    if (shield.value >= damage) {
      shield.value -= damage;
      return 0;
    } else {
      const remaining = damage - shield.value;
      // 보호막 소진 → 제거
      const idx = effects.indexOf(shield);
      if (idx >= 0) effects.splice(idx, 1);
      return remaining;
    }
  }

  // ─── 효과 제거 ───────────────────────────────────────────────

  /** 특정 효과 제거 (정화 스킬 등) */
  removeEffect(targetId: string, effectId: EffectId): boolean {
    const effects = this.effects.get(targetId);
    if (!effects) return false;

    const idx = effects.findIndex(e => e.effectId === effectId);
    if (idx < 0) return false;

    // hard_cc 제거 시 면역 부여
    this.addImmunity(targetId, effectId);
    effects.splice(idx, 1);

    if (effects.length === 0) this.effects.delete(targetId);
    return true;
  }

  /** 모든 디버프 제거 (정화 스킬) */
  purgeDebuffs(targetId: string): number {
    const effects = this.effects.get(targetId);
    if (!effects) return 0;

    const beforeCount = effects.length;
    const remaining = effects.filter(e => {
      const def = STATUS_EFFECT_DEFS[e.effectId];
      if (def.isDebuff) {
        this.addImmunity(targetId, e.effectId);
        return false;
      }
      return true;
    });

    const removed = beforeCount - remaining.length;
    if (remaining.length === 0) {
      this.effects.delete(targetId);
    } else {
      this.effects.set(targetId, remaining);
    }

    return removed;
  }

  /** 대상의 모든 효과 제거 (사망 시) */
  clearAll(targetId: string): void {
    this.effects.delete(targetId);
  }

  // ─── 직렬화 (클라이언트 전송용) ──────────────────────────────

  /** 클라이언트에 보낼 효과 정보 */
  serializeForClient(targetId: string): Array<{
    effectId: EffectId;
    name: string;
    icon: string;
    isDebuff: boolean;
    stacks: number;
    remainingDuration: number;
  }> {
    const effects = this.getActiveEffects(targetId);
    return effects.map(eff => {
      const def = STATUS_EFFECT_DEFS[eff.effectId];
      return {
        effectId: eff.effectId,
        name: def.name,
        icon: def.icon,
        isDebuff: def.isDebuff,
        stacks: eff.stacks,
        remainingDuration: Math.round(eff.remainingDuration * 10) / 10,
      };
    });
  }
}

// ─── 싱글턴 인스턴스 ───────────────────────────────────────────

export const statusEffectManager = new StatusEffectManager();

// ─── 정의 테이블 Export ────────────────────────────────────────

export { STATUS_EFFECT_DEFS };
