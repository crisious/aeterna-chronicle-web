/**
 * socialProfile.ts — 소셜 리더보드 + 프로필 (P12-07)
 *
 * 공개 프로필 페이지 + 친구 리더보드 + 길드 랭킹 확장.
 */
import { prisma } from '../db';
import { redisClient, redisConnected } from '../redis';

// ─── 타입 정의 ──────────────────────────────────────────────────

export interface PublicProfile {
  userId: string;
  displayName: string;
  level: number;
  className: string;
  guildName: string | null;
  guildRole: string | null;
  title: string | null;          // 칭호
  achievementCount: number;
  totalPlayTime: number;         // 분 단위
  pvpRating: number;
  pvpWins: number;
  pvpLosses: number;
  seasonRank: number | null;
  joinedAt: string;
  lastActiveAt: string;
  /** 프로필 공개 설정 */
  visibility: ProfileVisibility;
  /** 대표 업적 3개 */
  featuredAchievements: Array<{ id: string; name: string; iconUrl: string }>;
  /** 대표 장비 */
  featuredEquipment: Array<{ slot: string; name: string; rarity: string }>;
}

export type ProfileVisibility = 'public' | 'friends_only' | 'private';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  value: number;
  className: string;
  guildName: string | null;
}

export type LeaderboardType =
  | 'level'
  | 'pvp_rating'
  | 'achievement'
  | 'dungeon_clear'
  | 'endless_floor'
  | 'total_damage'
  | 'guild_power';

export interface GuildRankingEntry {
  rank: number;
  guildId: string;
  guildName: string;
  level: number;
  memberCount: number;
  totalPower: number;
  warWins: number;
}

// ─── 상수 ───────────────────────────────────────────────────────

const LEADERBOARD_CACHE_TTL = 300;  // 5분
const PROFILE_CACHE_TTL = 60;       // 1분
const DEFAULT_LEADERBOARD_SIZE = 100;

// ═══════════════════════════════════════════════════════════════
//  공개 프로필
// ═══════════════════════════════════════════════════════════════

/** 공개 프로필 조회 */
export async function getPublicProfile(
  userId: string,
  viewerId?: string,
): Promise<PublicProfile | null> {
  // 캐시 체크
  if (redisConnected()) {
    const cached = await redisClient.get(`profile:public:${userId}`);
    if (cached) {
      const profile = JSON.parse(cached) as PublicProfile;
      if (canViewProfile(profile.visibility, userId, viewerId)) {
        return profile;
      }
      return null;
    }
  }

  // DB에서 조합
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      createdAt: true,
    },
  });
  if (!user) return null;

  const save = await prisma.gameSave.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { state: true, updatedAt: true },
  });

  const state = (save?.state as any) || {};

  // 업적 수
  const achievementCount = await prisma.userAchievement.count({
    where: { userId, unlockedAt: { not: null } },
  });

  // PvP 전적
  const pvpStats = await getPvpStats(userId);

  // 길드 정보
  const guildMember = await prisma.guildMember.findFirst({
    where: { userId },
    include: { guild: { select: { name: true } } },
  });

  // 대표 업적 (최근 3개)
  const recentAchievements = await prisma.userAchievement.findMany({
    where: { userId, unlockedAt: { not: null } },
    orderBy: { unlockedAt: 'desc' },
    take: 3,
    include: { achievement: { select: { id: true, name: true, iconUrl: true } } },
  });

  const profile: PublicProfile = {
    userId: user.id,
    displayName: user.username,
    level: state.level || 1,
    className: state.className || '전사',
    guildName: guildMember?.guild?.name || null,
    guildRole: guildMember?.role || null,
    title: state.title || null,
    achievementCount,
    totalPlayTime: state.totalPlayTime || 0,
    pvpRating: pvpStats.rating,
    pvpWins: pvpStats.wins,
    pvpLosses: pvpStats.losses,
    seasonRank: null,
    joinedAt: user.createdAt.toISOString(),
    lastActiveAt: save?.updatedAt?.toISOString() || user.createdAt.toISOString(),
    visibility: state.profileVisibility || 'public',
    featuredAchievements: recentAchievements.map((a) => ({
      id: a.achievement.id,
      name: a.achievement.name,
      iconUrl: (a.achievement as any).iconUrl || '',
    })),
    featuredEquipment: state.featuredEquipment || [],
  };

  // 캐시 저장
  if (redisConnected()) {
    await redisClient.setex(
      `profile:public:${userId}`,
      PROFILE_CACHE_TTL,
      JSON.stringify(profile),
    );
  }

  if (canViewProfile(profile.visibility, userId, viewerId)) {
    return profile;
  }
  return null;
}

/** 프로필 공개 설정 변경 */
export async function setProfileVisibility(
  userId: string,
  visibility: ProfileVisibility,
): Promise<boolean> {
  const save = await prisma.gameSave.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
  if (!save) return false;

  const state = (save.state as any) || {};
  state.profileVisibility = visibility;

  await prisma.gameSave.update({
    where: { id: save.id },
    data: { state: JSON.parse(JSON.stringify(state)) },
  });

  // 캐시 무효화
  if (redisConnected()) {
    await redisClient.del(`profile:public:${userId}`);
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════
//  리더보드
// ═══════════════════════════════════════════════════════════════

/** 리더보드 조회 */
export async function getLeaderboard(
  type: LeaderboardType,
  limit = DEFAULT_LEADERBOARD_SIZE,
  offset = 0,
): Promise<LeaderboardEntry[]> {
  const cacheKey = `leaderboard:${type}:${limit}:${offset}`;

  // 캐시 체크
  if (redisConnected()) {
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  let entries: LeaderboardEntry[] = [];

  switch (type) {
    case 'level':
      entries = await getLevelLeaderboard(limit, offset);
      break;
    case 'pvp_rating':
      entries = await getPvpLeaderboard(limit, offset);
      break;
    case 'achievement':
      entries = await getAchievementLeaderboard(limit, offset);
      break;
    default:
      entries = await getLevelLeaderboard(limit, offset);
  }

  // 캐시 저장
  if (redisConnected() && entries.length > 0) {
    await redisClient.setex(cacheKey, LEADERBOARD_CACHE_TTL, JSON.stringify(entries));
  }

  return entries;
}

/** 친구 리더보드 */
export async function getFriendLeaderboard(
  userId: string,
  type: LeaderboardType,
): Promise<LeaderboardEntry[]> {
  // 친구 ID 목록 조회
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { userId, status: 'accepted' },
        { friendId: userId, status: 'accepted' },
      ],
    },
    select: { userId: true, friendId: true },
  });

  const friendIds = friendships.map((f) =>
    f.userId === userId ? f.friendId : f.userId,
  );
  friendIds.push(userId); // 본인 포함

  // 전체 리더보드에서 친구만 필터
  const fullBoard = await getLeaderboard(type, 1000);
  const friendBoard = fullBoard
    .filter((e) => friendIds.includes(e.userId))
    .map((e, i) => ({ ...e, rank: i + 1 }));

  return friendBoard;
}

/** 길드 랭킹 */
export async function getGuildRanking(limit = 50): Promise<GuildRankingEntry[]> {
  const cacheKey = `leaderboard:guild:${limit}`;

  if (redisConnected()) {
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const guilds = await prisma.guild.findMany({
    orderBy: { level: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      level: true,
      memberCount: true,
    },
  });

  const entries: GuildRankingEntry[] = guilds.map((g, i) => ({
    rank: i + 1,
    guildId: g.id,
    guildName: g.name,
    level: g.level,
    memberCount: g.memberCount,
    totalPower: 0, // P14: 길드 전투력 합산 — 추후 guildPowerService 연동
    warWins: 0,    // P14: 길드전 승수 조회 — 추후 guildWarStats 연동
  }));

  if (redisConnected() && entries.length > 0) {
    await redisClient.setex(cacheKey, LEADERBOARD_CACHE_TTL, JSON.stringify(entries));
  }

  return entries;
}

// ─── 리더보드 쿼리 헬퍼 ─────────────────────────────────────────

async function getLevelLeaderboard(limit: number, offset: number): Promise<LeaderboardEntry[]> {
  const saves = await prisma.gameSave.findMany({
    orderBy: { updatedAt: 'desc' },
    take: limit * 2, // 중복 사용자 고려
    select: { userId: true, state: true },
  });

  const seen = new Set<string>();
  const entries: Array<{ userId: string; level: number; className: string }> = [];

  for (const save of saves) {
    if (seen.has(save.userId)) continue;
    seen.add(save.userId);
    const state = save.state as any;
    entries.push({
      userId: save.userId,
      level: state?.level || 1,
      className: state?.className || '전사',
    });
  }

  entries.sort((a, b) => b.level - a.level);

  return entries.slice(offset, offset + limit).map((e, i) => ({
    rank: offset + i + 1,
    userId: e.userId,
    displayName: e.userId,
    value: e.level,
    className: e.className,
    guildName: null,
  }));
}

async function getPvpLeaderboard(limit: number, offset: number): Promise<LeaderboardEntry[]> {
  const rankings = await prisma.pvpRanking.findMany({
    orderBy: { rating: 'desc' },
    take: limit,
    skip: offset,
    select: { userId: true, rating: true },
  });

  return rankings.map((r, i) => ({
    rank: offset + i + 1,
    userId: r.userId,
    displayName: r.userId,
    value: r.rating,
    className: '',
    guildName: null,
  }));
}

async function getAchievementLeaderboard(limit: number, offset: number): Promise<LeaderboardEntry[]> {
  const counts = await prisma.userAchievement.groupBy({
    by: ['userId'],
    where: { unlockedAt: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
    skip: offset,
  });

  return counts.map((c, i) => ({
    rank: offset + i + 1,
    userId: c.userId,
    displayName: c.userId,
    value: c._count.id,
    className: '',
    guildName: null,
  }));
}

// ─── PvP 통계 헬퍼 ──────────────────────────────────────────────

async function getPvpStats(userId: string): Promise<{ rating: number; wins: number; losses: number }> {
  const ranking = await prisma.pvpRanking.findFirst({
    where: { userId },
    select: { rating: true, wins: true, losses: true },
  });
  return ranking || { rating: 1000, wins: 0, losses: 0 };
}

// ─── 접근 제어 ──────────────────────────────────────────────────

function canViewProfile(
  visibility: ProfileVisibility,
  profileUserId: string,
  viewerId?: string,
): boolean {
  if (visibility === 'public') return true;
  if (!viewerId) return false;
  if (profileUserId === viewerId) return true;
  if (visibility === 'private') return false;
  // friends_only → 실제 친구 관계 확인은 호출자 레벨에서 처리
  return true;
}
