// ─── 전투 엔진 코어 (P24-01/02) ───────────────────────────────
// ATB 기반 전투 루프, 상태 머신, 다수 대 다수 전투

import { v4 as uuidv4 } from 'uuid';
import type { DamageType, ElementType } from './damageCalculator';
import { calculateDamage } from './damageCalculator';
import {
  applyHpRegen,
  applyLifesteal,
  applyMoveDamageAura,
  applyMpRegen,
  computeCritEchoDamage,
  computeProjectileReflectDamage,
  computeReflectDamage,
  getEffectiveAtk,
  getEffectiveDef,
  rollMiss,
  scheduleAutoResurrect,
  tryAutoResurrect,
  tryCheatDeath,
} from './passiveCombatHooks';
import type { MonsterAIConfig} from './monsterAI';
import { MonsterAIEngine } from './monsterAI';
import type { RewardResult, DropEntry } from './rewardEngine';
import { calculateRewards } from './rewardEngine';
import type { LevelUpResult } from './levelUpSystem';
import { checkLevelUp } from './levelUpSystem';
import { SkillCooldownManager, ManaManager, getSkillById } from './skillSystem';
import type { BossConfig, PhaseTransitionEvent, EnrageEvent } from './bossPhaseManager';
import { BossPhaseManager } from './bossPhaseManager';
import type { CombatStatistics, CombatReplay } from './combatLogger';
import { CombatLogger } from './combatLogger';
import type { EffectId } from './statusEffectManager';
import { statusEffectManager } from './statusEffectManager';
import { comboManager } from './comboManager';
import { ATB_MAX, computeChargeDelta } from './atb';
import type { ATBMode, ATBSpeedTier } from '../../../shared/types/atb';
import {
  chronoEraToSpeedTier,
  chronoEraToAIHints,
  type ChronoEraId,
} from '../../../shared/types/chronoEraAtb';
import { resolveDualTech, getDualTechById } from '../../../shared/types/dualTech';
import { resolveTripleTech, getTripleTechById } from '../../../shared/types/tripleTech';

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

  // ── Phase 55-S1: 패시브 효과 modifier (선택, 기본 0) ──────────
  /** 회피율 가산 (백분율, evasion_up 패시브 누적) */
  evasionAddPercent?: number;
  /** 명중률 가산 (백분율, bonus_hit_chance 패시브 누적) */
  hitChanceAddPercent?: number;
  /** 매 턴 MP 회복량 (mp_regen 패시브 누적) */
  mpRegenPerTurn?: number;
  /** 저체력(<30%) 시 ATK 증가율 (low_hp_atk_up 패시브 누적) */
  lowHpAtkBonusPercent?: number;
  /** 피격 시 임시 DEF 증가율 (defense_up_conditional 패시브 누적) */
  defenseUpConditionalPercent?: number;

  // ── Phase 55-S3: 트리거 패시브 modifier ──────────────────────
  /** physical 피격 시 attacker 에 반사 비율(%) — reflect 패시브 */
  reflectPercent?: number;
  /** magical 피격 시 attacker 에 반사 비율(%) — projectile_reflect 패시브 */
  projectileReflectPercent?: number;
  /** 매 턴 HP 회복량 — battle_regen 패시브 */
  hpRegenPerTurn?: number;
  /** 사망 모면 잔여 횟수 — cheat_death 패시브. addParticipant 시 cheatDeathChargesMax 로 초기화. */
  cheatDeathChargesRemaining?: number;
  /** 사망 모면 최대 횟수 (디버그/UI 노출용) */
  cheatDeathChargesMax?: number;

  // ── Phase 55-S5: Phase 4 부분 — crit_echo / move_damage_aura ──
  /** 크리티컬 시 추가 데미지 비율(%) — crit_echo 패시브 */
  critEchoPercent?: number;
  /** 매 tick 적군 전체에 가하는 광역 데미지 — move_damage_aura 패시브 */
  moveDamageAuraValue?: number;

  // ── Phase 55-S6: auto_resurrect 패시브 ──────────────────────
  /** 사망 후 부활 대기 tick 수 (skillSeeds.duration). 0 이면 즉시(다음 tick) */
  autoResurrectDelay?: number;
  /** 부활 시 hp 비율 (0~100) */
  autoResurrectHpPercent?: number;
  /** 잔여 부활 횟수 (전투당). addParticipant 시 chargesMax 로 초기화 */
  autoResurrectChargesRemaining?: number;
  /** 부활 가능 횟수 최대치 (디버그/UI 노출용) */
  autoResurrectChargesMax?: number;
  /** 사망 시 set 되는 부활 예약 tick. 부활 후 undefined */
  resurrectAtTick?: number;

  // ── Phase 55-S7: poison_amplify ────────────────────────────
  /** 시전자가 가한 DoT(poison/burn/bleed) 데미지 증폭 비율(%) */
  poisonAmplifyPercent?: number;

  // ── P56-S3: drain_amplify (lifesteal 증폭) ─────────────────
  /** lifesteal 효과 증폭 비율(%) — applyLifesteal 에서 사용 */
  drainAmplifyPercent?: number;

  // ── CHRONO-S43: 누적 보스 저항 카운트 ───────────────────────
  /** 받은 Dual Tech 횟수. 보스 한정으로 저항 강화 (0.05 / hit, 최대 cap 0.3) */
  dualTechHitsTaken?: number;

  // ── CHRONO-S66: Triple Tech 누적 보스 저항 ─────────────────
  /** 받은 Triple Tech 횟수. 보스 한정 0.1 / hit 저항 강화. */
  tripleTechHitsTaken?: number;

  // ── CHRONO-S81: 협공 완전 면역 (특수 보스용) ───────────────
  /** true 시 Dual/Triple Tech 발동 거부 — 일부 raid 보스 등 특수 케이스용. */
  dualTechImmune?: boolean;
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

/** CHRONO-S60: 이번 tick 에 발동 가능한 Triple Tech 후보. */
export interface TripleTechCandidate {
  techId: string;
  name: string;
  /** 협공 세 actor (party member id). 정렬됨. */
  actorIds: [string, string, string];
  element: string;
  aoe: boolean;
  mpCost: number;
}

/** CHRONO-S14: 이번 tick 에 발동 가능한 Dual Tech 후보. */
export interface DualTechCandidate {
  /** DualTechDef.id (예: 'chrono_blade'). */
  techId: string;
  /** DualTechDef.name (UI 표시). */
  name: string;
  /** 협공 두 actor (party member id). 정렬됨. */
  actorIds: [string, string];
  /** CHRONO-S45: 속성 (UI 색상/SFX 선택 hint). */
  element: string;
  /** CHRONO-S45: 광역 협공 여부 (UI 표시). */
  aoe: boolean;
  /** CHRONO-S45: MP 비용 (양쪽 각자). UI 가 부족 시 disable 가능. */
  mpCost: number;
}

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
  /** CHRONO-S14: 이번 tick 에 발동 가능한 협공 후보 (ready 동시 + 호환 클래스). */
  dualTechCandidates: DualTechCandidate[];
  /** CHRONO-S60: 이번 tick 에 발동 가능한 3인 협공 후보. */
  tripleTechCandidates: TripleTechCandidate[];
  /** CHRONO-S82: 협공 사용 통계 (누적). */
  combatStats: {
    dualTechFired: number;
    tripleTechFired: number;
    maxChainReached: number;
  };
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
  /** P55-S2: 회피로 빗나간 공격 (evasion_up vs hitChance) */
  missed?: boolean;
}

export interface ParticipantSnapshot {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atbGauge: number;
  /** ATB 100 도달 여부 (행동 가능) — FF6 UI 깜빡임 표시용 */
  atbReady: boolean;
  /** ready 큐 인덱스 (0 = 다음 행동 예정). 미도달 시 null */
  atbQueueIndex: number | null;
  alive: boolean;
  team: 'party' | 'monsters';
  /** CHRONO-S50: 받은 Dual Tech 누적 횟수 (보스 한정 — 저항 단계 UI 표시용). 0 디폴트. */
  dualTechHitsTaken: number;
  /** CHRONO-S66: 받은 Triple Tech 누적 횟수. 보스 한정 0.1/hit 저항. 0 디폴트. */
  tripleTechHitsTaken: number;
  /** CHRONO-S86: 협공 완전 면역 여부 (UI '🛡 협공 면역' 표시용). */
  dualTechImmune: boolean;
  buffs: string[];
  debuffs: string[];
}

// ─── 전투 인스턴스 설정 ────────────────────────────────────────

export interface CombatConfig {
  /**
   * @deprecated SSOT `atb/atbTimeline.ts` 도입(P54+) 이후 무시됨.
   * 충전량은 `computeChargeDelta(spd, mult, speedTier, tickMs)` 가 결정.
   * 기존 호출부 호환을 위해 필드는 유지.
   */
  atbChargeBase?: number;
  /** 틱 간격 (ms) — SSOT computeChargeDelta 의 tickMs 로 전달 */
  tickIntervalMs: number;
  /** 최대 틱 수 (무한 루프 방지) */
  maxTicks: number;
  /** 자동 전투 여부 */
  autoMode: boolean;
  /** FF6 ATB 모드 (Active / Wait / Semi) — 기본 ACTIVE */
  atbMode: ATBMode;
  /** FF6 ATB 배속 티어 (1~6) — 기본 3 (1.0x) */
  speedTier: ATBSpeedTier;
  /** WAIT 모드에서 menu 열림 여부 (UI 측에서 set, 기본 false) */
  menuOpen: boolean;
  /** CHRONO-S53: 시대 (있으면 MonsterAIConfig.basicAttackMultiplier 보정에 사용). */
  eraId?: ChronoEraId;
}

const DEFAULT_CONFIG: CombatConfig = {
  tickIntervalMs: 1000,
  maxTicks: 300, // 5분 (300틱 × 1초)
  autoMode: false,
  atbMode: 'ACTIVE',
  speedTier: 3,
  menuOpen: false,
};

// ─── 전투 엔진 ─────────────────────────────────────────────────

export class CombatEngine {
  readonly combatId: string;
  private state: CombatState = 'IDLE';
  private config: CombatConfig;
  private participants = new Map<string, CombatParticipant>();
  private pendingActions = new Map<string, PlayerAction>();
  private currentTick = 0;
  // ATB ready 큐 도달 순서 — SSOT atbTimeline.readyAtTick 패턴 (FF6 FIFO)
  private readyAtTick = new Map<string, number>();
  private readyOrderCounter = 0;
  // CHRONO-S9: flee 성공 시 winner 결정용 (alive 기반 checkWinCondition 우회).
  private fleeWinner: 'party' | 'monsters' | 'draw' | null = null;
  // CHRONO-S15: Dual Tech 예약 (다음 processTick 직전에 실행).
  private pendingDualTech: {
    actorIdA: string;
    actorIdB: string;
    techId: string;
    targetId: string;
  } | null = null;
  // CHRONO-S26: 마지막 Dual Tech 발동 tick (연속 콤보 보너스 추적).
  private lastDualTechTick: number | null = null;
  // CHRONO-S73: 연속 chain 카운트 (4+ 도달 시 1.5x 보너스).
  private chainCount = 0;
  // CHRONO-S82: 협공 사용 통계 (TickResult / 보상 계산 / replay 활용).
  private dualTechFiredCount = 0;
  private tripleTechFiredCount = 0;
  private maxChainReached = 0;
  // CHRONO-S59: Triple Tech 예약.
  private pendingTripleTech: {
    actorIds: [string, string, string];
    techId: string;
    targetId: string;
  } | null = null;

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
  getTickIntervalMs(): number { return this.config.tickIntervalMs; }

  getParticipant(id: string): CombatParticipant | undefined {
    return this.participants.get(id);
  }

  getParticipants(): CombatParticipant[] {
    return Array.from(this.participants.values());
  }

  getSnapshot(): ParticipantSnapshot[] {
    // FF6 큐 인덱스 — readyAtTick 순서대로 0..N. SSOT atbTimeline.toSnapshots 와 동일 매핑.
    const queueIndexByActor = new Map<string, number>();
    Array.from(this.readyAtTick.entries())
      .sort((a, b) => a[1] - b[1])
      .forEach(([actorId], queueIndex) => queueIndexByActor.set(actorId, queueIndex));

    return this.getParticipants().map(p => ({
      id: p.id,
      name: p.name,
      hp: p.hp,
      maxHp: p.maxHp,
      mp: p.mp,
      maxMp: p.maxMp,
      atbGauge: p.atbGauge,
      atbReady: p.alive && p.atbGauge >= ATB_MAX,
      atbQueueIndex: queueIndexByActor.get(p.id) ?? null,
      alive: p.alive,
      team: p.team,
      dualTechHitsTaken: p.dualTechHitsTaken ?? 0,
      tripleTechHitsTaken: p.tripleTechHitsTaken ?? 0,
      dualTechImmune: p.dualTechImmune ?? false,
      buffs: [],
      debuffs: [],
    }));
  }

  // ── 참가자 등록 ─────────────────────────────────────────

  addParticipant(p: CombatParticipant): void {
    if (this.state !== 'IDLE' && this.state !== 'PREPARING') {
      throw new Error('전투 진행 중에는 참가자를 추가할 수 없습니다.');
    }

    // P55-S3: cheat_death 잔여 횟수 = 최대치. P55-S6: auto_resurrect 도 동일 패턴.
    const cheatDeathInit = p.cheatDeathChargesMax ?? 0;
    const autoRezInit = p.autoResurrectChargesMax ?? 0;
    this.participants.set(p.id, {
      ...p,
      atbGauge: 0,
      alive: true,
      cheatDeathChargesRemaining: cheatDeathInit,
      autoResurrectChargesRemaining: autoRezInit,
      resurrectAtTick: undefined,
    });
    this.manaManager.init(p.id, p.mp, p.maxMp);
    this.logger.registerParticipant(p.id, p.name, p.isMonster);

    // 몬스터 AI 설정
    if (p.isMonster) {
      // CHRONO-S53: era hint 로 AI 가중치 보정 (aggressiveBias → basicAttackMultiplier +bias)
      // CHRONO-S55: defensiveBias > 0.2 면 basic 도 tactical tier 로 승급 (ancient 회상의 적 = 더 영리)
      const aiHints = this.config.eraId ? chronoEraToAIHints(this.config.eraId) : { defensiveBias: 0, aoeBias: 0, aggressiveBias: 0 };
      const baseTier: 'boss' | 'tactical' | 'basic' = p.isBoss ? 'boss' : (p.level > 30 ? 'tactical' : 'basic');
      const tier: 'boss' | 'tactical' | 'basic' = baseTier === 'basic' && aiHints.defensiveBias > 0.2 ? 'tactical' : baseTier;
      const aiConfig: MonsterAIConfig = {
        monsterId: p.id,
        tier,
        skills: [], // 실제로는 몬스터 데이터에서 로드
        basicAttackMultiplier: 1.0 + aiHints.aggressiveBias,
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

  /**
   * CHRONO-S15: Dual Tech 발동 예약. 양쪽 ready + 호환 클래스 + 호환 techId 검증.
   * 다음 processTick 직전에 실행되어 두 actor 가 동시에 행동.
   */
  submitDualTech(
    actorIdA: string,
    actorIdB: string,
    techId: string,
    targetId: string,
  ): boolean {
    if (this.state !== 'IN_PROGRESS') return false;
    const a = this.participants.get(actorIdA);
    const b = this.participants.get(actorIdB);
    if (!a || !b) return false;
    if (a.isMonster || b.isMonster) return false;
    if (!a.alive || !b.alive) return false;
    if (a.id === b.id) return false;
    if (a.atbGauge < ATB_MAX || b.atbGauge < ATB_MAX) return false;

    const def = resolveDualTech(a.classId, b.classId);
    if (!def || def.id !== techId) return false;

    // MP 검사 (두 actor 모두 코스트 보유)
    if (a.mp < def.mpCost || b.mp < def.mpCost) return false;

    this.pendingDualTech = { actorIdA, actorIdB, techId, targetId };
    return true;
  }

  /**
   * CHRONO-S59: Triple Tech 발동 예약. 3명 ready + 호환 클래스 + MP 검증.
   */
  submitTripleTech(
    actorIds: [string, string, string],
    techId: string,
    targetId: string,
  ): boolean {
    if (this.state !== 'IN_PROGRESS') return false;
    const [idA, idB, idC] = actorIds;
    if (new Set(actorIds).size !== 3) return false;
    const actors = actorIds.map((id) => this.participants.get(id));
    if (actors.some((p) => !p || p.isMonster || !p.alive)) return false;
    if (actors.some((p) => (p!.atbGauge ?? 0) < ATB_MAX)) return false;

    const [a, b, c] = actors as [CombatParticipant, CombatParticipant, CombatParticipant];
    const def = resolveTripleTech(a.classId, b.classId, c.classId);
    if (!def || def.id !== techId) return false;
    if (a.mp < def.mpCost || b.mp < def.mpCost || c.mp < def.mpCost) return false;

    this.pendingTripleTech = { actorIds: [idA, idB, idC], techId, targetId };
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

    // 0. P55-S6: auto_resurrect — 직전 tick 끝에 예약된 부활 처리
    for (const p of this.participants.values()) {
      if (p.alive) continue;
      if (tryAutoResurrect(p, this.currentTick)) {
        p.atbGauge = 0;
        this.readyAtTick.delete(p.id);
        this.logger.logHeal(p.id, p.id, p.hp, 'auto_resurrect');
      }
    }

    // 0b. 사망한 actor 는 ready 큐에서 제거 (stale 순번 정리)
    for (const p of this.participants.values()) {
      if (!p.alive) this.readyAtTick.delete(p.id);
    }

    // 1. ATB 게이지 충전 — SSOT computeChargeDelta(FF6 레퍼런스) 사용
    // WAIT 모드 + menuOpen 이면 충전 정지 (FF6 명령창 입력 중 정지).
    const atbHalt = this.config.atbMode === 'WAIT' && this.config.menuOpen;
    if (!atbHalt) {
      for (const p of this.participants.values()) {
        if (!p.alive) continue;
        const before = p.atbGauge;
        const delta = computeChargeDelta(
          p.spd,
          1,
          this.config.speedTier,
          this.config.tickIntervalMs,
        );
        p.atbGauge = Math.min(ATB_MAX, p.atbGauge + delta);
        // ready 도달 순간 도달 순서 부여 (FF6 FIFO 큐)
        if (before < ATB_MAX && p.atbGauge >= ATB_MAX && !this.readyAtTick.has(p.id)) {
          this.readyAtTick.set(p.id, this.readyOrderCounter++);
        }
      }
    }

    // 2. 쿨다운 + 마나 회복
    this.cooldownManager.tick();
    this.manaManager.tickRegen();

    // 2.5 P55-S2/S3: passive mp_regen + hp_regen (battle_regen) — 살아있는 참가자만
    for (const p of this.participants.values()) {
      if (!p.alive) continue;
      applyMpRegen(p);
      applyHpRegen(p);
    }

    // 2.6 P55-S5: move_damage_aura — 살아있는 party member 가 적군 전체에 광역 데미지
    const partyAlive = Array.from(this.participants.values()).filter(p => p.alive && p.team === 'party');
    const monstersAlive = Array.from(this.participants.values()).filter(p => p.alive && p.team === 'monsters');
    for (const ally of partyAlive) {
      if ((ally.moveDamageAuraValue ?? 0) <= 0) continue;
      const auraResults = applyMoveDamageAura(ally, monstersAlive);
      for (const { enemyId, damage } of auraResults) {
        const enemy = this.participants.get(enemyId);
        if (!enemy) continue;
        if (enemy.hp <= 0) {
          enemy.alive = false;
          this.logger.logDeath(enemy.id, ally.id);
        }
        this.logger.logDamage(ally.id, enemy.id, damage, false);
      }
    }

    // 3. 상태이상 틱 — P55-S7: 시전자(sourceId) 의 poison_amplify 등 DoT 증폭 적용
    const tickResults = statusEffectManager.tick(
      1,
      (targetId: string) => {
        const target = this.participants.get(targetId);
        return target ? target.maxHp ?? target.hp : 0;
      },
      (sourceId: string, _effectId) => {
        const source = this.participants.get(sourceId);
        if (!source) return 1;
        const amp = source.poisonAmplifyPercent ?? 0;
        return amp > 0 ? 1 + amp / 100 : 1;
      },
    );
    for (const result of tickResults) {
      const p = this.participants.get(result.targetId);
      if (!p || !p.alive) continue;
      const dotDamage = result.damage;
      if (dotDamage > 0) {
        p.hp = Math.max(0, p.hp - dotDamage);
        if (p.hp <= 0) {
          p.alive = false;
          this.logger.logDeath(p.id, 'dot');
        }
      }
    }

    // 3.4 CHRONO-S59: Triple Tech 최우선 발동 (Dual Tech 보다도 먼저).
    if (this.pendingTripleTech) {
      const tripleResult = this.tryExecuteTripleTech(this.pendingTripleTech);
      if (tripleResult) actions.push(tripleResult);
      this.pendingTripleTech = null;
    }

    // 3.5 CHRONO-S15: Dual Tech 발동 (ready 큐 처리 전).
    if (this.pendingDualTech) {
      const dualResult = this.tryExecuteDualTech(this.pendingDualTech);
      if (dualResult) actions.push(dualResult);
      this.pendingDualTech = null;
    }

    // 4. 행동 가능한 참가자 처리 (readyAtTick FIFO 우선, 동률 시 SPD 내림차순)
    // FF6: ATB 100 도달 순서대로 행동 큐. 같은 tick에 동시 도달 시 빠른 spd 가 먼저.
    const readyParticipants = this.getParticipants()
      .filter(p => p.alive && p.atbGauge >= ATB_MAX)
      .sort((a, b) => {
        const ra = this.readyAtTick.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const rb = this.readyAtTick.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
        return b.spd - a.spd;
      });

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

      // ATB 소비 — SSOT consumeGauge 패턴 (FF6 Defend 시 반틱 유지)
      actor.atbGauge = action.type === 'defend' ? ATB_MAX / 2 : 0;
      // 행동 완료 → ready 큐에서 제외 (다음 도달 시 새 순번 부여)
      this.readyAtTick.delete(actor.id);
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

    // 6.5 P55-S6: 이번 tick 에 사망한 참가자 중 auto_resurrect 가능한 자 부활 예약
    for (const p of this.participants.values()) {
      if (p.alive) continue;
      if (p.resurrectAtTick !== undefined) continue;
      scheduleAutoResurrect(p, this.currentTick);
    }

    // 7. 승패 판정 — 부활 예약된 사망자도 "alive=false" 로 카운트되어 KO 인정.
    //    승패 직후 그 다음 tick 에서 부활하면 전투 재개됨. (즉시 패배 방지하려면 별도 체크 필요)
    const combatEnded = this.checkWinCondition() || this.fleeWinner !== null;
    let winner: 'party' | 'monsters' | 'draw' | undefined;
    let rewards: RewardResult | undefined;
    let levelUps: LevelUpResult[] | undefined;

    if (combatEnded || this.currentTick >= this.config.maxTicks) {
      // CHRONO-S9: flee 성공 시 alive 와 무관하게 draw 강제
      if (this.fleeWinner !== null) {
        winner = this.fleeWinner;
        this.fleeWinner = null;
      } else {
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
      dualTechCandidates: this.computeDualTechCandidates(),
      tripleTechCandidates: this.computeTripleTechCandidates(),
      combatStats: {
        dualTechFired: this.dualTechFiredCount,
        tripleTechFired: this.tripleTechFiredCount,
        maxChainReached: this.maxChainReached,
      },
    };
  }

  /**
   * CHRONO-S60: ready 큐의 alive party member 중 3-조합 (C(n,3)) 호환 검출.
   */
  private computeTripleTechCandidates(): TripleTechCandidate[] {
    const readyParty = this.getParticipants().filter(
      (p) => p.alive && p.team === 'party' && p.atbGauge >= ATB_MAX,
    );
    if (readyParty.length < 3) return [];

    const seen = new Set<string>();
    const out: TripleTechCandidate[] = [];
    for (let i = 0; i < readyParty.length; i++) {
      for (let j = i + 1; j < readyParty.length; j++) {
        for (let k = j + 1; k < readyParty.length; k++) {
          const a = readyParty[i];
          const b = readyParty[j];
          const c = readyParty[k];
          const def = resolveTripleTech(a.classId, b.classId, c.classId);
          if (!def) continue;
          // CHRONO-S78: era 필터 적용 — eraFilter 가 있고 현재 era 가 포함 안 되면 후보 제외
          if (def.eraFilter && this.config.eraId && !def.eraFilter.includes(this.config.eraId)) {
            continue;
          }
          const ids: [string, string, string] = [a.id, b.id, c.id].sort() as [string, string, string];
          const key = `${def.id}::${ids[0]}::${ids[1]}::${ids[2]}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({
            techId: def.id,
            name: def.name,
            actorIds: ids,
            element: def.element,
            aoe: def.aoe ?? false,
            mpCost: def.mpCost,
          });
        }
      }
    }
    return out;
  }

  /**
   * CHRONO-S15: Dual Tech 발동. 양쪽 actor 의 atk 평균 × damageMultiplier 데미지.
   * 두 actor 의 게이지 0 리셋, MP 차감, ready 큐 제거.
   */
  private tryExecuteDualTech(req: {
    actorIdA: string;
    actorIdB: string;
    techId: string;
    targetId: string;
  }): ActionResult | null {
    const a = this.participants.get(req.actorIdA);
    const b = this.participants.get(req.actorIdB);
    const target = this.participants.get(req.targetId);
    if (!a || !b || !target) return null;
    if (!a.alive || !b.alive || !target.alive) return null;
    if (a.atbGauge < ATB_MAX || b.atbGauge < ATB_MAX) return null;
    const def = getDualTechById(req.techId);
    if (!def) return null;
    if (a.mp < def.mpCost || b.mp < def.mpCost) return null;
    // CHRONO-S81: target 협공 면역 — 발동 거부 + MP/ATB 보존
    if (target.dualTechImmune) return null;

    const avgAtk = (getEffectiveAtk(a, a.atk) + getEffectiveAtk(b, b.atk)) / 2;
    // CHRONO-S26/S73: 연속 콤보 보너스 — 5 tick 이내 이력 시 chainCount 단계 보너스
    const isChain = this.lastDualTechTick !== null
      && this.currentTick - this.lastDualTechTick <= 5;
    // chain 진행 — 연속이면 +1, 끊김 또는 첫 발동이면 1로 reset
    this.chainCount = isChain ? this.chainCount + 1 : 1;
    // 1=1.0 (보너스 X), 2~3=1.2, 4+=1.5
    const chainBonus = this.chainCount >= 4 ? 1.5 : this.chainCount >= 2 ? 1.2 : 1.0;
    // CHRONO-S34/S43: 보스 target Dual Tech 저항 — base 0.6x, 누적 보스에 -0.05/hit (최저 0.3)
    const computeBossResist = (p: CombatParticipant): number => {
      if (!p.isBoss) return 1.0;
      const hits = p.dualTechHitsTaken ?? 0;
      return Math.max(0.3, 0.6 - 0.05 * hits);
    };
    const bossResist = computeBossResist(target);

    const result = calculateDamage({
      type: 'physical',
      attackStat: avgAtk,
      defenseStat: getEffectiveDef(target, target.def),
      skillMultiplier: def.damageMultiplier,
      attackerElement: def.element as ElementType,
      defenderElement: target.element,
      critRate: (a.critRate + b.critRate) / 2,
      critDamage: (a.critDamage + b.critDamage) / 2,
      armorPenetration: Math.max(a.armorPenetration, b.armorPenetration),
      armorPenetrationPercent: Math.max(a.armorPenetrationPercent, b.armorPenetrationPercent),
      bonusMultiplier: chainBonus * bossResist,
      levelDifference: Math.round((a.level + b.level) / 2) - target.level,
    });

    // CHRONO-S39: aoe 협공 — alive monster 전체에 데미지 적용 (보스는 0.6× 유지)
    const targets: CombatParticipant[] = def.aoe
      ? this.getParticipants().filter((p) => p.team === 'monsters' && p.alive)
      : [target];

    let totalDamage = 0;
    for (const t of targets) {
      const tBossResist = computeBossResist(t);
      // CHRONO-S56: AOE falloff — main target 100%, splash 80%
      const aoeFalloff = def.aoe && t.id !== target.id ? 0.8 : 1.0;
      const tResult = def.aoe
        ? calculateDamage({
          type: 'physical',
          attackStat: avgAtk,
          defenseStat: getEffectiveDef(t, t.def),
          skillMultiplier: def.damageMultiplier,
          attackerElement: def.element as ElementType,
          defenderElement: t.element,
          critRate: (a.critRate + b.critRate) / 2,
          critDamage: (a.critDamage + b.critDamage) / 2,
          armorPenetration: Math.max(a.armorPenetration, b.armorPenetration),
          armorPenetrationPercent: Math.max(a.armorPenetrationPercent, b.armorPenetrationPercent),
          bonusMultiplier: chainBonus * tBossResist * aoeFalloff,
          levelDifference: Math.round((a.level + b.level) / 2) - t.level,
        })
        : result;
      t.hp = Math.max(0, t.hp - tResult.damage);
      // CHRONO-S43: 보스 누적 저항 카운트 증가
      if (t.isBoss) {
        t.dualTechHitsTaken = (t.dualTechHitsTaken ?? 0) + 1;
      }
      if (t.hp <= 0) {
        t.alive = false;
        this.logger.logDeath(t.id, `${a.id}+${b.id}`);
      }
      this.logger.logDamage(`${a.id}+${b.id}`, t.id, tResult.damage, tResult.isCritical);
      totalDamage += tResult.damage;
    }

    // MP 차감 + 게이지 소비 + ready 큐 제거
    a.mp = Math.max(0, a.mp - def.mpCost);
    b.mp = Math.max(0, b.mp - def.mpCost);
    a.atbGauge = 0;
    b.atbGauge = 0;
    this.readyAtTick.delete(a.id);
    this.readyAtTick.delete(b.id);
    this.pendingActions.delete(a.id);
    this.pendingActions.delete(b.id);

    // CHRONO-S26: 콤보 tick 갱신
    this.lastDualTechTick = this.currentTick;

    // CHRONO-S82: 통계 카운트
    this.dualTechFiredCount += 1;
    if (this.chainCount > this.maxChainReached) this.maxChainReached = this.chainCount;
    // CHRONO-S90: CombatLogger 통계 통합 (replay 활용)
    this.logger.recordTechStats('dual', this.chainCount);

    // CHRONO-S75: chain 4+ 시 발동 actor HP 5% 회복 (시너지 보상)
    if (this.chainCount >= 4) {
      for (const p of [a, b]) {
        const heal = Math.floor(p.maxHp * 0.05);
        p.hp = Math.min(p.maxHp, p.hp + heal);
        this.logger.logHeal(p.id, p.id, heal, 'chain_synergy');
      }
    }

    // CHRONO-S74: chain 4+ 면 (MAX CHAIN), 2~3은 (CHAIN)
    const chainLabel = this.chainCount >= 4
      ? ' (MAX CHAIN)'
      : this.chainCount >= 2 ? ' (CHAIN)' : '';

    return {
      actorId: a.id,
      actorName: `${a.name} × ${b.name}${chainLabel}${target.isBoss && !def.aoe ? ' (BOSS RESIST)' : ''}${def.aoe ? ' (AOE)' : ''}`,
      actionType: 'dual_tech',
      targetId: target.id,
      targetName: def.aoe ? `${targets.length} 적` : target.name,
      damage: def.aoe ? totalDamage : result.damage,
      isCritical: result.isCritical,
      skillId: def.id,
    };
  }

  /**
   * CHRONO-S59: Triple Tech 발동. 세 actor 평균 atk × damageMultiplier. AOE 면 모든 적, 단일이면 target 만.
   * 보스 저항 + chain bonus 적용.
   */
  private tryExecuteTripleTech(req: {
    actorIds: [string, string, string];
    techId: string;
    targetId: string;
  }): ActionResult | null {
    const actors = req.actorIds.map((id) => this.participants.get(id));
    if (actors.some((p) => !p || !p.alive || p.atbGauge < ATB_MAX)) return null;
    const [a, b, c] = actors as [CombatParticipant, CombatParticipant, CombatParticipant];
    const target = this.participants.get(req.targetId);
    if (!target || !target.alive) return null;
    const def = getTripleTechById(req.techId);
    if (!def) return null;
    if (a.mp < def.mpCost || b.mp < def.mpCost || c.mp < def.mpCost) return null;
    // CHRONO-S81: target 협공 면역 — 발동 거부
    if (target.dualTechImmune) return null;

    const avgAtk = (
      getEffectiveAtk(a, a.atk) + getEffectiveAtk(b, b.atk) + getEffectiveAtk(c, c.atk)
    ) / 3;
    const isChain = this.lastDualTechTick !== null
      && this.currentTick - this.lastDualTechTick <= 5;
    // CHRONO-S73: chain 진행 (Triple Tech 도 동일 카운터 공유)
    this.chainCount = isChain ? this.chainCount + 1 : 1;
    const chainBonus = this.chainCount >= 4 ? 1.5 : this.chainCount >= 2 ? 1.2 : 1.0;

    const targets: CombatParticipant[] = def.aoe
      ? this.getParticipants().filter((p) => p.team === 'monsters' && p.alive)
      : [target];

    let totalDamage = 0;
    for (const t of targets) {
      // CHRONO-S66: Triple Tech 누적 보스 저항 — base 0.7, -0.1/hit, 최저 0.3
      const tBossResist = t.isBoss ? Math.max(0.3, 0.7 - 0.1 * (t.tripleTechHitsTaken ?? 0)) : 1.0;
      const aoeFalloff = def.aoe && t.id !== target.id ? 0.8 : 1.0;
      const tResult = calculateDamage({
        type: 'physical',
        attackStat: avgAtk,
        defenseStat: getEffectiveDef(t, t.def),
        skillMultiplier: def.damageMultiplier,
        attackerElement: def.element as ElementType,
        defenderElement: t.element,
        critRate: (a.critRate + b.critRate + c.critRate) / 3,
        critDamage: (a.critDamage + b.critDamage + c.critDamage) / 3,
        armorPenetration: Math.max(a.armorPenetration, b.armorPenetration, c.armorPenetration),
        armorPenetrationPercent: Math.max(a.armorPenetrationPercent, b.armorPenetrationPercent, c.armorPenetrationPercent),
        bonusMultiplier: chainBonus * tBossResist * aoeFalloff,
        levelDifference: Math.round((a.level + b.level + c.level) / 3) - t.level,
      });
      t.hp = Math.max(0, t.hp - tResult.damage);
      if (t.isBoss) t.tripleTechHitsTaken = (t.tripleTechHitsTaken ?? 0) + 1;
      if (t.hp <= 0) {
        t.alive = false;
        this.logger.logDeath(t.id, `${a.id}+${b.id}+${c.id}`);
      }
      this.logger.logDamage(`${a.id}+${b.id}+${c.id}`, t.id, tResult.damage, tResult.isCritical);
      totalDamage += tResult.damage;
    }

    // MP 차감 + 게이지 0 + ready 큐 정리
    for (const p of [a, b, c]) {
      p.mp = Math.max(0, p.mp - def.mpCost);
      p.atbGauge = 0;
      this.readyAtTick.delete(p.id);
      this.pendingActions.delete(p.id);
    }
    this.lastDualTechTick = this.currentTick;

    // CHRONO-S82: Triple Tech 통계
    this.tripleTechFiredCount += 1;
    if (this.chainCount > this.maxChainReached) this.maxChainReached = this.chainCount;
    // CHRONO-S90: CombatLogger 통계 통합
    this.logger.recordTechStats('triple', this.chainCount);

    // CHRONO-S75: chain 4+ 시 발동 3 actor 모두 HP 5% 회복
    if (this.chainCount >= 4) {
      for (const p of [a, b, c]) {
        const heal = Math.floor(p.maxHp * 0.05);
        p.hp = Math.min(p.maxHp, p.hp + heal);
        this.logger.logHeal(p.id, p.id, heal, 'chain_synergy');
      }
    }

    // CHRONO-S74: chain 단계 표시
    const tChainLabel = this.chainCount >= 4
      ? ' (MAX CHAIN)'
      : this.chainCount >= 2 ? ' (CHAIN)' : '';

    return {
      actorId: a.id,
      actorName: `${a.name} × ${b.name} × ${c.name} (TRIPLE)${def.aoe ? ' (AOE)' : ''}${tChainLabel}`,
      actionType: 'triple_tech',
      targetId: target.id,
      targetName: def.aoe ? `${targets.length} 적` : target.name,
      damage: totalDamage,
      skillId: def.id,
    };
  }

  /**
   * CHRONO-S14: ready 큐의 alive party member 중 호환 클래스 쌍 검출.
   * 한 turn 에 동시 2명 이상 ready 면 모든 가능한 쌍 (n choose 2) 검사.
   */
  private computeDualTechCandidates(): DualTechCandidate[] {
    const readyParty = this.getParticipants().filter(
      (p) => p.alive && p.team === 'party' && p.atbGauge >= ATB_MAX,
    );
    if (readyParty.length < 2) return [];

    const seen = new Set<string>();
    const out: DualTechCandidate[] = [];
    for (let i = 0; i < readyParty.length; i++) {
      for (let j = i + 1; j < readyParty.length; j++) {
        const a = readyParty[i];
        const b = readyParty[j];
        const def = resolveDualTech(a.classId, b.classId);
        if (!def) continue;
        // CHRONO-S80: era 필터 적용 (Triple S78 패턴 통일)
        if (def.eraFilter && this.config.eraId && !def.eraFilter.includes(this.config.eraId)) {
          continue;
        }
        const ids: [string, string] = [a.id, b.id].sort() as [string, string];
        const key = `${def.id}::${ids[0]}::${ids[1]}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          techId: def.id,
          name: def.name,
          actorIds: ids,
          element: def.element,
          aoe: def.aoe ?? false,
          mpCost: def.mpCost,
        });
      }
    }
    return out;
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
        return this.executeFlee(actor);
      default:
        return null;
    }
  }

  /**
   * CHRONO-S9: 도주 (FF6 패턴).
   * 성공률 = clamp(0.3 + (avgPartySpd - avgMonsterSpd)/200, 0, 0.95).
   * 보스 존재 시 강제 실패 (FF6 보스 도주 불가).
   * 성공 시 state='COMPLETED' winner='draw'; 실패 시 missed=true 로그.
   */
  private executeFlee(actor: CombatParticipant): ActionResult {
    const aliveMonsters = this.getAliveByTeam('monsters');
    const aliveParty = this.getAliveByTeam('party');
    const hasBoss = aliveMonsters.some(m => m.isBoss);

    const avgSpd = (list: CombatParticipant[]): number =>
      list.length === 0 ? 0 : list.reduce((s, p) => s + p.spd, 0) / list.length;

    const partySpd = avgSpd(aliveParty);
    const monsterSpd = avgSpd(aliveMonsters);
    const baseRate = hasBoss
      ? 0
      : Math.max(0, Math.min(0.95, 0.3 + (partySpd - monsterSpd) / 200));

    const success = !hasBoss && Math.random() < baseRate;
    if (success) {
      this.fleeWinner = 'draw';
      this.state = 'COMPLETED';
    }
    return {
      actorId: actor.id,
      actorName: actor.name,
      actionType: 'flee',
      targetId: actor.id,
      targetName: actor.name,
      missed: !success,
    };
  }

  private executeAttack(actor: CombatParticipant, target: CombatParticipant | null | undefined): ActionResult | null {
    if (!target || !target.alive) return null;

    // P55-S2: 회피 판정 (evasion_up vs bonus_hit_chance)
    if (rollMiss(actor, target)) {
      this.logger.logDamage(actor.id, target.id, 0, false);
      return {
        actorId: actor.id,
        actorName: actor.name,
        actionType: 'attack',
        targetId: target.id,
        targetName: target.name,
        damage: 0,
        missed: true,
      };
    }

    const result = calculateDamage({
      type: 'physical',
      // P55-S2: low_hp_atk_up / defense_up_conditional 적용
      attackStat: getEffectiveAtk(actor, actor.atk),
      defenseStat: getEffectiveDef(target, target.def),
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

    // P55-S3: cheat_death — fatal damage 시 hp=1 로 유지 (1회 차감). 발동 시 alive 유지.
    const cheatedDeath = tryCheatDeath(target, result.damage);
    if (!cheatedDeath) {
      target.hp = Math.max(0, target.hp - result.damage);
      if (target.hp <= 0) {
        target.alive = false;
        this.logger.logDeath(target.id, actor.id);
      }
    }
    this.logger.logDamage(actor.id, target.id, result.damage, result.isCritical);

    // P55-S5: crit_echo — 크리티컬 시 추가 데미지 (target 에 한 번 더, 추가 crit roll 없음)
    const echoDmg = computeCritEchoDamage(actor, result.isCritical, result.damage);
    if (echoDmg > 0 && target.alive) {
      const echoCheatedDeath = tryCheatDeath(target, echoDmg);
      if (!echoCheatedDeath) {
        target.hp = Math.max(0, target.hp - echoDmg);
        if (target.hp <= 0) {
          target.alive = false;
          this.logger.logDeath(target.id, actor.id);
        }
      }
      this.logger.logDamage(actor.id, target.id, echoDmg, false);
    }

    // P55-S3: reflect — physical 피격이면 attacker 에 반사 데미지 (살아있을 때만)
    const reflectDmg = computeReflectDamage(target, result.damage);
    if (reflectDmg > 0 && actor.alive) {
      // attacker 에도 cheat_death 적용 (자기 패시브)
      const attackerCheated = tryCheatDeath(actor, reflectDmg);
      if (!attackerCheated) {
        actor.hp = Math.max(0, actor.hp - reflectDmg);
        if (actor.hp <= 0) {
          actor.alive = false;
          this.logger.logDeath(actor.id, target.id);
        }
      }
      this.logger.logDamage(target.id, actor.id, reflectDmg, false);
    }

    // 어그로 추가
    if (target.isMonster) {
      const ai = this.monsterAIs.get(target.id);
      ai?.getAggroTable().addDamageAggro(actor.id, result.damage);
    }

    // 콤보 기록
    if (!actor.isMonster) {
      comboManager.recordSkillUse(actor.id, 'basic_attack', actor.classId, 1);
    }

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

    // 콤보 (데미지 계산 전에 기록하여 배율 반영)
    let comboMultiplier = 1.0;
    if (!actor.isMonster) {
      const comboResult = comboManager.recordSkillUse(actor.id, skillId, actor.classId, 1);
      comboMultiplier = comboResult.totalMultiplier;
    }

    // P55-S2: 데미지 스킬에도 회피 판정 적용
    if (rollMiss(actor, target)) {
      this.logger.logDamage(actor.id, target.id, 0, false, skillId, skill.element);
      return {
        actorId: actor.id,
        actorName: actor.name,
        actionType: 'skill',
        targetId: target.id,
        targetName: target.name,
        damage: 0,
        missed: true,
        skillId,
      };
    }

    // 데미지 스킬
    const dmgType: DamageType = skill.damageType;
    // P55-S2: physical 일 때만 low_hp_atk_up 영향 (atk 계열). magical 은 matk 그대로.
    const rawAttackStat = dmgType === 'physical' ? actor.atk : actor.matk;
    const effAttackStat = dmgType === 'physical' ? getEffectiveAtk(actor, rawAttackStat) : rawAttackStat;
    const rawDefenseStat = dmgType === 'physical' ? target.def : target.mdef;
    const effDefenseStat = dmgType === 'physical' ? getEffectiveDef(target, rawDefenseStat) : rawDefenseStat;
    const result = calculateDamage({
      type: dmgType,
      attackStat: effAttackStat,
      defenseStat: effDefenseStat,
      skillMultiplier: skill.damageMultiplier,
      attackerElement: skill.element,
      defenderElement: target.element,
      critRate: actor.critRate,
      critDamage: actor.critDamage,
      armorPenetration: actor.armorPenetration,
      armorPenetrationPercent: actor.armorPenetrationPercent,
      bonusMultiplier: comboMultiplier,
      levelDifference: actor.level - target.level,
    });

    // P55-S3: cheat_death — fatal damage 시 hp=1 유지
    const cheatedDeath = tryCheatDeath(target, result.damage);
    if (!cheatedDeath) {
      target.hp = Math.max(0, target.hp - result.damage);
      if (target.hp <= 0) {
        target.alive = false;
        this.logger.logDeath(target.id, actor.id);
      }
    }

    // P55-S5: crit_echo — 크리티컬 시 추가 데미지 (스킬 데미지에도 적용)
    const echoDmg = computeCritEchoDamage(actor, result.isCritical, result.damage);
    if (echoDmg > 0 && target.alive) {
      const echoCheatedDeath = tryCheatDeath(target, echoDmg);
      if (!echoCheatedDeath) {
        target.hp = Math.max(0, target.hp - echoDmg);
        if (target.hp <= 0) {
          target.alive = false;
          this.logger.logDeath(target.id, actor.id);
        }
      }
      this.logger.logDamage(actor.id, target.id, echoDmg, false, skillId, skill.element);
    }

    // P56-S3: lifesteal — skill.effect.type === 'lifesteal' 면 attacker hp 회복 (drain_amplify 곱)
    if (skill.lifestealPercent && skill.lifestealPercent > 0) {
      const healed = applyLifesteal(actor, skill.lifestealPercent, result.damage);
      if (healed > 0) {
        this.logger.logHeal(actor.id, actor.id, healed, skillId);
      }
    }

    // P55-S3: reflect / projectile_reflect — physical/magical 분기
    const reflectDmg = dmgType === 'physical'
      ? computeReflectDamage(target, result.damage)
      : computeProjectileReflectDamage(target, result.damage);
    if (reflectDmg > 0 && actor.alive) {
      const attackerCheated = tryCheatDeath(actor, reflectDmg);
      if (!attackerCheated) {
        actor.hp = Math.max(0, actor.hp - reflectDmg);
        if (actor.hp <= 0) {
          actor.alive = false;
          this.logger.logDeath(actor.id, target.id);
        }
      }
      this.logger.logDamage(target.id, actor.id, reflectDmg, false, undefined, skill.element);
    }

    // 상태이상 적용
    let appliedEffect: string | undefined;
    if (skill.statusEffect && skill.statusEffectChance) {
      if (Math.random() * 100 < skill.statusEffectChance) {
        const effectResult = statusEffectManager.applyEffect(
          skill.statusEffect as EffectId,
          actor.id,
          target.id,
          skill.statusEffectChance,
          { baseResist: 0, wis: 0, equipResist: 0 },
          0,
        );
        if (effectResult.applied) {
          appliedEffect = skill.statusEffect;
        }
      }
    }

    // 어그로
    if (target.isMonster) {
      this.monsterAIs.get(target.id)?.getAggroTable().addDamageAggro(actor.id, result.damage);
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
      dualTechCandidates: [],
      tripleTechCandidates: [],
      combatStats: {
        dualTechFired: this.dualTechFiredCount,
        tripleTechFired: this.tripleTechFiredCount,
        maxChainReached: this.maxChainReached,
      },
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

  /**
   * 시대(ChronoEra) 기반 전투 생성 (CHRONO-S6).
   * eraId → ATBSpeedTier 매핑 자동 적용. extraConfig 로 추가 옵션 override 가능.
   */
  createFromEra(eraId: ChronoEraId, extraConfig?: Partial<CombatConfig>): CombatEngine {
    const speedTier = chronoEraToSpeedTier(eraId);
    return this.create({ speedTier, eraId, ...extraConfig });
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
