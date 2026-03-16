// ─── 몬스터 AI 시스템 (P24-06/07) ─────────────────────────────
// 3단계 AI(Basic/Tactical/Boss), 어그로 테이블, 행동 결정

// ─── AI 등급 ───────────────────────────────────────────────────

export type AITier = 'basic' | 'tactical' | 'boss';

// ─── 어그로 엔트리 ─────────────────────────────────────────────

export interface AggroEntry {
  targetId: string;
  /** 누적 어그로 수치 */
  value: number;
}

// ─── 몬스터 스킬 정의 ──────────────────────────────────────────

export interface MonsterSkillDef {
  id: string;
  name: string;
  /** 데미지 배율 */
  damageMultiplier: number;
  /** 쿨다운 (틱) */
  cooldown: number;
  /** 타겟 수 (1=단일, -1=전체) */
  targetCount: number;
  /** HP% 미만일 때만 사용 (100 = 항상) */
  hpThreshold: number;
  /** 사용 확률 (%) */
  useChance: number;
  /** 부여 상태이상 */
  statusEffect?: string;
  /** 상태이상 확률 (%) */
  statusEffectChance?: number;
}

// ─── 몬스터 AI 설정 ────────────────────────────────────────────

export interface MonsterAIConfig {
  monsterId: string;
  tier: AITier;
  skills: MonsterSkillDef[];
  /** 기본 공격 배율 */
  basicAttackMultiplier: number;
  /** 어그로 감쇠율 (틱당 %, 0 = 감쇠 없음) */
  aggroDecayRate: number;
}

// ─── 행동 결정 결과 ────────────────────────────────────────────

export type ActionType = 'basic_attack' | 'skill' | 'defend' | 'flee';

export interface AIAction {
  type: ActionType;
  /** 사용할 스킬 (skill 타입일 때) */
  skillId?: string;
  /** 대상 ID(들) */
  targetIds: string[];
  /** 데미지 배율 */
  damageMultiplier: number;
}

// ─── 어그로 가중치 상수 ────────────────────────────────────────

const AGGRO_DAMAGE_WEIGHT = 1.0;
const AGGRO_HEAL_WEIGHT = 0.6;
const AGGRO_DEBUFF_WEIGHT = 1.5;
const AGGRO_TANK_BONUS = 2.0;

// ─── 어그로 테이블 관리 ────────────────────────────────────────

export class AggroTable {
  private table = new Map<string, number>();

  /** 데미지에 의한 어그로 추가 */
  addDamageAggro(targetId: string, damage: number): void {
    const current = this.table.get(targetId) ?? 0;
    this.table.set(targetId, current + damage * AGGRO_DAMAGE_WEIGHT);
  }

  /** 힐에 의한 어그로 추가 */
  addHealAggro(healerId: string, healAmount: number): void {
    const current = this.table.get(healerId) ?? 0;
    this.table.set(healerId, current + healAmount * AGGRO_HEAL_WEIGHT);
  }

  /** 디버프에 의한 어그로 추가 */
  addDebuffAggro(targetId: string, weight = 50): void {
    const current = this.table.get(targetId) ?? 0;
    this.table.set(targetId, current + weight * AGGRO_DEBUFF_WEIGHT);
  }

  /** 탱커 보너스 */
  addTankBonus(targetId: string): void {
    const current = this.table.get(targetId) ?? 0;
    this.table.set(targetId, current * AGGRO_TANK_BONUS);
  }

  /** 어그로 감쇠 (틱마다 호출) */
  decay(rate: number): void {
    if (rate <= 0) return;
    for (const [id, val] of this.table) {
      this.table.set(id, val * (1 - rate / 100));
    }
  }

  /** 최고 어그로 대상 */
  getTopTarget(): string | null {
    let maxId: string | null = null;
    let maxVal = -1;
    for (const [id, val] of this.table) {
      if (val > maxVal) { maxVal = val; maxId = id; }
    }
    return maxId;
  }

  /** 정렬된 어그로 목록 반환 */
  getSorted(): AggroEntry[] {
    return Array.from(this.table.entries())
      .map(([targetId, value]) => ({ targetId, value }))
      .sort((a, b) => b.value - a.value);
  }

  /** 대상 제거 */
  remove(targetId: string): void {
    this.table.delete(targetId);
  }

  /** 초기화 */
  clear(): void {
    this.table.clear();
  }
}

// ─── 쿨다운 추적 ──────────────────────────────────────────────

class CooldownTracker {
  private cooldowns = new Map<string, number>();

  use(skillId: string, cooldown: number): void {
    this.cooldowns.set(skillId, cooldown);
  }

  tick(): void {
    for (const [id, val] of this.cooldowns) {
      if (val <= 1) this.cooldowns.delete(id);
      else this.cooldowns.set(id, val - 1);
    }
  }

  isReady(skillId: string): boolean {
    return !this.cooldowns.has(skillId);
  }
}

// ─── 몬스터 AI 엔진 ───────────────────────────────────────────

export class MonsterAIEngine {
  private aggroTable: AggroTable;
  private cooldownTracker: CooldownTracker;
  private config: MonsterAIConfig;

  constructor(config: MonsterAIConfig) {
    this.config = config;
    this.aggroTable = new AggroTable();
    this.cooldownTracker = new CooldownTracker();
  }

  getAggroTable(): AggroTable {
    return this.aggroTable;
  }

  /** 틱 처리 (쿨다운 감소 + 어그로 감쇠) */
  processTick(): void {
    this.cooldownTracker.tick();
    this.aggroTable.decay(this.config.aggroDecayRate);
  }

  /**
   * 행동 결정
   * @param currentHpPercent 현재 HP 비율 (0~100)
   * @param availableTargets 생존 중인 대상 ID 목록
   */
  decideAction(
    currentHpPercent: number,
    availableTargets: string[],
  ): AIAction {
    if (availableTargets.length === 0) {
      return { type: 'defend', targetIds: [], damageMultiplier: 0 };
    }

    switch (this.config.tier) {
      case 'basic':
        return this.basicAI(availableTargets);
      case 'tactical':
        return this.tacticalAI(currentHpPercent, availableTargets);
      case 'boss':
        return this.bossAI(currentHpPercent, availableTargets);
    }
  }

  // ── Basic AI: 랜덤 타겟 + 기본 공격/스킬 ──────────────────

  private basicAI(targets: string[]): AIAction {
    const target = targets[Math.floor(Math.random() * targets.length)];

    // 사용 가능한 스킬 시도 (20% 확률)
    if (Math.random() < 0.2) {
      const skill = this.pickRandomSkill(100);
      if (skill) {
        return this.createSkillAction(skill, [target], targets);
      }
    }

    return {
      type: 'basic_attack',
      targetIds: [target],
      damageMultiplier: this.config.basicAttackMultiplier,
    };
  }

  // ── Tactical AI: 어그로 기반 + HP 낮은 대상 우선 ──────────

  private tacticalAI(hpPercent: number, targets: string[]): AIAction {
    // 어그로 최고 대상 우선, 없으면 랜덤
    const topTarget = this.aggroTable.getTopTarget();
    const primaryTarget = topTarget && targets.includes(topTarget)
      ? topTarget
      : targets[0];

    // HP 기반 스킬 사용
    const skill = this.pickBestSkill(hpPercent);
    if (skill) {
      return this.createSkillAction(skill, [primaryTarget], targets);
    }

    return {
      type: 'basic_attack',
      targetIds: [primaryTarget],
      damageMultiplier: this.config.basicAttackMultiplier,
    };
  }

  // ── Boss AI: 페이즈별 패턴 + 어그로 + 스킬 우선 ───────────

  private bossAI(hpPercent: number, targets: string[]): AIAction {
    const topTarget = this.aggroTable.getTopTarget();
    const primaryTarget = topTarget && targets.includes(topTarget)
      ? topTarget
      : targets[0];

    // 보스는 항상 스킬 우선
    const skill = this.pickBestSkill(hpPercent);
    if (skill) {
      return this.createSkillAction(skill, [primaryTarget], targets);
    }

    // 체력 낮으면 방어 (10% 미만, 30% 확률)
    if (hpPercent < 10 && Math.random() < 0.3) {
      return { type: 'defend', targetIds: [], damageMultiplier: 0 };
    }

    return {
      type: 'basic_attack',
      targetIds: [primaryTarget],
      damageMultiplier: this.config.basicAttackMultiplier,
    };
  }

  // ── 스킬 선택 헬퍼 ────────────────────────────────────────

  private pickRandomSkill(hpPercent: number): MonsterSkillDef | null {
    const available = this.config.skills.filter(
      s => this.cooldownTracker.isReady(s.id) && hpPercent <= s.hpThreshold,
    );
    if (available.length === 0) return null;
    const skill = available[Math.floor(Math.random() * available.length)];
    if (Math.random() * 100 < skill.useChance) return skill;
    return null;
  }

  private pickBestSkill(hpPercent: number): MonsterSkillDef | null {
    const available = this.config.skills
      .filter(s => this.cooldownTracker.isReady(s.id) && hpPercent <= s.hpThreshold)
      .sort((a, b) => b.damageMultiplier - a.damageMultiplier);

    for (const skill of available) {
      if (Math.random() * 100 < skill.useChance) return skill;
    }
    return null;
  }

  private createSkillAction(
    skill: MonsterSkillDef,
    primaryTargets: string[],
    allTargets: string[],
  ): AIAction {
    this.cooldownTracker.use(skill.id, skill.cooldown);

    const targetIds = skill.targetCount === -1
      ? allTargets
      : primaryTargets.slice(0, skill.targetCount);

    return {
      type: 'skill',
      skillId: skill.id,
      targetIds,
      damageMultiplier: skill.damageMultiplier,
    };
  }
}
