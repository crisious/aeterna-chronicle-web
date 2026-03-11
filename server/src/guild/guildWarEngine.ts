/**
 * guildWarEngine.ts — 길드전 매칭 + 거점 점령 엔진 (P6-07)
 *
 * 거점 3개:
 *   A: 광산   — 보유 시 길드 골드 +10%/일
 *   B: 성벽   — 보유 시 길드전 방어력 +15%
 *   C: 사령탑 — 보유 시 길드 XP +20%
 *
 * 점령 메카닉: 거점 HP 바, 공격/방어팀 배치, 30분 제한
 * 매칭: 길드 레벨 ±2 범위, 멤버 수 유사
 * 신청 조건: 주 1회, 길드 레벨 3 이상
 */
import { prisma } from '../db';
import { addGuildXp } from './guildLevelManager';

// ─── 거점 정의 ──────────────────────────────────────────────

export interface FortressDef {
  id: 'A' | 'B' | 'C';
  name: string;
  description: string;
  maxHp: number;
}

export const FORTRESSES: readonly FortressDef[] = [
  { id: 'A', name: '광산', description: '보유 시 길드 골드 +10%/일', maxHp: 10000 },
  { id: 'B', name: '성벽', description: '보유 시 길드전 방어력 +15%', maxHp: 12000 },
  { id: 'C', name: '사령탑', description: '보유 시 길드 XP +20%', maxHp: 8000 },
] as const;

/** 전쟁 지속 시간 제한 (30분) */
export const WAR_DURATION_MS = 30 * 60 * 1000;

/** 주 1회 제한 체크를 위한 기간 (7일) */
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** 최소 길드 레벨 */
const MIN_GUILD_LEVEL = 3;

/** 매칭 레벨 범위 */
const MATCH_LEVEL_RANGE = 2;

// ─── 메모리 상태: 진행 중인 전쟁 거점 HP ─────────────────────

interface FortressState {
  hp: number;
  maxHp: number;
  owner: string | null; // 점령 길드 ID
}

/** warId → 거점별 상태 */
const activeWarStates = new Map<string, Record<string, FortressState>>();

/** 전쟁 타이머 */
const warTimers = new Map<string, ReturnType<typeof setTimeout>>();

// ─── 길드전 신청 ────────────────────────────────────────────

export interface DeclareResult {
  success: boolean;
  error?: string;
  warId?: string;
}

/**
 * 길드전 선포 (주 1회, 레벨 3 이상)
 */
export async function declareWar(attackerGuildId: string): Promise<DeclareResult> {
  const guild = await prisma.guild.findUnique({
    where: { id: attackerGuildId },
    include: { _count: { select: { members: true } } },
  });
  if (!guild) return { success: false, error: '길드를 찾을 수 없습니다' };
  if (guild.level < MIN_GUILD_LEVEL) {
    return { success: false, error: `길드 레벨 ${MIN_GUILD_LEVEL} 이상에서 선포 가능` };
  }

  // 주 1회 제한
  const cooldownDate = new Date(Date.now() - COOLDOWN_MS);
  const recentWar = await prisma.guildWar.findFirst({
    where: {
      attackerId: attackerGuildId,
      createdAt: { gte: cooldownDate },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (recentWar) {
    return { success: false, error: '주 1회 길드전 제한: 이미 이번 주에 선포함' };
  }

  // 이미 진행 중인 전쟁
  const activeWar = await prisma.guildWar.findFirst({
    where: {
      OR: [
        { attackerId: attackerGuildId, status: { in: ['pending', 'matching', 'active'] } },
        { defenderId: attackerGuildId, status: { in: ['pending', 'matching', 'active'] } },
      ],
    },
  });
  if (activeWar) {
    return { success: false, error: '이미 진행 중인 전쟁이 있습니다' };
  }

  // 매칭 상태로 생성 (상대는 matchWar에서 결정)
  const war = await prisma.guildWar.create({
    data: {
      attackerId: attackerGuildId,
      defenderId: attackerGuildId, // placeholder, 매칭 시 업데이트
      status: 'matching',
    },
  });

  return { success: true, warId: war.id };
}

// ─── 길드전 매칭 ────────────────────────────────────────────

export interface MatchResult {
  success: boolean;
  error?: string;
  warId?: string;
  defenderId?: string;
}

/**
 * matching 상태인 전쟁에 대해 상대 길드를 매칭한다.
 * 길드 레벨 ±2, 멤버 수 유사한 상대를 찾는다.
 */
export async function matchWar(warId: string): Promise<MatchResult> {
  const war = await prisma.guildWar.findUnique({ where: { id: warId } });
  if (!war || war.status !== 'matching') {
    return { success: false, error: '매칭 가능한 전쟁이 아닙니다' };
  }

  const attacker = await prisma.guild.findUnique({
    where: { id: war.attackerId },
    include: { _count: { select: { members: true } } },
  });
  if (!attacker) return { success: false, error: '공격 길드 없음' };

  // 후보 길드 조회: 레벨 ±2, 본인 제외, 현재 전쟁 미참여
  const candidates = await prisma.guild.findMany({
    where: {
      id: { not: attacker.id },
      level: {
        gte: Math.max(1, attacker.level - MATCH_LEVEL_RANGE),
        lte: attacker.level + MATCH_LEVEL_RANGE,
      },
      // 진행 중 전쟁 미참여 (서브쿼리 제한으로 후처리)
    },
    include: { _count: { select: { members: true } } },
  });

  // 진행 중 전쟁에 참여하지 않는 길드 필터
  const activeWarGuildIds = new Set<string>();
  const activeWars = await prisma.guildWar.findMany({
    where: { status: { in: ['pending', 'matching', 'active'] } },
    select: { attackerId: true, defenderId: true },
  });
  for (const w of activeWars) {
    activeWarGuildIds.add(w.attackerId);
    activeWarGuildIds.add(w.defenderId);
  }

  const eligible = candidates.filter((c) => !activeWarGuildIds.has(c.id));
  if (eligible.length === 0) {
    return { success: false, error: '매칭 가능한 상대 길드가 없습니다' };
  }

  // 멤버 수 차이가 가장 적은 길드 선택
  eligible.sort(
    (a, b) =>
      Math.abs(a._count.members - attacker._count.members) -
      Math.abs(b._count.members - attacker._count.members),
  );
  const defender = eligible[0];

  await prisma.guildWar.update({
    where: { id: warId },
    data: {
      defenderId: defender.id,
      status: 'active',
      startedAt: new Date(),
    },
  });

  // 거점 상태 초기화
  initWarState(warId);

  // 30분 타이머
  const timer = setTimeout(() => {
    void finishWarByTimeout(warId);
  }, WAR_DURATION_MS);
  warTimers.set(warId, timer);

  return { success: true, warId, defenderId: defender.id };
}

// ─── 거점 점령 ──────────────────────────────────────────────

/** 전쟁 거점 상태 초기화 */
function initWarState(warId: string): void {
  const state: Record<string, FortressState> = {};
  for (const f of FORTRESSES) {
    state[f.id] = { hp: f.maxHp, maxHp: f.maxHp, owner: null };
  }
  activeWarStates.set(warId, state);
}

export interface CaptureResult {
  success: boolean;
  error?: string;
  fortressId?: string;
  newHp?: number;
  captured?: boolean;
  capturedBy?: string;
}

/**
 * 거점 공격 (HP 감소 → 0이면 점령)
 */
export async function attackFortress(
  warId: string,
  fortressId: string,
  attackerGuildId: string,
  damage: number,
): Promise<CaptureResult> {
  const state = activeWarStates.get(warId);
  if (!state) return { success: false, error: '진행 중인 전쟁이 아닙니다' };

  const fort = state[fortressId];
  if (!fort) return { success: false, error: '존재하지 않는 거점' };

  // 이미 자기 길드가 점령한 거점
  if (fort.owner === attackerGuildId) {
    return { success: false, error: '이미 점령한 거점' };
  }

  // 상대가 점령한 거점이면 HP 리셋 후 탈환 경쟁
  if (fort.owner !== null && fort.owner !== attackerGuildId) {
    // 점령 해제 → HP 복구 후 재경쟁
    fort.owner = null;
    fort.hp = Math.round(fort.maxHp * 0.5); // 절반 HP로 복구
  }

  fort.hp = Math.max(0, fort.hp - damage);

  if (fort.hp <= 0) {
    fort.owner = attackerGuildId;
    fort.hp = 0;

    // DB에 거점 점령 기록
    const fortressField = `fortress${fortressId}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.guildWar as any).update({
      where: { id: warId },
      data: { [fortressField]: attackerGuildId },
    });

    return {
      success: true,
      fortressId,
      newHp: 0,
      captured: true,
      capturedBy: attackerGuildId,
    };
  }

  return {
    success: true,
    fortressId,
    newHp: fort.hp,
    captured: false,
  };
}

/** 거점 현황 조회 */
export function getWarState(warId: string): Record<string, FortressState> | null {
  return activeWarStates.get(warId) ?? null;
}

// ─── 전쟁 종료 ──────────────────────────────────────────────

export interface WarResult {
  warId: string;
  winnerId: string | null;
  attackerScore: number;
  defenderScore: number;
  fortresses: Record<string, string | null>;
}

/** 타임아웃에 의한 전쟁 종료 */
async function finishWarByTimeout(warId: string): Promise<void> {
  await finishWar(warId);
}

/**
 * 전쟁 종료 처리 — 거점 점령 수로 승패 결정 + 보상
 */
export async function finishWar(warId: string): Promise<WarResult | null> {
  const war = await prisma.guildWar.findUnique({ where: { id: warId } });
  if (!war || war.status === 'finished') return null;

  const state = activeWarStates.get(warId);
  // NOTE: fortressA/B/C, winnerId는 마이그레이션 후 Prisma 타입에 반영됨
  // prisma generate 전까지 as any 사용
  const warAny = war as Record<string, unknown>;
  const fortresses: Record<string, string | null> = {
    A: state?.A?.owner ?? (warAny.fortressA as string | null) ?? null,
    B: state?.B?.owner ?? (warAny.fortressB as string | null) ?? null,
    C: state?.C?.owner ?? (warAny.fortressC as string | null) ?? null,
  };

  // 점수 계산 (거점당 1점)
  let attackerScore = 0;
  let defenderScore = 0;
  for (const owner of Object.values(fortresses)) {
    if (owner === war.attackerId) attackerScore++;
    else if (owner === war.defenderId) defenderScore++;
  }

  // 승자 결정
  let winnerId: string | null = null;
  if (attackerScore > defenderScore) winnerId = war.attackerId;
  else if (defenderScore > attackerScore) winnerId = war.defenderId;
  // 동점이면 무승부 (winnerId = null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.guildWar as any).update({
    where: { id: warId },
    data: {
      status: 'finished',
      attackerScore,
      defenderScore,
      winnerId,
      fortressA: fortresses.A,
      fortressB: fortresses.B,
      fortressC: fortresses.C,
      endedAt: new Date(),
    },
  });

  // 승리 길드에 경험치 보상
  if (winnerId) {
    await addGuildXp(winnerId, 'WAR_WIN');
  }

  // 메모리 정리
  activeWarStates.delete(warId);
  const timer = warTimers.get(warId);
  if (timer) {
    clearTimeout(timer);
    warTimers.delete(warId);
  }

  return { warId, winnerId, attackerScore, defenderScore, fortresses };
}

// ─── 전쟁 히스토리 ──────────────────────────────────────────

/**
 * 길드의 전쟁 기록 조회
 */
export async function getWarHistory(guildId: string, limit = 10) {
  return prisma.guildWar.findMany({
    where: {
      OR: [{ attackerId: guildId }, { defenderId: guildId }],
      status: 'finished',
    },
    orderBy: { endedAt: 'desc' },
    take: limit,
  });
}

/**
 * 전쟁 상태 조회
 */
export async function getWarStatus(warId: string) {
  const war = await prisma.guildWar.findUnique({ where: { id: warId } });
  if (!war) return null;

  const memState = activeWarStates.get(warId);
  return {
    ...war,
    fortressStates: memState ?? null,
    isActive: war.status === 'active',
    timeRemaining: war.startedAt
      ? Math.max(0, WAR_DURATION_MS - (Date.now() - war.startedAt.getTime()))
      : null,
  };
}

/** 서버 종료 시 정리 */
export function shutdownGuildWar(): void {
  for (const timer of warTimers.values()) {
    clearTimeout(timer);
  }
  warTimers.clear();
  activeWarStates.clear();
}
