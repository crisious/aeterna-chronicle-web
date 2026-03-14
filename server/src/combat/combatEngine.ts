// ─── 전투 엔진 코어 (P24-01/02) ───────────────────────────────
// ATB 기반 전투 루프, 상태 머신, 다수 대 다수 전투

import { v4 as uuidv4 } from 'uuid';
import { calculateDamage, DamageType, ElementType } from './damageCalculator';
import { MonsterAIEngine, MonsterAIConfig, AggroTable } from './monsterAI';
import { calculateRewards, RewardInput, RewardResult, DropEntry } from './rewardEngine';
import { checkLevelUp, LevelUpResult } from './levelUpSystem';
import { SkillCooldownManager, ManaManager, getSkillById, SkillDefinition } from './skillSystem';
import { BossPhaseManager, BossConfig, PhaseTransitionEvent, EnrageEvent } from './bossPhaseManager';
import { CombatLogger, CombatStatistics, CombatReplay } from './combatLogger';
import { statusEffectManager } from './statusEffectManager';
import { comboManager } from './comboManager';

// ─── 전투 상태 머신 ───────────────────────────────────────────

export type CombatState =
  | 'IDLE'
  | 'PREPARING'
  | 'IN_PROGRESS'
  | 'RESOLVING'
  | 'COMPLETED';

// ─── 전투 참가자 ──────────────────────────────────────────────

export interface CombatParticipant {
  id: string;
  name: string;
  isMonster: boolean;
  classId: string;
  level: number;
  /** 현재 HP */
  hp: number;
  maxHp: number;
  /** 현재 MP */
  mp: number;
  maxMp: number;
  /** 기본 스탯 */
  atk: number;
  def: number;
  matk: number;
  mdef: number;
  spd: number;
  critRate: number;
  critDamage: number;
  armorPenetration: number;
  armorPenetrationPercent: number;
  /** 속성 */
  element: ElementType;
  /** ATB 게이지 (0~100) */
  atbGauge: number;
  /** 생존 여부 */
  alive: boolean;
  /** 팀 (party / monsters) */
  team: 'party' | 'monsters';
  /** 보스 여부 */
  isBoss: boolean;
  /** 경험치 (몬스터용) */
  baseExp: number;
  /** 골드 (몬스터용) */
  baseGold: number;
  /** 드롭 테이블 (몬스터용) */
  dropTable: DropEntry[];
}

// ─── 전투 행동 ─────────────────────────────────────────────────

export type PlayerActionType = 'attack' | 'skill' | 'item' | 'defend' | 'flee';

export interface PlayerAction {
  type: PlayerActionType;
  actorId: string;
  targetId?: string;
  skillId?: string;
  itemId?: string;
}

// ─── 틱 결과 ───────────────────────────────────────────────────

export interface TickResult {
  tick: number;
  /** 이번 틱에 행동한 참가자들 */
  actions: ActionResult[];
  /** 페이즈 전환 이벤트 */
  phaseEvents: PhaseTransitionEvent[];
  /** 분노 이벤트 */
  enrageEvents: EnrageEvent[];
  /** 전투 종료 여부 */
  combatEnded: boolean;
  /** 승리 팀 */
  winner?: 'party' | 'monsters' | 'draw';
  /** 보상 (전투 종료 시) */
  rewards?: RewardResult;
  /** 레벨업 결과 */
  levelUps?: LevelUpResult[];
  /** 참가자 현재 상태 */
  participants: ParticipantSnapshot[];
}

export interface ActionResult {
  actorId: string;
  actorName: string;
  actionType: string;
  targetId: string;
  targetName: string;
  damage?: number;
  heal?: number;
  isCritical?: boolean;
  skillId?: string;
  statusEffect?: string;
}

export interface ParticipantSnapshot {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atbGauge: number;
  alive: boolean;
  team: 'party' | 'monsters';
  buffs: string[];
  debuffs: string[];
}

// ─── 전투 인스턴스 설정 ────────────────────────────────────────

export interface CombatConfig {
  /** ATB 게이지 충전 기본량 (틱당) */
  atbChargeBase: number;
  /** 틱 간격 (ms) */
  tickIntervalMs: number;
  /** 최대 틱 수 (무한 루프 방지) */
  maxTicks: number;
  /** 자동 전투 여부 */
  autoMode: boolean;
}

const DEFAULT_CONFIG: CombatConfig = {
  atbChargeBase: 10,
  tickIntervalMs: 1000,
  maxTicks: 300, // 5분 (300틱 × 1초)
  autoMode: false,
};

// ─── 전투 엔진 ─────────────────────────────────────────────────

export class CombatEngine {
  readonly combatId: string;
  private state: CombatState = 'IDLE';
  private config: CombatConfig;
  private participants = new Map<string, CombatParticipant>();
  private pendingActions = new Map<string, PlayerAction>();
  private currentTick = 0;

  // 서브시스템
  private cooldownManager = new SkillCooldownManager();
  private manaManager = new ManaManager();
  private monsterAIs = new Map<string, MonsterAIEngine>();
  private bossManagers = new Map<string, BossPhaseManager>();
  private logger: CombatLogger;

  constructor(config?: Partial<CombatConfig>) {
    this.combatId = uuidv4();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = new CombatLogger(this.combatId);
  }

  // ── 상태 조회 ───────────────────────────────────────────

  getState(): CombatState { return this.state; }
  getCombatId(): string { return this.combatId; }
  getCurrentTick(): number { return this.currentTick; }

  getParticipant(id: string): CombatParticipant | undefined {
    return this.participants.get(id);
  }

  getParticipants(): CombatParticipant[] {
    return Array.from(this.participants.values());
  }

  getSnapshot(): ParticipantSnapshot[] {
    return this.getParticipants().map(p => ({
      id: p.id,
      name: p.name,
      hp: p.hp,
      maxHp: p.maxHp,
      mp: p.mp,
      maxMp: p.maxMp,
      atbGauge: p.atbGauge,
      alive: p.alive,
      team: p.team,
      buffs: [],
      debuffs: [],
    }));
  }

  // ── 참가자 등록 ─────────────────────────────────────────

  addParticipant(p: CombatParticipant): void {
    if (this.state !== 'IDLE' && this.state !== 'PREPARING') {
      throw new Error('전투 진행 중에는 참가자를 추가할 수 없습니다.');
    }

    this.participants.set(p.id, { ...p, atbGauge: 0, alive: true });
    this.manaManager.init(p.id, p.mp, p.maxMp);
    this.logger.registerParticipant(p.id, p.name, p.isMonster);

    // 몬스터 AI 설정
    if (p.isMonster) {
      const aiConfig: MonsterAIConfig = {
        monsterId: p.id,
        tier: p.isBoss ? 'boss' : (p.level > 30 ? 'tactical' : 'basic'),
        skills: [], // 실제로는 몬스터 데이터에서 로드
        basicAttackMultiplier: 1.0,
        aggroDecayRate: 5,
      };
      this.monsterAIs.set(p.id, new MonsterAIEngine(aiConfig));

      // 보스 페이즈 매니저
      if (p.isBoss) {
        const bossConfig: BossConfig = {
          bossId: p.id,
          name: p.name,
          phases: [],
          enrage: {
            timerSeconds: 300,
            attackMultiplier: 2.0,
            speedMultiplier: 1.5,
          },
        };
        this.bossManagers.set(p.id, new BossPhaseManager(bossConfig));
      }
    }
  }

  // ── 전투 시작 ───────────────────────────────────────────

  start(): void {
    if (this.state !== 'IDLE') {
      throw new Error(`전투를 시작할 수 없는 상태: ${this.state}`);
    }

    const partyIds = this.getParticipants().filter(p => p.team === 'party').map(p => p.id);
    const monsterIds = this.getParticipants().filter(p => p.team === 'monsters').map(p => p.id);

    if (partyIds.length === 0 || monsterIds.length === 0) {
      throw new Error('파티와 몬스터 양쪽 모두 최소 1명 이상 필요합니다.');
    }

    this.state = 'IN_PROGRESS';
    this.logger.logCombatStart(partyIds, monsterIds);
  }

  // ── 플레이어 행동 입력 ──────────────────────────────────

  submitAction(action: PlayerAction): boolean {
    if (this.state !== 'IN_PROGRESS') return false;

    const actor = this.participants.get(action.actorId);
    if (!actor || !actor.alive || actor.isMonster) return false;
    if (actor.atbGauge < 100) return false;

    this.pendingActions.set(action.actorId, action);
    return true;
  }

  // ── 틱 처리 ─────────────────────────────────────────────

  processTick(): TickResult {
    if (this.state !== 'IN_PROGRESS') {
      return this.emptyTickResult();
    }

    this.currentTick++;
    this.logger.setTick(this.currentTick);

    const actions: ActionResult[] = [];
    const phaseEvents: PhaseTransitionEvent[] = [];
    const enrageEvents: EnrageEvent[] = [];

    // 1. ATB 게이지 충전
    for (const p of this.participants.values()) {
      if (!p.alive) continue;
      const spdFactor = p.spd / 100;
      p.atbGauge = Math.min(100, p.atbGauge + this.config.atbChargeBase * (1 + spdFactor));
    }

    // 2. 쿨다운 + 마나 회복
    this.cooldownManager.tick();
    this.manaManager.tickRegen();

    // 3. 상태이상 틱
    for (const p of this.participants.values()) {
      if (!p.alive) continue;
      const dotDamage = statusEffectManager.processTick(p.id);
      if (dotDamage > 0) {
        p.hp = Math.max(0, p.hp - dotDamage);
        if (p.hp <= 0) {
          p.alive = false;
          this.logger.logDeath(p.id, 'dot');
        }
      }
    }

    // 4. 행동 가능한 참가자 처리 (SPD 순)
    const readyParticipants = this.getParticipants()
      .filter(p => p.alive && p.atbGauge >= 100)
      .sort((a, b) => b.spd - a.spd);

    for (const actor of readyParticipants) {
      if (!actor.alive) continue;

      let action: PlayerAction;

      if (actor.isMonster) {
        // 몬스터 AI 행동 결정
        const ai = this.monsterAIs.get(actor.id);
        const aliveParty = this.getAliveByTeam('party');
        if (!ai || aliveParty.length === 0) continue;

        const aiAction = ai.decideAction(
          (actor.hp / actor.maxHp) * 100,
          aliveParty.map(p => p.id),
        );

        action = {
          type: aiAction.type === 'skill' ? 'skill' : 'attack',
          actorId: actor.id,
          targetId: aiAction.targetIds[0],
          skillId: aiAction.skillId,
        };
      } else {
        // 플레이어 행동
        const pending = this.pendingActions.get(actor.id);
        if (!pending) {
          if (this.config.autoMode) {
            // 자동 전투: 기본 공격
            const aliveMonsters = this.getAliveByTeam('monsters');
            if (aliveMonsters.length === 0) continue;
            action = {
              type: 'attack',
              actorId: actor.id,
              targetId: aliveMonsters[0].id,
            };
          } else {
            continue; // 수동 모드에서 행동 미입력 → 대기
          }
        } else {
          action = pending;
          this.pendingActions.delete(actor.id);
        }
      }

      // 행동 실행
      const result = this.executeAction(actor, action);
      if (result) {
        actions.push(result);
      }

      // ATB 리셋
      actor.atbGauge = 0;
    }

    // 5. 보스 페이즈 + 분노 체크
    for (const [bossId, bpm] of this.bossManagers) {
      const boss = this.participants.get(bossId);
      if (!boss || !boss.alive) continue;

      const hpPercent = (boss.hp / boss.maxHp) * 100;
      const phaseEvent = bpm.checkPhaseTransition(hpPercent);
      if (phaseEvent) {
        phaseEvents.push(phaseEvent);
        this.logger.logPhaseChange(bossId, phaseEvent.fromPhase, phaseEvent.toPhase);
      }

      const enrageEvent = bpm.tick(this.config.tickIntervalMs / 1000);
      if (enrageEvent) {
        enrageEvents.push(enrageEvent);
        this.logger.logEnrage(bossId);
      }
    }

    // 6. 몬스터 AI 틱
    for (const ai of this.monsterAIs.values()) {
      ai.processTick();
    }

    // 7. 승패 판정
    const combatEnded = this.checkWinCondition();
    let winner: 'party' | 'monsters' | 'draw' | undefined;
    let rewards: RewardResult | undefined;
    let levelUps: LevelUpResult[] | undefined;

    if (combatEnded || this.currentTick >= this.config.maxTicks) {
      const aliveParty = this.getAliveByTeam('party');
      const aliveMonsters = this.getAliveByTeam('monsters');

      if (aliveParty.length > 0 && aliveMonsters.length === 0) {
        winner = 'party';
        // 보상 계산
        const result = this.calculateCombatRewards();
        rewards = result.rewards;
        levelUps = result.levelUps;
      } else if (aliveMonsters.length > 0 && aliveParty.length === 0) {
        winner = 'monsters';
      } else {
        winner = 'draw';
      }

      this.state = 'COMPLETED';
      this.logger.logCombatEnd(winner);
    }

    return {
      tick: this.currentTick,
      actions,
      phaseEvents,
      enrageEvents,
      combatEnded: this.state === 'COMPLETED',
      winner,
      rewards,
      levelUps,
      participants: this.getSnapshot(),
    };
  }

  // ── 행동 실행 ───────────────────────────────────────────

  private executeAction(actor: CombatParticipant, action: PlayerAction): ActionResult | null {
    const target = action.targetId ? this.participants.get(action.targetId) : null;

    switch (action.type) {
      case 'attack':
        return this.executeAttack(actor, target);
      case 'skill':
        return this.executeSkill(actor, target, action.skillId);
      case 'defend':
        return this.executeDefend(actor);
      case 'flee':
        return null; // 도주 로직 (추후)
      default:
        return null;
    }
  }

  private executeAttack(actor: CombatParticipant, target: CombatParticipant | null | undefined): ActionResult | null {
    if (!target || !target.alive) return null;

    const result = calculateDamage({
      type: 'physical',
      attackStat: actor.atk,
      defenseStat: target.def,
      skillMultiplier: 1.0,
      attackerElement: actor.element,
      defenderElement: target.element,
      critRate: actor.critRate,
      critDamage: actor.critDamage,
      armorPenetration: actor.armorPenetration,
      armorPenetrationPercent: actor.armorPenetrationPercent,
      bonusMultiplier: 1.0,
      levelDifference: actor.level - target.level,
    });

    target.hp = Math.max(0, target.hp - result.damage);
    if (target.hp <= 0) {
      target.alive = false;
      this.logger.logDeath(target.id, actor.id);
    }

    // 어그로 추가
    if (target.isMonster) {
      const ai = this.monsterAIs.get(target.id);
      ai?.getAggroTable().addDamageAggro(actor.id, result.damage);
    }

    // 콤보 기록
    if (!actor.isMonster) {
      comboManager.recordSkillHit(actor.id, 'basic_attack', actor.classId, 1);
    }

    this.logger.logDamage(actor.id, target.id, result.damage, result.isCritical);

    return {
      actorId: actor.id,
      actorName: actor.name,
      actionType: 'attack',
      targetId: target.id,
      targetName: target.name,
      damage: result.damage,
      isCritical: result.isCritical,
    };
  }

  private executeSkill(
    actor: CombatParticipant,
    target: CombatParticipant | null | undefined,
    skillId?: string,
  ): ActionResult | null {
    if (!skillId || !target || !target.alive) return null;

    const skill = getSkillById(skillId);
    if (!skill) return null;

    // 쿨다운 체크
    if (!this.cooldownManager.isReady(actor.id, skillId)) return null;

    // 마나 체크 + 소모
    if (!this.manaManager.consume(actor.id, skill.manaCost)) return null;

    // 쿨다운 설정
    this.cooldownManager.useSkill(actor.id, skillId);

    // 힐 스킬 (배율 음수)
    if (skill.damageMultiplier < 0) {
      const healAmount = Math.round(Math.abs(skill.damageMultiplier) * actor.matk);
      target.hp = Math.min(target.maxHp, target.hp + healAmount);
      this.logger.logHeal(actor.id, target.id, healAmount, skillId);

      return {
        actorId: actor.id,
        actorName: actor.name,
        actionType: 'skill',
        targetId: target.id,
        targetName: target.name,
        heal: healAmount,
        skillId,
      };
    }

    // 데미지 스킬
    const dmgType: DamageType = skill.damageType;
    const result = calculateDamage({
      type: dmgType,
      attackStat: dmgType === 'physical' ? actor.atk : actor.matk,
      defenseStat: dmgType === 'physical' ? target.def : target.mdef,
      skillMultiplier: skill.damageMultiplier,
      attackerElement: skill.element,
      defenderElement: target.element,
      critRate: actor.critRate,
      critDamage: actor.critDamage,
      armorPenetration: actor.armorPenetration,
      armorPenetrationPercent: actor.armorPenetrationPercent,
      bonusMultiplier: 1.0,
      levelDifference: actor.level - target.level,
    });

    target.hp = Math.max(0, target.hp - result.damage);
    if (target.hp <= 0) {
      target.alive = false;
      this.logger.logDeath(target.id, actor.id);
    }

    // 상태이상 적용
    let appliedEffect: string | undefined;
    if (skill.statusEffect && skill.statusEffectChance) {
      if (Math.random() * 100 < skill.statusEffectChance) {
        appliedEffect = skill.statusEffect;
      }
    }

    // 어그로
    if (target.isMonster) {
      this.monsterAIs.get(target.id)?.getAggroTable().addDamageAggro(actor.id, result.damage);
    }

    // 콤보
    if (!actor.isMonster) {
      comboManager.recordSkillHit(actor.id, skillId, actor.classId, 1);
    }

    this.logger.logDamage(actor.id, target.id, result.damage, result.isCritical, skillId, skill.element);

    return {
      actorId: actor.id,
      actorName: actor.name,
      actionType: 'skill',
      targetId: target.id,
      targetName: target.name,
      damage: result.damage,
      isCritical: result.isCritical,
      skillId,
      statusEffect: appliedEffect,
    };
  }

  private executeDefend(actor: CombatParticipant): ActionResult {
    // 방어: 이번 틱 데미지 50% 감소 (간략 구현)
    return {
      actorId: actor.id,
      actorName: actor.name,
      actionType: 'defend',
      targetId: actor.id,
      targetName: actor.name,
    };
  }

  // ── 승패 판정 ───────────────────────────────────────────

  private checkWinCondition(): boolean {
    const aliveParty = this.getAliveByTeam('party');
    const aliveMonsters = this.getAliveByTeam('monsters');
    return aliveParty.length === 0 || aliveMonsters.length === 0;
  }

  // ── 보상 계산 ───────────────────────────────────────────

  private calculateCombatRewards(): { rewards: RewardResult; levelUps: LevelUpResult[] } {
    const monsters = this.getParticipants().filter(p => p.isMonster);
    const party = this.getParticipants().filter(p => p.team === 'party');

    // 전체 몬스터 보상 합산
    let totalBaseExp = 0;
    let totalBaseGold = 0;
    const allDrops: DropEntry[] = [];

    for (const m of monsters) {
      totalBaseExp += m.baseExp;
      totalBaseGold += m.baseGold;
      allDrops.push(...m.dropTable);
    }

    const avgMonsterLevel = monsters.reduce((s, m) => s + m.level, 0) / (monsters.length || 1);
    const partyAvgLevel = party.reduce((s, p) => s + p.level, 0) / (party.length || 1);
    const hasBoss = monsters.some(m => m.isBoss);

    const rewards = calculateRewards({
      monsterLevel: Math.round(avgMonsterLevel),
      baseExp: totalBaseExp,
      baseGold: totalBaseGold,
      dropTable: allDrops,
      partySize: party.length,
      partyAvgLevel: Math.round(partyAvgLevel),
      isBoss: hasBoss,
      distributionMode: 'equal',
    });

    // 레벨업 체크
    const levelUps: LevelUpResult[] = [];
    for (const p of party) {
      const result = checkLevelUp(p.level, 0, rewards.expPerMember, p.classId);
      if (result.leveled) {
        levelUps.push(result);
      }
    }

    return { rewards, levelUps };
  }

  // ── 헬퍼 ───────────────────────────────────────────────

  private getAliveByTeam(team: 'party' | 'monsters'): CombatParticipant[] {
    return this.getParticipants().filter(p => p.team === team && p.alive);
  }

  private emptyTickResult(): TickResult {
    return {
      tick: this.currentTick,
      actions: [],
      phaseEvents: [],
      enrageEvents: [],
      combatEnded: false,
      participants: this.getSnapshot(),
    };
  }

  // ── 로그/리플레이 접근 ──────────────────────────────────

  getLogger(): CombatLogger {
    return this.logger;
  }

  getStatistics(): CombatStatistics | null {
    if (this.state !== 'COMPLETED') return null;
    const aliveParty = this.getAliveByTeam('party');
    const winner = aliveParty.length > 0 ? 'party' : 'monsters';
    return this.logger.generateStatistics(winner);
  }

  getReplay(): CombatReplay | null {
    if (this.state !== 'COMPLETED') return null;
    const aliveParty = this.getAliveByTeam('party');
    const winner = aliveParty.length > 0 ? 'party' : 'monsters';
    return this.logger.generateReplay(winner);
  }
}

// ─── 전투 인스턴스 매니저 ──────────────────────────────────────

export class CombatInstanceManager {
  private instances = new Map<string, CombatEngine>();

  /** 새 전투 생성 */
  create(config?: Partial<CombatConfig>): CombatEngine {
    const engine = new CombatEngine(config);
    this.instances.set(engine.combatId, engine);
    return engine;
  }

  /** 전투 조회 */
  get(combatId: string): CombatEngine | undefined {
    return this.instances.get(combatId);
  }

  /** 전투 제거 */
  remove(combatId: string): void {
    this.instances.delete(combatId);
  }

  /** 활성 전투 수 */
  activeCount(): number {
    return Array.from(this.instances.values())
      .filter(e => e.getState() === 'IN_PROGRESS').length;
  }

  /** 완료된 전투 정리 */
  cleanup(): number {
    let cleaned = 0;
    for (const [id, engine] of this.instances) {
      if (engine.getState() === 'COMPLETED') {
        this.instances.delete(id);
        cleaned++;
      }
    }
    return cleaned;
  }
}

/** 전역 전투 인스턴스 매니저 */
export const combatInstanceManager = new CombatInstanceManager();
