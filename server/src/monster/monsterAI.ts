/**
 * monsterAI.ts — 몬스터 AI 상태 머신 + 전투 로직
 *
 * - 상태 머신: idle → patrol → chase → attack → flee → dead
 * - 어그로 시스템 (범위 내 플레이어 감지)
 * - 스킬 사용 로직 (쿨다운 기반)
 * - 보스 패턴 (HP% 기반 페이즈 전환, 광폭화)
 * - 드롭 테이블 처리 (확률 기반 + 레벨 보정)
 */

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 몬스터 AI 상태 */
export type MonsterState = 'idle' | 'patrol' | 'chase' | 'attack' | 'flee' | 'dead';

/** 원소 타입 */
export type ElementType =
  | 'neutral' | 'fire' | 'ice' | 'lightning'
  | 'earth' | 'dark' | 'light' | 'time' | 'aether';

/** 몬스터 스킬 정의 */
export interface MonsterSkill {
  name: string;
  damage: number;
  cooldown: number;      // 초
  element: ElementType;
  effectType: string;    // damage, dot, debuff, aoe, heal
}

/** 행동 패턴 설정 */
export interface BehaviorConfig {
  aggro_range: number;   // 어그로 감지 범위
  patrol: boolean;       // 순찰 여부
  flee_hp_pct: number;   // 도주 HP% 임계값 (0 = 도주 안 함)
  enrage_hp_pct: number; // 광폭화 HP% 임계값 (0 = 광폭화 없음)
}

/** 드롭 테이블 항목 */
export interface DropEntry {
  itemId: string;
  rate: number;          // 0.0 ~ 1.0
  minQty: number;
  maxQty: number;
}

/** 보스 페이즈 정의 */
export interface BossPhase {
  hpPercent: number;     // 페이즈 전환 HP%
  name: string;
  attackMultiplier: number;
  speedMultiplier: number;
  specialSkill?: string; // 해당 페이즈에서 사용하는 특수 스킬 이름
}

/** 플레이어 위치/상태 (외부에서 주입) */
export interface PlayerTarget {
  id: string;
  x: number;
  y: number;
  level: number;
}

/** 어그로 테이블 항목 */
interface AggroEntry {
  playerId: string;
  threat: number;
}

// ─── 몬스터 AI 인스턴스 ─────────────────────────────────────────

export class MonsterAI {
  // 기본 정보
  readonly monsterId: string;
  readonly code: string;
  readonly name: string;
  readonly type: string;
  readonly element: ElementType;
  readonly level: number;

  // 스탯
  readonly maxHp: number;
  currentHp: number;
  readonly baseAttack: number;
  readonly baseDefense: number;
  readonly baseSpeed: number;

  // AI 상태
  state: MonsterState = 'idle';
  private stateTimer: number = 0;

  // 위치
  posX: number;
  posY: number;
  private spawnX: number;
  private spawnY: number;

  // 행동 설정
  private behavior: BehaviorConfig;
  private skills: MonsterSkill[];
  private skillCooldowns: Map<string, number> = new Map();

  // 어그로
  private aggroTable: AggroEntry[] = [];
  private currentTarget: PlayerTarget | null = null;

  // 보스 전용
  private bossPhases: BossPhase[];
  private currentPhaseIndex: number = 0;
  private isEnraged: boolean = false;

  // 드롭
  private dropTable: DropEntry[];
  private expReward: number;
  private goldReward: number;

  constructor(config: {
    monsterId: string;
    code: string;
    name: string;
    type: string;
    element: ElementType;
    level: number;
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    skills: MonsterSkill[];
    behavior: BehaviorConfig;
    dropTable: DropEntry[];
    expReward: number;
    goldReward: number;
    posX: number;
    posY: number;
    bossPhases?: BossPhase[];
  }) {
    this.monsterId = config.monsterId;
    this.code = config.code;
    this.name = config.name;
    this.type = config.type;
    this.element = config.element as ElementType;
    this.level = config.level;
    this.maxHp = config.hp;
    this.currentHp = config.hp;
    this.baseAttack = config.attack;
    this.baseDefense = config.defense;
    this.baseSpeed = config.speed;
    this.skills = config.skills;
    this.behavior = config.behavior;
    this.dropTable = config.dropTable;
    this.expReward = config.expReward;
    this.goldReward = config.goldReward;
    this.posX = config.posX;
    this.posY = config.posY;
    this.spawnX = config.posX;
    this.spawnY = config.posY;
    this.bossPhases = config.bossPhases ?? [];
  }

  // ─── 메인 틱 (로직 틱에서 호출) ────────────────────────────────

  /**
   * AI 업데이트 — 로직 틱마다 호출
   * @param deltaMs 경과 시간 (밀리초)
   * @param nearbyPlayers 범위 내 플레이어 목록
   */
  tick(deltaMs: number, nearbyPlayers: PlayerTarget[]): MonsterAIEvent[] {
    const events: MonsterAIEvent[] = [];
    const deltaSec = deltaMs / 1000;

    // 쿨다운 갱신
    this._updateCooldowns(deltaSec);
    this.stateTimer += deltaSec;

    if (this.state === 'dead') return events;

    switch (this.state) {
      case 'idle':
        events.push(...this._tickIdle(nearbyPlayers));
        break;
      case 'patrol':
        events.push(...this._tickPatrol(nearbyPlayers));
        break;
      case 'chase':
        events.push(...this._tickChase(deltaSec));
        break;
      case 'attack':
        events.push(...this._tickAttack());
        break;
      case 'flee':
        events.push(...this._tickFlee(deltaSec));
        break;
    }

    return events;
  }

  // ─── 상태별 틱 로직 ────────────────────────────────────────────

  private _tickIdle(nearbyPlayers: PlayerTarget[]): MonsterAIEvent[] {
    const events: MonsterAIEvent[] = [];

    // 어그로 범위 내 플레이어 감지
    const target = this._detectTarget(nearbyPlayers);
    if (target) {
      this._addAggro(target.id, 10);
      this.currentTarget = target;
      this._changeState('chase');
      events.push({ type: 'aggro', monsterId: this.monsterId, targetId: target.id });
    } else if (this.behavior.patrol && this.stateTimer > 3) {
      // 3초 대기 후 순찰 시작
      this._changeState('patrol');
    }

    return events;
  }

  private _tickPatrol(nearbyPlayers: PlayerTarget[]): MonsterAIEvent[] {
    const events: MonsterAIEvent[] = [];

    // 순찰 중 적 감지
    const target = this._detectTarget(nearbyPlayers);
    if (target) {
      this._addAggro(target.id, 10);
      this.currentTarget = target;
      this._changeState('chase');
      events.push({ type: 'aggro', monsterId: this.monsterId, targetId: target.id });
      return events;
    }

    // 스폰 지점 주변 랜덤 이동 (간단한 순찰)
    if (this.stateTimer > 5) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 5;
      this.posX = this.spawnX + Math.cos(angle) * radius;
      this.posY = this.spawnY + Math.sin(angle) * radius;
      this._changeState('idle');
    }

    return events;
  }

  private _tickChase(deltaSec: number): MonsterAIEvent[] {
    const events: MonsterAIEvent[] = [];

    if (!this.currentTarget) {
      this._changeState('idle');
      return events;
    }

    const dist = this._distanceTo(this.currentTarget.x, this.currentTarget.y);

    // 공격 범위 진입 (2.0 유닛)
    if (dist <= 2.0) {
      this._changeState('attack');
      return events;
    }

    // 추격 범위 초과 (어그로 범위 × 2) → 복귀
    if (dist > this.behavior.aggro_range * 2) {
      this.currentTarget = null;
      this.aggroTable = [];
      this._changeState('idle');
      this.posX = this.spawnX;
      this.posY = this.spawnY;
      events.push({ type: 'deaggro', monsterId: this.monsterId });
      return events;
    }

    // 타겟 방향으로 이동
    const speed = this._getEffectiveSpeed();
    const dx = this.currentTarget.x - this.posX;
    const dy = this.currentTarget.y - this.posY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      this.posX += (dx / len) * speed * deltaSec;
      this.posY += (dy / len) * speed * deltaSec;
    }

    return events;
  }

  private _tickAttack(): MonsterAIEvent[] {
    const events: MonsterAIEvent[] = [];

    if (!this.currentTarget) {
      this._changeState('idle');
      return events;
    }

    // 도주 체크
    if (this.behavior.flee_hp_pct > 0) {
      const hpPct = (this.currentHp / this.maxHp) * 100;
      if (hpPct <= this.behavior.flee_hp_pct) {
        this._changeState('flee');
        events.push({ type: 'flee', monsterId: this.monsterId });
        return events;
      }
    }

    // 보스 페이즈 체크
    if (this.bossPhases.length > 0) {
      events.push(...this._checkBossPhase());
    }

    // 광폭화 체크
    if (!this.isEnraged && this.behavior.enrage_hp_pct > 0) {
      const hpPct = (this.currentHp / this.maxHp) * 100;
      if (hpPct <= this.behavior.enrage_hp_pct) {
        this.isEnraged = true;
        events.push({ type: 'enrage', monsterId: this.monsterId });
      }
    }

    // 스킬 선택 및 사용
    const skill = this._selectSkill();
    if (skill) {
      const damage = this._calculateSkillDamage(skill);
      this.skillCooldowns.set(skill.name, skill.cooldown);
      events.push({
        type: 'skill_use',
        monsterId: this.monsterId,
        targetId: this.currentTarget.id,
        skillName: skill.name,
        damage,
        element: skill.element,
        effectType: skill.effectType,
      });
    } else {
      // 기본 공격
      const damage = this._calculateBaseDamage();
      events.push({
        type: 'basic_attack',
        monsterId: this.monsterId,
        targetId: this.currentTarget.id,
        damage,
      });
    }

    // 타겟이 범위 밖이면 추격으로 전환
    const dist = this._distanceTo(this.currentTarget.x, this.currentTarget.y);
    if (dist > 3.0) {
      this._changeState('chase');
    }

    return events;
  }

  private _tickFlee(deltaSec: number): MonsterAIEvent[] {
    const events: MonsterAIEvent[] = [];

    // 스폰 지점으로 도주
    const dist = this._distanceTo(this.spawnX, this.spawnY);
    if (dist < 1.0) {
      // 스폰 도착 — 일정 HP 회복 후 idle
      this.currentHp = Math.min(this.maxHp, this.currentHp + Math.floor(this.maxHp * 0.1));
      this.currentTarget = null;
      this.aggroTable = [];
      this._changeState('idle');
      return events;
    }

    const speed = this._getEffectiveSpeed() * 1.3; // 도주 시 30% 가속
    const dx = this.spawnX - this.posX;
    const dy = this.spawnY - this.posY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      this.posX += (dx / len) * speed * deltaSec;
      this.posY += (dy / len) * speed * deltaSec;
    }

    return events;
  }

  // ─── 피격 처리 ────────────────────────────────────────────────

  /**
   * 외부에서 데미지를 입힐 때 호출
   * @returns 사망 시 드롭 결과, 생존 시 null
   */
  takeDamage(attackerId: string, rawDamage: number, attackerLevel: number): {
    actualDamage: number;
    isDead: boolean;
    drops: DropResult[] | null;
    expReward: number;
    goldReward: number;
  } {
    if (this.state === 'dead') {
      return { actualDamage: 0, isDead: true, drops: null, expReward: 0, goldReward: 0 };
    }

    // 방어력 적용 데미지 공식: dmg * (100 / (100 + def))
    const def = this._getEffectiveDefense();
    const actualDamage = Math.max(1, Math.floor(rawDamage * (100 / (100 + def))));

    this.currentHp = Math.max(0, this.currentHp - actualDamage);
    this._addAggro(attackerId, actualDamage);

    if (this.currentHp <= 0) {
      this._changeState('dead');
      const drops = this._rollDrops(attackerLevel);
      return {
        actualDamage,
        isDead: true,
        drops,
        expReward: this.expReward,
        goldReward: this.goldReward,
      };
    }

    return { actualDamage, isDead: false, drops: null, expReward: 0, goldReward: 0 };
  }

  // ─── 드롭 테이블 처리 ─────────────────────────────────────────

  /**
   * 확률 기반 드롭 + 레벨 보정
   * 레벨 차이에 따라 드롭 확률 보정:
   *   - 동레벨: 100%, ±5레벨: ±10% 보정, 최대 ±30%
   */
  private _rollDrops(playerLevel: number): DropResult[] {
    const results: DropResult[] = [];
    const levelDiff = playerLevel - this.level;

    // 레벨 보정 계수: 플레이어가 높으면 확률 감소, 낮으면 증가
    const levelMod = Math.max(0.7, Math.min(1.3, 1.0 - (levelDiff * 0.02)));

    for (const entry of this.dropTable) {
      const adjustedRate = entry.rate * levelMod;
      if (Math.random() < adjustedRate) {
        const qty = entry.minQty + Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1));
        results.push({ itemId: entry.itemId, quantity: qty });
      }
    }

    return results;
  }

  // ─── 보스 페이즈 ──────────────────────────────────────────────

  private _checkBossPhase(): MonsterAIEvent[] {
    const events: MonsterAIEvent[] = [];
    const hpPct = (this.currentHp / this.maxHp) * 100;

    for (let i = this.currentPhaseIndex + 1; i < this.bossPhases.length; i++) {
      if (hpPct <= this.bossPhases[i].hpPercent) {
        this.currentPhaseIndex = i;
        const phase = this.bossPhases[i];
        events.push({
          type: 'phase_change',
          monsterId: this.monsterId,
          phaseName: phase.name,
          phaseIndex: i,
        });
        break;
      }
    }

    return events;
  }

  // ─── 스킬 선택 ───────────────────────────────────────────────

  private _selectSkill(): MonsterSkill | null {
    // 사용 가능한 스킬 (쿨다운이 0인 것) 중 랜덤 선택
    const available = this.skills.filter(s => {
      const cd = this.skillCooldowns.get(s.name) ?? 0;
      return cd <= 0;
    });

    if (available.length === 0) return null;

    // 보스 페이즈 특수 스킬 우선
    if (this.bossPhases.length > 0) {
      const phase = this.bossPhases[this.currentPhaseIndex];
      if (phase.specialSkill) {
        const special = available.find(s => s.name === phase.specialSkill);
        if (special) return special;
      }
    }

    // 30% 확률로 스킬 사용 (일반 몹), 보스는 60%
    const useRate = (this.type === 'boss' || this.type === 'field_boss' || this.type === 'raid_boss')
      ? 0.6 : 0.3;
    if (Math.random() > useRate) return null;

    return available[Math.floor(Math.random() * available.length)];
  }

  // ─── 데미지 계산 ──────────────────────────────────────────────

  private _calculateSkillDamage(skill: MonsterSkill): number {
    let damage = skill.damage + this._getEffectiveAttack();
    // 광폭화 보너스 (+50%)
    if (this.isEnraged) damage = Math.floor(damage * 1.5);
    // 보스 페이즈 배율
    if (this.bossPhases.length > 0) {
      damage = Math.floor(damage * this.bossPhases[this.currentPhaseIndex].attackMultiplier);
    }
    // ±10% 랜덤 분산
    damage = Math.floor(damage * (0.9 + Math.random() * 0.2));
    return Math.max(1, damage);
  }

  private _calculateBaseDamage(): number {
    let damage = this._getEffectiveAttack();
    if (this.isEnraged) damage = Math.floor(damage * 1.5);
    if (this.bossPhases.length > 0) {
      damage = Math.floor(damage * this.bossPhases[this.currentPhaseIndex].attackMultiplier);
    }
    damage = Math.floor(damage * (0.9 + Math.random() * 0.2));
    return Math.max(1, damage);
  }

  // ─── 유틸리티 ─────────────────────────────────────────────────

  private _getEffectiveAttack(): number {
    return this.baseAttack;
  }

  private _getEffectiveDefense(): number {
    return this.baseDefense;
  }

  private _getEffectiveSpeed(): number {
    let speed = this.baseSpeed * 0.1; // 유닛/초 변환
    if (this.isEnraged) speed *= 1.2;
    if (this.bossPhases.length > 0) {
      speed *= this.bossPhases[this.currentPhaseIndex].speedMultiplier;
    }
    return speed;
  }

  private _detectTarget(players: PlayerTarget[]): PlayerTarget | null {
    let closest: PlayerTarget | null = null;
    let minDist = this.behavior.aggro_range;

    for (const p of players) {
      const d = this._distanceTo(p.x, p.y);
      if (d < minDist) {
        minDist = d;
        closest = p;
      }
    }

    return closest;
  }

  private _addAggro(playerId: string, amount: number): void {
    const existing = this.aggroTable.find(a => a.playerId === playerId);
    if (existing) {
      existing.threat += amount;
    } else {
      this.aggroTable.push({ playerId, threat: amount });
    }

    // 최고 위협 대상을 타겟으로 설정
    this.aggroTable.sort((a, b) => b.threat - a.threat);
  }

  private _distanceTo(x: number, y: number): number {
    const dx = this.posX - x;
    const dy = this.posY - y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private _updateCooldowns(deltaSec: number): void {
    for (const [name, cd] of this.skillCooldowns.entries()) {
      const newCd = cd - deltaSec;
      if (newCd <= 0) {
        this.skillCooldowns.delete(name);
      } else {
        this.skillCooldowns.set(name, newCd);
      }
    }
  }

  private _changeState(newState: MonsterState): void {
    this.state = newState;
    this.stateTimer = 0;
  }

  /** 리스폰 (HP 복구 + 상태 초기화) */
  respawn(x?: number, y?: number): void {
    this.currentHp = this.maxHp;
    this.state = 'idle';
    this.stateTimer = 0;
    this.aggroTable = [];
    this.currentTarget = null;
    this.isEnraged = false;
    this.currentPhaseIndex = 0;
    this.skillCooldowns.clear();
    if (x !== undefined && y !== undefined) {
      this.posX = x;
      this.posY = y;
      this.spawnX = x;
      this.spawnY = y;
    } else {
      this.posX = this.spawnX;
      this.posY = this.spawnY;
    }
  }

  /** 현재 상태 스냅샷 */
  getSnapshot(): MonsterSnapshot {
    return {
      monsterId: this.monsterId,
      code: this.code,
      name: this.name,
      type: this.type,
      element: this.element,
      level: this.level,
      currentHp: this.currentHp,
      maxHp: this.maxHp,
      state: this.state,
      posX: this.posX,
      posY: this.posY,
      isEnraged: this.isEnraged,
      currentPhase: this.bossPhases.length > 0 ? this.bossPhases[this.currentPhaseIndex].name : null,
    };
  }
}

// ─── 이벤트 타입 ────────────────────────────────────────────────

export type MonsterAIEvent =
  | { type: 'aggro'; monsterId: string; targetId: string }
  | { type: 'deaggro'; monsterId: string }
  | { type: 'flee'; monsterId: string }
  | { type: 'enrage'; monsterId: string }
  | { type: 'phase_change'; monsterId: string; phaseName: string; phaseIndex: number }
  | { type: 'skill_use'; monsterId: string; targetId: string; skillName: string; damage: number; element: string; effectType: string }
  | { type: 'basic_attack'; monsterId: string; targetId: string; damage: number };

/** 드롭 결과 */
export interface DropResult {
  itemId: string;
  quantity: number;
}

/** 몬스터 상태 스냅샷 */
export interface MonsterSnapshot {
  monsterId: string;
  code: string;
  name: string;
  type: string;
  element: string;
  level: number;
  currentHp: number;
  maxHp: number;
  state: MonsterState;
  posX: number;
  posY: number;
  isEnraged: boolean;
  currentPhase: string | null;
}
