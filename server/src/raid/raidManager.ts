/**
 * raidManager.ts — 레이드 보스 전투 매니저
 *
 * - 세션 생성/참가/시작/종료
 * - 메모리 기반 실시간 HP 관리 + 주기적 DB 동기화
 * - HP% 기반 보스 메카닉 트리거
 * - 참여도 가중 랜덤 전리품 분배
 * - 타임아웃 자동 실패 처리
 */
import { prisma } from '../db';
import type { Prisma } from '@prisma/client';

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 참가자 정보 */
export interface RaidParticipant {
  userId: string;
  damage: number;
  role: string; // tank, dps, healer
}

/** 전리품 테이블 항목 */
interface LootEntry {
  itemId: string;
  dropRate: number;
  tier: string;
}

/** 보스 메카닉 정의 */
interface MechanicDef {
  hpPercent: number;   // 발동 HP% 임계값
  type: string;        // 메카닉 유형
  description: string;
  damage?: number;
}

/** 메모리 상 활성 세션 */
interface ActiveSession {
  sessionId: string;
  bossId: string;
  guildId: string | null;
  maxHp: number;
  currentHp: number;
  participants: Map<string, RaidParticipant>;
  mechanics: MechanicDef[];
  triggeredMechanics: Set<number>; // 이미 발동된 hpPercent 집합
  lootTable: LootEntry[];
  timeLimit: number;     // 초
  minPlayers: number;
  maxPlayers: number;
  status: 'forming' | 'fighting' | 'cleared' | 'failed';
  startedAt: number | null;  // Date.now()
  syncTimer: ReturnType<typeof setInterval> | null;
  timeoutTimer: ReturnType<typeof setTimeout> | null;
}

// ─── 콜백 타입 ──────────────────────────────────────────────────

export type OnMechanicCallback = (sessionId: string, mechanic: MechanicDef) => void;
export type OnBossDefeatedCallback = (sessionId: string, loot: LootResult[]) => void;
export type OnSessionFailedCallback = (sessionId: string, reason: string) => void;
export type OnHpUpdateCallback = (sessionId: string, currentHp: number, maxHp: number) => void;

export interface LootResult {
  userId: string;
  itemId: string;
  tier: string;
}

// ─── 상수 ───────────────────────────────────────────────────────

/** DB 동기화 주기 (ms) */
const DB_SYNC_INTERVAL_MS = 5_000;

// ─── 레이드 매니저 클래스 ───────────────────────────────────────

export class RaidManager {
  /** 활성 세션 캐시 (sessionId → ActiveSession) */
  private sessions = new Map<string, ActiveSession>();

  // 이벤트 콜백
  private onMechanic: OnMechanicCallback | null = null;
  private onBossDefeated: OnBossDefeatedCallback | null = null;
  private onSessionFailed: OnSessionFailedCallback | null = null;
  private onHpUpdate: OnHpUpdateCallback | null = null;

  // ── 콜백 등록 ──────────────────────────────────────────────

  setOnMechanic(cb: OnMechanicCallback): void { this.onMechanic = cb; }
  setOnBossDefeated(cb: OnBossDefeatedCallback): void { this.onBossDefeated = cb; }
  setOnSessionFailed(cb: OnSessionFailedCallback): void { this.onSessionFailed = cb; }
  setOnHpUpdate(cb: OnHpUpdateCallback): void { this.onHpUpdate = cb; }

  // ── 세션 생성 ──────────────────────────────────────────────

  /** 레이드 세션 생성 — 보스 정보 조회 후 메모리 + DB에 등록 */
  async createSession(bossId: string, creatorUserId: string, guildId?: string): Promise<ActiveSession> {
    const boss = await prisma.raidBoss.findUnique({ where: { id: bossId } });
    if (!boss) throw new Error(`보스를 찾을 수 없습니다: ${bossId}`);
    if (!boss.isActive) throw new Error(`비활성 보스입니다: ${boss.name}`);

    const mechanics = (boss.mechanics as MechanicDef[] | null) ?? [];
    const lootTable = boss.lootTable as unknown as LootEntry[];

    // DB에 세션 레코드 생성
    const dbSession = await prisma.raidSession.create({
      data: {
        bossId,
        guildId: guildId ?? null,
        status: 'forming',
        currentHp: boss.maxHp,
        participants: [{ userId: creatorUserId, damage: 0, role: 'dps' }] as unknown as Prisma.InputJsonValue,
      },
    });

    // 메모리 세션 초기화
    const session: ActiveSession = {
      sessionId: dbSession.id,
      bossId,
      guildId: guildId ?? null,
      maxHp: boss.maxHp,
      currentHp: boss.maxHp,
      participants: new Map([
        [creatorUserId, { userId: creatorUserId, damage: 0, role: 'dps' }],
      ]),
      mechanics,
      triggeredMechanics: new Set(),
      lootTable,
      timeLimit: boss.timeLimit,
      minPlayers: boss.minPlayers,
      maxPlayers: boss.maxPlayers,
      status: 'forming',
      startedAt: null,
      syncTimer: null,
      timeoutTimer: null,
    };

    this.sessions.set(dbSession.id, session);
    return session;
  }

  // ── 참가 ───────────────────────────────────────────────────

  /** 레이드 세션에 참가 */
  async joinSession(sessionId: string, userId: string, role: string = 'dps'): Promise<ActiveSession> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`);
    if (session.status !== 'forming') throw new Error('이미 시작되었거나 종료된 세션입니다.');
    if (session.participants.has(userId)) throw new Error('이미 참가 중입니다.');
    if (session.participants.size >= session.maxPlayers) throw new Error('최대 인원 초과');

    session.participants.set(userId, { userId, damage: 0, role });

    // DB 동기화
    await prisma.raidSession.update({
      where: { id: sessionId },
      data: { participants: this.serializeParticipants(session) },
    });

    return session;
  }

  // ── 전투 시작 ──────────────────────────────────────────────

  /** 레이드 전투 시작 — 최소 인원 충족 확인 후 fighting 상태 전환 */
  async startSession(sessionId: string): Promise<ActiveSession> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`);
    if (session.status !== 'forming') throw new Error('forming 상태에서만 시작할 수 있습니다.');
    if (session.participants.size < session.minPlayers) {
      throw new Error(`최소 ${session.minPlayers}명 필요 (현재: ${session.participants.size}명)`);
    }

    session.status = 'fighting';
    session.startedAt = Date.now();

    // DB 상태 업데이트
    await prisma.raidSession.update({
      where: { id: sessionId },
      data: { status: 'fighting', startedAt: new Date() },
    });

    // 주기적 DB 동기화 타이머 시작
    session.syncTimer = setInterval(() => {
      void this.syncToDb(sessionId);
    }, DB_SYNC_INTERVAL_MS);

    // 타임아웃 자동 실패 타이머
    session.timeoutTimer = setTimeout(() => {
      void this.failSession(sessionId, 'timeout');
    }, session.timeLimit * 1000);

    return session;
  }

  // ── 데미지 처리 ────────────────────────────────────────────

  /** 플레이어 공격 처리 — HP 감소 + 메카닉 체크 + 클리어 판정 */
  async applyDamage(
    sessionId: string,
    userId: string,
    damage: number,
  ): Promise<{ currentHp: number; mechanic?: MechanicDef; cleared: boolean }> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`);
    if (session.status !== 'fighting') throw new Error('전투 중이 아닙니다.');

    const participant = session.participants.get(userId);
    if (!participant) throw new Error('참가자가 아닙니다.');

    // 데미지 적용
    const actualDamage = Math.max(0, damage);
    session.currentHp = Math.max(0, session.currentHp - actualDamage);
    participant.damage += actualDamage;

    // HP 업데이트 콜백
    this.onHpUpdate?.(sessionId, session.currentHp, session.maxHp);

    // 메카닉 트리거 체크 (HP% 기반)
    const hpPercent = (session.currentHp / session.maxHp) * 100;
    let triggeredMechanic: MechanicDef | undefined;

    for (const mech of session.mechanics) {
      if (hpPercent <= mech.hpPercent && !session.triggeredMechanics.has(mech.hpPercent)) {
        session.triggeredMechanics.add(mech.hpPercent);
        triggeredMechanic = mech;
        this.onMechanic?.(sessionId, mech);
        break; // 한 턴에 하나의 메카닉만 트리거
      }
    }

    // 보스 처치 판정
    if (session.currentHp <= 0) {
      const loot = await this.clearSession(sessionId);
      return { currentHp: 0, mechanic: triggeredMechanic, cleared: true };
    }

    return { currentHp: session.currentHp, mechanic: triggeredMechanic, cleared: false };
  }

  // ── 세션 클리어 ────────────────────────────────────────────

  /** 보스 처치 완료 — 전리품 분배 + 상태 갱신 */
  private async clearSession(sessionId: string): Promise<LootResult[]> {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    session.status = 'cleared';
    this.clearTimers(session);

    // 전리품 분배 (참여도 기반 가중 랜덤)
    const loot = this.distributeLoot(session);

    // DB 최종 동기화
    await prisma.raidSession.update({
      where: { id: sessionId },
      data: {
        status: 'cleared',
        currentHp: 0,
        participants: this.serializeParticipants(session),
        lootResult: loot as unknown as Prisma.InputJsonValue,
        endedAt: new Date(),
      },
    });

    this.onBossDefeated?.(sessionId, loot);
    this.sessions.delete(sessionId);

    return loot;
  }

  // ── 세션 실패 ──────────────────────────────────────────────

  /** 세션 실패 처리 (타임아웃 또는 수동) */
  private async failSession(sessionId: string, reason: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'fighting') return;

    session.status = 'failed';
    this.clearTimers(session);

    await prisma.raidSession.update({
      where: { id: sessionId },
      data: {
        status: 'failed',
        currentHp: session.currentHp,
        participants: this.serializeParticipants(session),
        endedAt: new Date(),
      },
    });

    this.onSessionFailed?.(sessionId, reason);
    this.sessions.delete(sessionId);
  }

  // ── 전리품 분배 ────────────────────────────────────────────

  /**
   * 참여도(데미지) 기반 가중 랜덤 전리품 분배
   * — 각 전리품 항목에 대해 dropRate 확률로 드롭 결정
   * — 드롭 시 참여도 가중치에 따라 수령자 결정
   */
  private distributeLoot(session: ActiveSession): LootResult[] {
    const results: LootResult[] = [];
    const participants = Array.from(session.participants.values());
    const totalDamage = participants.reduce((sum, p) => sum + p.damage, 0);

    if (totalDamage === 0) return results;

    for (const lootEntry of session.lootTable) {
      // 드롭 확률 판정
      if (Math.random() > lootEntry.dropRate) continue;

      // 참여도 가중 랜덤 — 데미지 비율에 따라 수령 확률 결정
      const roll = Math.random() * totalDamage;
      let cumulative = 0;
      let winner: RaidParticipant | null = null;

      for (const p of participants) {
        cumulative += p.damage;
        if (roll <= cumulative) {
          winner = p;
          break;
        }
      }

      if (winner) {
        results.push({
          userId: winner.userId,
          itemId: lootEntry.itemId,
          tier: lootEntry.tier,
        });
      }
    }

    return results;
  }

  // ── 유틸리티 ───────────────────────────────────────────────

  /** 타이머 정리 */
  private clearTimers(session: ActiveSession): void {
    if (session.syncTimer) { clearInterval(session.syncTimer); session.syncTimer = null; }
    if (session.timeoutTimer) { clearTimeout(session.timeoutTimer); session.timeoutTimer = null; }
  }

  /** 참가자 Map → JSON 직렬화 (Prisma InputJsonValue 호환) */
  private serializeParticipants(session: ActiveSession): Prisma.InputJsonValue {
    return Array.from(session.participants.values()) as unknown as Prisma.InputJsonValue;
  }

  /** 메모리 → DB 주기적 동기화 */
  private async syncToDb(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'fighting') return;

    try {
      await prisma.raidSession.update({
        where: { id: sessionId },
        data: {
          currentHp: session.currentHp,
          participants: this.serializeParticipants(session),
        },
      });
    } catch (err) {
      console.error(`[Raid] DB 동기화 실패 (${sessionId}):`, err);
    }
  }

  /** 세션 조회 (읽기 전용) */
  getSession(sessionId: string): ActiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  /** 전체 활성 세션 목록 */
  getActiveSessions(): ActiveSession[] {
    return Array.from(this.sessions.values());
  }

  /** 매니저 정리 — 서버 종료 시 호출 */
  shutdown(): void {
    for (const session of this.sessions.values()) {
      this.clearTimers(session);
    }
    this.sessions.clear();
  }
}

// ═══════════════════════════════════════════════════════════════
//  P14-11: 8인 레이드 확장
//  시간의 균열 레이드 보스 2종 + 8인 파티 매칭 + 3페이즈 + 광폭화
// ═══════════════════════════════════════════════════════════════

// ─── 8인 레이드 타입 ────────────────────────────────────────────

export type RaidRoleSlot = 'tank' | 'healer' | 'dps';

export interface RaidComposition {
  tank: number;
  healer: number;
  dps: number;
  total: number;
}

export interface RaidBossPhase {
  phase: number;
  name: string;
  hpThresholdPercent: number;   // 이 HP% 이하에서 진입
  mechanics: MechanicDef[];
  description: string;
}

export interface EnrageConfig {
  /** 광폭화 타이머 (초) */
  enrageTimerSec: number;
  /** 광폭화 시 데미지 증가율 */
  damageMultiplier: number;
  /** 광폭화 시 공격 속도 증가율 */
  attackSpeedMultiplier: number;
  description: string;
}

export interface EightManRaidBossDef {
  id: string;
  name: string;
  nameEn: string;
  nameJa: string;
  region: string;
  description: string;
  maxHp: number;
  attack: number;
  defense: number;
  /** 8인 전용 */
  composition: RaidComposition;
  /** 3페이즈 정의 */
  phases: RaidBossPhase[];
  /** 광폭화 설정 */
  enrage: EnrageConfig;
  /** 전리품 테이블 */
  lootTable: LootEntry[];
  /** 시간 제한 (초) */
  timeLimit: number;
  /** 최소 아이템 레벨 */
  minItemLevel: number;
}

// ─── 8인 파티 매칭 큐 ───────────────────────────────────────────

export interface RaidQueueEntry {
  userId: string;
  role: RaidRoleSlot;
  itemLevel: number;
  classId: string;
  queuedAt: number;
}

interface RaidMatchResult {
  entries: RaidQueueEntry[];
  composition: { tank: string[]; healer: string[]; dps: string[] };
}

// ─── 8인 레이드 보스 시드 데이터 ────────────────────────────────

export const EIGHT_MAN_RAID_BOSSES: readonly EightManRaidBossDef[] = [
  // ── 보스 1: 크로노스 프라임 (시간 조작) ──────────────────
  {
    id: 'raid_boss_chronos_prime',
    name: '크로노스 프라임',
    nameEn: 'Chronos Prime',
    nameJa: 'クロノス・プライム',
    region: 'temporal_rift',
    description:
      '시간의 균열 최심부에 깨어난 태고의 시간 지배자. ' +
      '시간 역행/가속/정지를 자유자재로 조작하며, ' +
      '과거의 자신을 소환해 분신 공격을 가한다.',
    maxHp: 50_000_000,
    attack: 12_000,
    defense: 8_000,
    composition: { tank: 2, healer: 2, dps: 4, total: 8 },
    timeLimit: 600, // 10분
    minItemLevel: 350,
    enrage: {
      enrageTimerSec: 540, // 9분
      damageMultiplier: 3.0,
      attackSpeedMultiplier: 2.0,
      description: '시간 붕괴 — 크로노스가 시간의 흐름을 완전히 장악, 모든 공격력 3배',
    },
    phases: [
      {
        phase: 1,
        name: '시간의 파동',
        hpThresholdPercent: 100,
        description: '기본 패턴. 시간 가속/감속 디버프를 랜덤 대상에게 부여.',
        mechanics: [
          {
            hpPercent: 90,
            type: 'temporal_wave',
            description: '시간 파동 — 전방 원뿔형 AoE, 피격 시 행동속도 -50% (8초)',
            damage: 15_000,
          },
          {
            hpPercent: 80,
            type: 'time_acceleration',
            description: '시간 가속 — 랜덤 2명에게 DoT (초당 3,000, 10초). 디스펠 가능',
            damage: 30_000,
          },
        ],
      },
      {
        phase: 2,
        name: '분신의 시간',
        hpThresholdPercent: 60,
        description: '과거의 분신 2체 소환. 본체와 분신이 연동 패턴 사용.',
        mechanics: [
          {
            hpPercent: 55,
            type: 'temporal_clone',
            description: '시간 분신 소환 — HP 500만짜리 분신 2체. 30초 내 미처치 시 본체 완전 회복',
            damage: 0,
          },
          {
            hpPercent: 45,
            type: 'chrono_prison',
            description: '시간 감옥 — 탱커 1명을 5초간 격리. 다른 탱커가 어그로 인수 필요',
            damage: 20_000,
          },
        ],
      },
      {
        phase: 3,
        name: '시간의 종말',
        hpThresholdPercent: 25,
        description: '시간 정지 + 대규모 AoE 연속. 파티 전체 힐/회피 필수.',
        mechanics: [
          {
            hpPercent: 20,
            type: 'time_stop',
            description: '시간 정지 — 전원 2초 기절 후 전체 AoE (HP의 80% 데미지)',
            damage: 40_000,
          },
          {
            hpPercent: 10,
            type: 'temporal_collapse',
            description: '시공 붕괴 — 맵 전체 지속 데미지 (초당 5,000). 광폭화 전조',
            damage: 50_000,
          },
        ],
      },
    ],
    lootTable: [
      { itemId: 'weapon_chronos_blade',      dropRate: 0.05, tier: 'legendary' },
      { itemId: 'armor_temporal_plate',       dropRate: 0.08, tier: 'legendary' },
      { itemId: 'accessory_time_pendant',     dropRate: 0.10, tier: 'epic' },
      { itemId: 'material_chrono_shard',      dropRate: 0.50, tier: 'epic' },
      { itemId: 'material_temporal_essence',  dropRate: 0.80, tier: 'rare' },
      { itemId: 'cosmetic_chronos_aura',      dropRate: 0.03, tier: 'legendary' },
    ],
  },

  // ── 보스 2: 보이드 아키텍트 (공간 왜곡) ──────────────────
  {
    id: 'raid_boss_void_architect',
    name: '보이드 아키텍트',
    nameEn: 'Void Architect',
    nameJa: 'ヴォイド・アーキテクト',
    region: 'temporal_rift',
    description:
      '시간의 균열 너머 허공에서 온 차원 설계자. ' +
      '공간을 접고 펼쳐 전장의 지형을 실시간으로 바꾸며, ' +
      '차원 포탈로 파티원을 분리시키는 전략을 구사한다.',
    maxHp: 65_000_000,
    attack: 10_000,
    defense: 10_000,
    composition: { tank: 2, healer: 2, dps: 4, total: 8 },
    timeLimit: 720, // 12분
    minItemLevel: 370,
    enrage: {
      enrageTimerSec: 660, // 11분
      damageMultiplier: 2.5,
      attackSpeedMultiplier: 1.8,
      description: '차원 붕괴 — 허공이 모든 것을 삼키기 시작, 전장 축소 + 지속 데미지',
    },
    phases: [
      {
        phase: 1,
        name: '공간 왜곡',
        hpThresholdPercent: 100,
        description: '전장 지형 변형 + 공간 균열 AoE.',
        mechanics: [
          {
            hpPercent: 85,
            type: 'spatial_rift',
            description: '공간 균열 — 맵에 3개 균열 생성, 접촉 시 즉사급 데미지',
            damage: 50_000,
          },
          {
            hpPercent: 75,
            type: 'gravity_well',
            description: '중력 우물 — 랜덤 위치에 중력장 생성, 5초간 끌어당김 + 데미지',
            damage: 18_000,
          },
        ],
      },
      {
        phase: 2,
        name: '차원 분리',
        hpThresholdPercent: 55,
        description: '파티를 2개 차원으로 분리. 각 차원에서 미니보스 처치 후 재합류.',
        mechanics: [
          {
            hpPercent: 50,
            type: 'dimensional_split',
            description: '차원 분리 — 4:4로 파티 분할, 각 그룹이 미니보스(HP 300만) 처치 필요',
            damage: 0,
          },
          {
            hpPercent: 40,
            type: 'void_beam',
            description: '허공의 광선 — 일직선 관통 빔, 2명 이상 겹쳐야 데미지 분산',
            damage: 60_000,
          },
        ],
      },
      {
        phase: 3,
        name: '허공의 심판',
        hpThresholdPercent: 20,
        description: '전장 대축소 + 연속 차원 폭발. 생존 DPS 체크.',
        mechanics: [
          {
            hpPercent: 15,
            type: 'collapsing_space',
            description: '공간 축소 — 안전 지대가 점점 줄어듦. 30초간 지속',
            damage: 25_000,
          },
          {
            hpPercent: 5,
            type: 'void_annihilation',
            description: '허공 소멸 — 최후의 전체 공격. 5초 캐스팅, 차단 불가. 순수 DPS 레이스',
            damage: 100_000,
          },
        ],
      },
    ],
    lootTable: [
      { itemId: 'weapon_void_staff',          dropRate: 0.05, tier: 'legendary' },
      { itemId: 'armor_void_weave',           dropRate: 0.08, tier: 'legendary' },
      { itemId: 'accessory_dimension_ring',   dropRate: 0.10, tier: 'epic' },
      { itemId: 'material_void_fragment',     dropRate: 0.50, tier: 'epic' },
      { itemId: 'material_spatial_dust',      dropRate: 0.80, tier: 'rare' },
      { itemId: 'mount_void_walker',          dropRate: 0.02, tier: 'legendary' },
    ],
  },
];

// ─── 8인 레이드 매칭 시스템 ─────────────────────────────────────

export class EightManRaidMatchmaker {
  private queue = new Map<string, RaidQueueEntry[]>(); // bossId → entries

  /**
   * 큐에 등록
   */
  enqueue(bossId: string, entry: RaidQueueEntry): { position: number } {
    const boss = EIGHT_MAN_RAID_BOSSES.find(b => b.id === bossId);
    if (!boss) throw new Error(`보스를 찾을 수 없습니다: ${bossId}`);
    if (entry.itemLevel < boss.minItemLevel) {
      throw new Error(`아이템 레벨 부족: ${entry.itemLevel} < ${boss.minItemLevel}`);
    }

    if (!this.queue.has(bossId)) this.queue.set(bossId, []);
    const q = this.queue.get(bossId)!;

    // 중복 등록 방지
    if (q.some(e => e.userId === entry.userId)) {
      throw new Error('이미 큐에 등록되어 있습니다.');
    }

    q.push(entry);
    return { position: q.length };
  }

  /**
   * 큐에서 제거
   */
  dequeue(bossId: string, userId: string): void {
    const q = this.queue.get(bossId);
    if (!q) return;
    const idx = q.findIndex(e => e.userId === userId);
    if (idx >= 0) q.splice(idx, 1);
  }

  /**
   * 매칭 시도 — 조건 충족 시 8인 파티 구성
   * 탱 2 / 힐 2 / 딜 4 구성
   */
  tryMatch(bossId: string): RaidMatchResult | null {
    const boss = EIGHT_MAN_RAID_BOSSES.find(b => b.id === bossId);
    if (!boss) return null;

    const q = this.queue.get(bossId);
    if (!q || q.length < boss.composition.total) return null;

    const tanks = q.filter(e => e.role === 'tank');
    const healers = q.filter(e => e.role === 'healer');
    const dps = q.filter(e => e.role === 'dps');

    if (tanks.length < boss.composition.tank) return null;
    if (healers.length < boss.composition.healer) return null;
    if (dps.length < boss.composition.dps) return null;

    // 아이템 레벨 높은 순으로 선발
    const selectedTanks = tanks
      .sort((a, b) => b.itemLevel - a.itemLevel)
      .slice(0, boss.composition.tank);
    const selectedHealers = healers
      .sort((a, b) => b.itemLevel - a.itemLevel)
      .slice(0, boss.composition.healer);
    const selectedDps = dps
      .sort((a, b) => b.itemLevel - a.itemLevel)
      .slice(0, boss.composition.dps);

    const selected = [...selectedTanks, ...selectedHealers, ...selectedDps];

    // 큐에서 제거
    const selectedIds = new Set(selected.map(e => e.userId));
    this.queue.set(bossId, q.filter(e => !selectedIds.has(e.userId)));

    return {
      entries: selected,
      composition: {
        tank: selectedTanks.map(e => e.userId),
        healer: selectedHealers.map(e => e.userId),
        dps: selectedDps.map(e => e.userId),
      },
    };
  }

  /**
   * 큐 상태 조회
   */
  getQueueStatus(bossId: string): {
    total: number;
    byRole: Record<RaidRoleSlot, number>;
    estimatedWaitSec: number;
  } {
    const q = this.queue.get(bossId) ?? [];
    const byRole = { tank: 0, healer: 0, dps: 0 };
    for (const e of q) byRole[e.role]++;

    // 대기 시간 추정 (가장 부족한 역할 기준)
    const boss = EIGHT_MAN_RAID_BOSSES.find(b => b.id === bossId);
    let estimatedWaitSec = 300; // 기본 5분
    if (boss) {
      const tankDeficit = Math.max(0, boss.composition.tank - byRole.tank);
      const healerDeficit = Math.max(0, boss.composition.healer - byRole.healer);
      const dpsDeficit = Math.max(0, boss.composition.dps - byRole.dps);
      const maxDeficit = Math.max(tankDeficit, healerDeficit, dpsDeficit);
      estimatedWaitSec = maxDeficit * 120; // 부족 1명당 ~2분
    }

    return { total: q.length, byRole, estimatedWaitSec };
  }

  /**
   * 큐 전체 초기화
   */
  clearAll(): void {
    this.queue.clear();
  }
}

export const eightManRaidMatchmaker = new EightManRaidMatchmaker();

// ── 싱글턴 인스턴스 ──────────────────────────────────────────

export const raidManager = new RaidManager();
