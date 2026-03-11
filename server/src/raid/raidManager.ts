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

// ── 싱글턴 인스턴스 ──────────────────────────────────────────

export const raidManager = new RaidManager();
