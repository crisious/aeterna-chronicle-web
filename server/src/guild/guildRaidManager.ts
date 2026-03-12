/**
 * guildRaidManager.ts — 길드 레이드 매칭 로직 (P8-16)
 *
 * 길드 레이드:
 *   - 4~8인 파티 (길드원 한정)
 *   - 레이드 보스 3종 (P8-08에서 정의)과 연동
 *   - 매칭: 길드 레벨 기반 난이도 스케일링
 *   - 주 2회 제한, 클리어 보상은 길드 창고 + 개인 분배
 *
 * 매칭 로직:
 *   1. 길드장/부길드장이 레이드 신청
 *   2. 길드원 참가 수락 (최소 4명, 최대 8명)
 *   3. 참가 인원 확정 → 인스턴스 생성
 *   4. 보스 HP = 기본 HP × (참가 인원 / 4) × 길드 레벨 보정
 */
import { prisma } from '../db';
import { addGuildXp } from './guildLevelManager';

// ─── 상수 ─────────────────────────────────────────────────────

/** 최소/최대 참가 인원 */
export const RAID_MIN_PLAYERS = 4;
export const RAID_MAX_PLAYERS = 8;

/** 주간 레이드 횟수 제한 */
export const WEEKLY_RAID_LIMIT = 2;

/** 레이드 제한 시간 (30분) */
export const RAID_TIME_LIMIT_MS = 30 * 60 * 1000;

/** 길드 레벨별 보스 HP 보정 계수 */
const GUILD_LEVEL_HP_SCALE: Record<number, number> = {
  1: 0.8,
  2: 0.85,
  3: 0.9,
  4: 0.95,
  5: 1.0,
  6: 1.05,
  7: 1.1,
  8: 1.15,
  9: 1.2,
  10: 1.3,
};

// ─── 타입 ─────────────────────────────────────────────────────

export interface RaidLobby {
  id: string;
  guildId: string;
  bossId: string;
  leaderId: string;
  participants: string[];  // userId[]
  status: 'recruiting' | 'ready' | 'in_progress' | 'completed' | 'failed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface RaidResult {
  success: boolean;
  bossId: string;
  guildId: string;
  participants: string[];
  durationMs: number;
  totalDamage: number;
  rewards: RaidRewardEntry[];
}

export interface RaidRewardEntry {
  userId: string;
  items: Array<{ itemCode: string; amount: number }>;
  gold: number;
  guildXp: number;
}

// ─── 메모리 로비 (Redis 미연결 시 fallback) ──────────────────

const activeLobbies: Map<string, RaidLobby> = new Map();
let lobbyIdCounter = 0;

// ─── 핵심 로직 ──────────────────────────────────────────────

/**
 * 길드 레이드 신청
 */
export async function createRaidLobby(
  guildId: string,
  leaderId: string,
  bossId: string,
): Promise<{ success: boolean; lobby?: RaidLobby; error?: string }> {
  // 길드 존재 + 리더 권한 확인
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) return { success: false, error: 'guild_not_found' };

  const member = await prisma.guildMember.findUnique({
    where: { guildId_userId: { guildId, userId: leaderId } },
  });
  if (!member || !['leader', 'officer'].includes(member.role)) {
    return { success: false, error: 'insufficient_permission' };
  }

  // 주간 제한 확인
  const weekStart = getWeekStart();
  const weeklyCount = await prisma.guildRaid.count({
    where: {
      guildId,
      createdAt: { gte: weekStart },
    },
  });
  if (weeklyCount >= WEEKLY_RAID_LIMIT) {
    return { success: false, error: 'weekly_limit_reached' };
  }

  // 이미 진행 중인 레이드 확인
  for (const lobby of activeLobbies.values()) {
    if (lobby.guildId === guildId && ['recruiting', 'ready', 'in_progress'].includes(lobby.status)) {
      return { success: false, error: 'raid_already_active' };
    }
  }

  const lobbyId = `raid_${guildId}_${++lobbyIdCounter}`;
  const lobby: RaidLobby = {
    id: lobbyId,
    guildId,
    bossId,
    leaderId,
    participants: [leaderId],
    status: 'recruiting',
    createdAt: Date.now(),
  };

  activeLobbies.set(lobbyId, lobby);
  return { success: true, lobby };
}

/**
 * 레이드 참가
 */
export async function joinRaidLobby(
  lobbyId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const lobby = activeLobbies.get(lobbyId);
  if (!lobby) return { success: false, error: 'lobby_not_found' };
  if (lobby.status !== 'recruiting') return { success: false, error: 'not_recruiting' };
  if (lobby.participants.length >= RAID_MAX_PLAYERS) return { success: false, error: 'lobby_full' };
  if (lobby.participants.includes(userId)) return { success: false, error: 'already_joined' };

  // 길드원 확인
  const member = await prisma.guildMember.findUnique({
    where: { guildId_userId: { guildId: lobby.guildId, userId } },
  });
  if (!member) return { success: false, error: 'not_guild_member' };

  lobby.participants.push(userId);
  return { success: true };
}

/**
 * 레이드 시작 (최소 인원 충족 시)
 */
export async function startRaid(
  lobbyId: string,
  leaderId: string,
): Promise<{ success: boolean; scaledBossHp?: number; error?: string }> {
  const lobby = activeLobbies.get(lobbyId);
  if (!lobby) return { success: false, error: 'lobby_not_found' };
  if (lobby.leaderId !== leaderId) return { success: false, error: 'not_leader' };
  if (lobby.participants.length < RAID_MIN_PLAYERS) {
    return { success: false, error: `need_${RAID_MIN_PLAYERS}_players` };
  }

  // 길드 레벨 조회
  const guild = await prisma.guild.findUnique({ where: { id: lobby.guildId } });
  const guildLevel = guild?.level ?? 1;
  const hpScale = GUILD_LEVEL_HP_SCALE[guildLevel] ?? 1.0;
  const playerScale = lobby.participants.length / RAID_MIN_PLAYERS;

  // 보스 기본 HP (raidBossSeeds 참조 — 여기서는 시드 기반 상수)
  const BASE_BOSS_HP: Record<string, number> = {
    'raid_boss_leviathan': 5_000_000,
    'raid_boss_voidweaver': 4_000_000,
    'raid_boss_memory_devourer': 6_000_000,
  };
  const baseHp = BASE_BOSS_HP[lobby.bossId] ?? 5_000_000;
  const scaledBossHp = Math.round(baseHp * playerScale * hpScale);

  lobby.status = 'in_progress';
  lobby.startedAt = Date.now();

  // DB에 레이드 기록 생성
  await prisma.guildRaid.create({
    data: {
      id: lobby.id,
      guildId: lobby.guildId,
      bossId: lobby.bossId,
      leaderId: lobby.leaderId,
      participants: lobby.participants,
      status: 'in_progress',
      scaledBossHp,
    },
  });

  return { success: true, scaledBossHp };
}

/**
 * 레이드 완료 처리
 */
export async function completeRaid(
  lobbyId: string,
  result: Omit<RaidResult, 'rewards'>,
): Promise<RaidResult> {
  const lobby = activeLobbies.get(lobbyId);
  if (!lobby) throw new Error('lobby_not_found');

  lobby.status = result.success ? 'completed' : 'failed';
  lobby.completedAt = Date.now();

  // 보상 계산
  const rewards: RaidRewardEntry[] = [];
  if (result.success) {
    const goldPerPlayer = Math.round(5000 / result.participants.length * result.participants.length);
    const guildXpReward = 200;

    for (const userId of result.participants) {
      rewards.push({
        userId,
        items: [
          { itemCode: `raid_loot_${result.bossId}`, amount: 1 },
          { itemCode: 'raid_token', amount: 3 },
        ],
        gold: goldPerPlayer,
        guildXp: guildXpReward,
      });
    }

    // 길드 XP 부여
    await addGuildXp(lobby.guildId, guildXpReward);
  }

  // DB 업데이트
  await prisma.guildRaid.update({
    where: { id: lobbyId },
    data: {
      status: lobby.status,
      completedAt: new Date(),
      durationMs: result.durationMs,
      totalDamage: result.totalDamage,
    },
  });

  activeLobbies.delete(lobbyId);

  return { ...result, rewards };
}

/**
 * 활성 로비 조회
 */
export function getActiveLobby(guildId: string): RaidLobby | undefined {
  for (const lobby of activeLobbies.values()) {
    if (lobby.guildId === guildId && ['recruiting', 'ready', 'in_progress'].includes(lobby.status)) {
      return lobby;
    }
  }
  return undefined;
}

// ─── 유틸 ─────────────────────────────────────────────────────

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 월요일 기준
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}
