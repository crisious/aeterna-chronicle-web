/**
 * dungeonManager.ts — 던전 전투 매니저 (P5-03)
 *
 * - 입장 (일일 제한 검증)
 * - 웨이브 진행 / 보스전
 * - 클리어 보상 분배
 * - 실패 / 포기 처리
 * - 타임아웃 자동 실패
 */
import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 던전 웨이브 정의 */
export interface DungeonWave {
  wave: number;
  monsters: { monsterId: string; count: number }[];
  isBoss: boolean;
}

/** 던전 보상 정의 */
export interface DungeonReward {
  gold: number;
  exp: number;
  items: { itemId: string; rate: number; count: number }[];
}

/** 런 멤버 통계 */
export interface RunMember {
  userId: string;
  damage: number;
  deaths: number;
}

/** 활성 런 (메모리) */
interface ActiveRun {
  runId: string;
  dungeonId: string;
  dungeonCode: string;
  leaderId: string;
  members: RunMember[];
  currentWave: number;
  totalWaves: number;
  waves: DungeonWave[];
  maxPlayers: number;
  timeLimit: number;
  startedAt: number; // epoch ms
  status: 'in_progress' | 'cleared' | 'failed' | 'abandoned';
}

/** 클리어 결과 */
export interface DungeonClearResult {
  runId: string;
  dungeonCode: string;
  rewards: DungeonReward;
  memberStats: RunMember[];
  clearTimeMs: number;
}

// ─── 콜백 타입 ──────────────────────────────────────────────────
type OnWaveClearCb = (runId: string, wave: number, nextWave: number | null) => void;
type OnBossCb = (runId: string, wave: DungeonWave) => void;
type OnClearCb = (runId: string, result: DungeonClearResult) => void;
type OnFailCb = (runId: string, reason: string) => void;

// ─── 던전 매니저 ────────────────────────────────────────────────

class DungeonManager {
  /** 활성 런 맵 (runId → ActiveRun) */
  private runs = new Map<string, ActiveRun>();

  /** 타임아웃 타이머 맵 */
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  /** 일일 입장 횟수 캐시 (userId:dungeonId → count) */
  private dailyEntryCache = new Map<string, number>();

  /** 마지막 캐시 리셋 날짜 */
  private lastResetDate = '';

  // 콜백
  private onWaveClear: OnWaveClearCb | null = null;
  private onBoss: OnBossCb | null = null;
  private onClear: OnClearCb | null = null;
  private onFail: OnFailCb | null = null;

  // ── 콜백 설정 ──

  setOnWaveClear(cb: OnWaveClearCb): void { this.onWaveClear = cb; }
  setOnBoss(cb: OnBossCb): void { this.onBoss = cb; }
  setOnClear(cb: OnClearCb): void { this.onClear = cb; }
  setOnFail(cb: OnFailCb): void { this.onFail = cb; }

  // ── 일일 제한 체크 ──

  /** 오늘 날짜 키 (KST 기준) */
  private todayKey(): string {
    const d = new Date();
    d.setHours(d.getHours() + 9); // UTC → KST
    return d.toISOString().slice(0, 10);
  }

  /** 일일 캐시 리셋 (날짜 변경 시) */
  private checkDailyReset(): void {
    const today = this.todayKey();
    if (this.lastResetDate !== today) {
      this.dailyEntryCache.clear();
      this.lastResetDate = today;
    }
  }

  /** 일일 입장 횟수 확인 */
  private getDailyCount(userId: string, dungeonId: string): number {
    this.checkDailyReset();
    return this.dailyEntryCache.get(`${userId}:${dungeonId}`) ?? 0;
  }

  /** 일일 입장 횟수 증가 */
  private incrementDailyCount(userId: string, dungeonId: string): void {
    this.checkDailyReset();
    const key = `${userId}:${dungeonId}`;
    this.dailyEntryCache.set(key, (this.dailyEntryCache.get(key) ?? 0) + 1);
  }

  // ── 입장 ──

  /** 던전 입장 — 유효성 검증 후 DungeonRun 생성 */
  async enter(
    dungeonCode: string,
    leaderId: string,
    memberIds: string[],
  ): Promise<{ ok: true; runId: string } | { ok: false; error: string }> {
    // 던전 조회
    const dungeon = await prisma.dungeon.findUnique({ where: { code: dungeonCode } });
    if (!dungeon) return { ok: false, error: '존재하지 않는 던전입니다.' };

    const waves = dungeon.waves as unknown as DungeonWave[];
    const allMembers = [leaderId, ...memberIds.filter((id) => id !== leaderId)];

    // 인원 제한
    if (allMembers.length > dungeon.maxPlayers) {
      return { ok: false, error: `최대 ${dungeon.maxPlayers}인까지 입장 가능합니다.` };
    }

    // 일일 입장 제한 (리더 기준)
    const dailyCount = this.getDailyCount(leaderId, dungeon.id);
    if (dailyCount >= dungeon.entryCount) {
      return { ok: false, error: `일일 입장 횟수(${dungeon.entryCount}회)를 초과했습니다.` };
    }

    // 레벨 검증 (캐릭터 테이블에서 레벨 확인)
    const characters = await prisma.character.findMany({
      where: { userId: { in: allMembers } },
      select: { userId: true, level: true },
    });
    const underLevel = characters.filter((c) => c.level < dungeon.requiredLevel);
    if (underLevel.length > 0) {
      return { ok: false, error: `레벨 ${dungeon.requiredLevel} 이상만 입장할 수 있습니다.` };
    }

    // DB 런 생성
    const members: RunMember[] = allMembers.map((id) => ({ userId: id, damage: 0, deaths: 0 }));
    const run = await prisma.dungeonRun.create({
      data: {
        dungeonId: dungeon.id,
        leaderId,
        members: JSON.parse(JSON.stringify(members)),
        status: 'in_progress',
        currentWave: 1,
      },
    });

    // 일일 카운트 증가 (전체 멤버)
    for (const uid of allMembers) {
      this.incrementDailyCount(uid, dungeon.id);
    }

    // 메모리 활성 런 등록
    const active: ActiveRun = {
      runId: run.id,
      dungeonId: dungeon.id,
      dungeonCode: dungeon.code,
      leaderId,
      members,
      currentWave: 1,
      totalWaves: waves.length,
      waves,
      maxPlayers: dungeon.maxPlayers,
      timeLimit: dungeon.timeLimit,
      startedAt: Date.now(),
      status: 'in_progress',
    };
    this.runs.set(run.id, active);

    // 타임아웃 설정
    const timer = setTimeout(() => {
      void this.handleTimeout(run.id);
    }, dungeon.timeLimit * 1000);
    this.timers.set(run.id, timer);

    return { ok: true, runId: run.id };
  }

  // ── 웨이브 진행 ──

  /** 현재 웨이브 클리어 → 다음 웨이브 or 보스 알림 */
  async advanceWave(
    runId: string,
    userId: string,
    damageDealt: number,
  ): Promise<{ ok: true; nextWave: number | null; isBoss: boolean } | { ok: false; error: string }> {
    const run = this.runs.get(runId);
    if (!run) return { ok: false, error: '활성 런을 찾을 수 없습니다.' };
    if (run.status !== 'in_progress') return { ok: false, error: `런 상태: ${run.status}` };

    // 멤버 데미지 기록
    const member = run.members.find((m) => m.userId === userId);
    if (member) member.damage += damageDealt;

    // 다음 웨이브
    const nextIdx = run.currentWave; // 0-indexed next = currentWave (1-indexed current)
    if (nextIdx >= run.totalWaves) {
      // 전체 클리어
      return { ok: true, nextWave: null, isBoss: false };
    }

    run.currentWave = nextIdx + 1;
    const nextWave = run.waves[nextIdx];

    // DB 동기화
    await prisma.dungeonRun.update({
      where: { id: runId },
      data: { currentWave: run.currentWave },
    });

    // 보스 웨이브 알림
    if (nextWave.isBoss) {
      this.onBoss?.(runId, nextWave);
    }

    this.onWaveClear?.(runId, run.currentWave - 1, run.currentWave <= run.totalWaves ? run.currentWave : null);

    return { ok: true, nextWave: run.currentWave, isBoss: nextWave.isBoss };
  }

  // ── 클리어 ──

  /** 던전 클리어 처리 — 보상 분배 + DB 기록 */
  async clear(runId: string): Promise<DungeonClearResult | { ok: false; error: string }> {
    const run = this.runs.get(runId);
    if (!run) return { ok: false, error: '활성 런을 찾을 수 없습니다.' };
    if (run.status !== 'in_progress') return { ok: false, error: `런 상태: ${run.status}` };

    run.status = 'cleared';
    const clearTimeMs = Date.now() - run.startedAt;

    // 보상 조회
    const dungeon = await prisma.dungeon.findUnique({ where: { id: run.dungeonId } });
    const rewards = (dungeon?.rewards ?? { gold: 0, exp: 0, items: [] }) as unknown as DungeonReward;

    // DB 업데이트
    await prisma.dungeonRun.update({
      where: { id: runId },
      data: {
        status: 'cleared',
        endedAt: new Date(),
        members: JSON.parse(JSON.stringify(run.members)),
        lootResult: JSON.parse(JSON.stringify(rewards)),
      },
    });

    // 정리
    this.cleanup(runId);

    const result: DungeonClearResult = {
      runId,
      dungeonCode: run.dungeonCode,
      rewards,
      memberStats: run.members,
      clearTimeMs,
    };

    this.onClear?.(runId, result);
    return result;
  }

  // ── 실패 / 포기 ──

  /** 전투 실패 처리 */
  async fail(runId: string, reason = '전멸'): Promise<void> {
    const run = this.runs.get(runId);
    if (!run || run.status !== 'in_progress') return;

    run.status = 'failed';
    await prisma.dungeonRun.update({
      where: { id: runId },
      data: {
        status: 'failed',
        endedAt: new Date(),
        members: JSON.parse(JSON.stringify(run.members)),
      },
    });

    this.cleanup(runId);
    this.onFail?.(runId, reason);
  }

  /** 포기 처리 */
  async abandon(runId: string): Promise<void> {
    const run = this.runs.get(runId);
    if (!run || run.status !== 'in_progress') return;

    run.status = 'abandoned';
    await prisma.dungeonRun.update({
      where: { id: runId },
      data: {
        status: 'abandoned',
        endedAt: new Date(),
        members: JSON.parse(JSON.stringify(run.members)),
      },
    });

    this.cleanup(runId);
    this.onFail?.(runId, '포기');
  }

  // ── 타임아웃 ──

  private async handleTimeout(runId: string): Promise<void> {
    const run = this.runs.get(runId);
    if (!run || run.status !== 'in_progress') return;
    await this.fail(runId, '제한시간 초과');
  }

  // ── 조회 ──

  /** 활성 런 상태 조회 */
  getRunStatus(runId: string): ActiveRun | undefined {
    return this.runs.get(runId);
  }

  // ── 정리 ──

  private cleanup(runId: string): void {
    this.runs.delete(runId);
    const timer = this.timers.get(runId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(runId);
    }
  }

  /** 서버 종료 시 전체 정리 */
  shutdown(): void {
    for (const [runId] of this.runs) {
      this.cleanup(runId);
    }
  }
}

export const dungeonManager = new DungeonManager();
