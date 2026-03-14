// ─── 전투 로거 + 리플레이 시스템 (P24-17) ─────────────────────
// 전투 액션 기록, 리플레이 데이터, DPS/통계

// ─── 로그 엔트리 타입 ──────────────────────────────────────────

export type CombatLogType =
  | 'damage'
  | 'heal'
  | 'skill_use'
  | 'buff_apply'
  | 'debuff_apply'
  | 'effect_expire'
  | 'death'
  | 'level_up'
  | 'item_use'
  | 'phase_change'
  | 'enrage'
  | 'summon'
  | 'combat_start'
  | 'combat_end';

export interface CombatLogEntry {
  /** 타임스탬프 (틱 번호) */
  tick: number;
  /** 실제 시간 (ms) */
  timestamp: number;
  /** 로그 타입 */
  type: CombatLogType;
  /** 행동 주체 ID */
  sourceId: string;
  /** 대상 ID */
  targetId: string;
  /** 스킬/아이템 ID */
  actionId?: string;
  /** 수치 (데미지, 힐량 등) */
  value?: number;
  /** 크리티컬 여부 */
  isCritical?: boolean;
  /** 속성 */
  element?: string;
  /** 추가 정보 */
  metadata?: Record<string, unknown>;
}

// ─── 전투 통계 ─────────────────────────────────────────────────

export interface CombatStatistics {
  /** 전투 ID */
  combatId: string;
  /** 전투 시작 시간 */
  startTime: number;
  /** 전투 종료 시간 */
  endTime: number;
  /** 총 틱 수 */
  totalTicks: number;
  /** 참가자별 통계 */
  participants: ParticipantStats[];
  /** 승리 팀 */
  winnerTeam: 'party' | 'monsters' | 'draw';
}

export interface ParticipantStats {
  id: string;
  name: string;
  isMonster: boolean;
  /** 총 데미지 */
  totalDamage: number;
  /** 총 힐량 */
  totalHealing: number;
  /** 최대 단일 데미지 */
  maxDamage: number;
  /** DPS (초당 데미지) */
  dps: number;
  /** 크리티컬 횟수 */
  critCount: number;
  /** 총 공격 횟수 */
  totalActions: number;
  /** 스킬 사용 횟수 */
  skillsUsed: number;
  /** 받은 데미지 */
  damageTaken: number;
  /** 사망 여부 */
  isDead: boolean;
  /** 사망 틱 */
  deathTick?: number;
}

// ─── 리플레이 데이터 ───────────────────────────────────────────

export interface CombatReplay {
  combatId: string;
  entries: CombatLogEntry[];
  statistics: CombatStatistics;
  /** 직렬화된 크기 (bytes) */
  serializedSize: number;
}

// ─── 전투 로거 ─────────────────────────────────────────────────

export class CombatLogger {
  private combatId: string;
  private entries: CombatLogEntry[] = [];
  private startTime: number;
  private currentTick = 0;

  /** 참가자별 누적 통계 */
  private stats = new Map<string, {
    name: string;
    isMonster: boolean;
    totalDamage: number;
    totalHealing: number;
    maxDamage: number;
    critCount: number;
    totalActions: number;
    skillsUsed: number;
    damageTaken: number;
    isDead: boolean;
    deathTick?: number;
  }>();

  constructor(combatId: string) {
    this.combatId = combatId;
    this.startTime = Date.now();
  }

  // ── 참가자 등록 ─────────────────────────────────────────

  registerParticipant(id: string, name: string, isMonster: boolean): void {
    this.stats.set(id, {
      name,
      isMonster,
      totalDamage: 0,
      totalHealing: 0,
      maxDamage: 0,
      critCount: 0,
      totalActions: 0,
      skillsUsed: 0,
      damageTaken: 0,
      isDead: false,
    });
  }

  // ── 틱 갱신 ─────────────────────────────────────────────

  setTick(tick: number): void {
    this.currentTick = tick;
  }

  // ── 로그 기록 ───────────────────────────────────────────

  logDamage(
    sourceId: string, targetId: string, damage: number,
    isCritical: boolean, skillId?: string, element?: string,
  ): void {
    this.entries.push({
      tick: this.currentTick,
      timestamp: Date.now(),
      type: 'damage',
      sourceId,
      targetId,
      actionId: skillId,
      value: damage,
      isCritical,
      element,
    });

    const srcStats = this.stats.get(sourceId);
    if (srcStats) {
      srcStats.totalDamage += damage;
      srcStats.maxDamage = Math.max(srcStats.maxDamage, damage);
      srcStats.totalActions++;
      if (isCritical) srcStats.critCount++;
      if (skillId) srcStats.skillsUsed++;
    }

    const tgtStats = this.stats.get(targetId);
    if (tgtStats) {
      tgtStats.damageTaken += damage;
    }
  }

  logHeal(sourceId: string, targetId: string, amount: number, skillId?: string): void {
    this.entries.push({
      tick: this.currentTick,
      timestamp: Date.now(),
      type: 'heal',
      sourceId,
      targetId,
      actionId: skillId,
      value: amount,
    });

    const srcStats = this.stats.get(sourceId);
    if (srcStats) {
      srcStats.totalHealing += amount;
      srcStats.totalActions++;
      if (skillId) srcStats.skillsUsed++;
    }
  }

  logSkillUse(sourceId: string, skillId: string): void {
    this.entries.push({
      tick: this.currentTick,
      timestamp: Date.now(),
      type: 'skill_use',
      sourceId,
      targetId: '',
      actionId: skillId,
    });
  }

  logDeath(targetId: string, killerId: string): void {
    this.entries.push({
      tick: this.currentTick,
      timestamp: Date.now(),
      type: 'death',
      sourceId: killerId,
      targetId,
    });

    const tgtStats = this.stats.get(targetId);
    if (tgtStats) {
      tgtStats.isDead = true;
      tgtStats.deathTick = this.currentTick;
    }
  }

  logPhaseChange(bossId: string, fromPhase: number, toPhase: number): void {
    this.entries.push({
      tick: this.currentTick,
      timestamp: Date.now(),
      type: 'phase_change',
      sourceId: bossId,
      targetId: '',
      metadata: { fromPhase, toPhase },
    });
  }

  logEnrage(bossId: string): void {
    this.entries.push({
      tick: this.currentTick,
      timestamp: Date.now(),
      type: 'enrage',
      sourceId: bossId,
      targetId: '',
    });
  }

  logCombatStart(partyIds: string[], monsterIds: string[]): void {
    this.entries.push({
      tick: 0,
      timestamp: this.startTime,
      type: 'combat_start',
      sourceId: '',
      targetId: '',
      metadata: { partyIds, monsterIds },
    });
  }

  logCombatEnd(winnerTeam: 'party' | 'monsters' | 'draw'): void {
    this.entries.push({
      tick: this.currentTick,
      timestamp: Date.now(),
      type: 'combat_end',
      sourceId: '',
      targetId: '',
      metadata: { winnerTeam },
    });
  }

  // ── 통계 생성 ───────────────────────────────────────────

  generateStatistics(winnerTeam: 'party' | 'monsters' | 'draw'): CombatStatistics {
    const endTime = Date.now();
    const durationSeconds = Math.max(1, (endTime - this.startTime) / 1000);

    const participants: ParticipantStats[] = [];
    for (const [id, s] of this.stats) {
      participants.push({
        id,
        name: s.name,
        isMonster: s.isMonster,
        totalDamage: s.totalDamage,
        totalHealing: s.totalHealing,
        maxDamage: s.maxDamage,
        dps: Math.round(s.totalDamage / durationSeconds * 10) / 10,
        critCount: s.critCount,
        totalActions: s.totalActions,
        skillsUsed: s.skillsUsed,
        damageTaken: s.damageTaken,
        isDead: s.isDead,
        deathTick: s.deathTick,
      });
    }

    return {
      combatId: this.combatId,
      startTime: this.startTime,
      endTime,
      totalTicks: this.currentTick,
      participants,
      winnerTeam,
    };
  }

  // ── 리플레이 데이터 생성 ────────────────────────────────

  generateReplay(winnerTeam: 'party' | 'monsters' | 'draw'): CombatReplay {
    const statistics = this.generateStatistics(winnerTeam);
    const serialized = JSON.stringify({ entries: this.entries, statistics });

    return {
      combatId: this.combatId,
      entries: [...this.entries],
      statistics,
      serializedSize: Buffer.byteLength(serialized, 'utf-8'),
    };
  }

  // ── 로그 조회 ───────────────────────────────────────────

  getEntries(): CombatLogEntry[] {
    return [...this.entries];
  }

  getEntriesByType(type: CombatLogType): CombatLogEntry[] {
    return this.entries.filter(e => e.type === type);
  }

  getEntriesBySource(sourceId: string): CombatLogEntry[] {
    return this.entries.filter(e => e.sourceId === sourceId);
  }
}
