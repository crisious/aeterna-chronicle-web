/**
 * activityFeed.ts — 소셜 피드 시스템 (P12-15)
 *
 * 친구/길드 활동 피드: 레벨업, 업적 달성, 던전 클리어, PvP 승리, 아이템 획득.
 * Prisma ActivityFeedEntry 모델 + 조회 API(페이지네이션/필터) + 실시간 소켓 푸시.
 */
import { prisma } from '../db';
import { redisClient, redisConnected } from '../redis';

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 피드 이벤트 유형 */
export type FeedEventType =
  | 'LEVEL_UP'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'DUNGEON_CLEAR'
  | 'PVP_VICTORY'
  | 'ITEM_ACQUIRED'
  | 'GUILD_JOIN'
  | 'GUILD_RANK_UP'
  | 'SEASON_MILESTONE'
  | 'BOSS_KILL'
  | 'CRAFT_LEGENDARY';

/** 피드 가시성 범위 */
export type FeedVisibility = 'PUBLIC' | 'FRIENDS' | 'GUILD' | 'PRIVATE';

/** 피드 엔트리 인터페이스 */
export interface ActivityFeedEntry {
  id: string;
  userId: string;
  displayName: string;
  eventType: FeedEventType;
  visibility: FeedVisibility;
  /** 이벤트별 상세 데이터 (JSON) */
  payload: Record<string, unknown>;
  /** 요약 텍스트 (i18n 키 또는 렌더링된 문자열) */
  summary: string;
  createdAt: Date;
  /** 좋아요 수 (비정규화 캐시) */
  likeCount: number;
  /** 댓글 수 (비정규화 캐시) */
  commentCount: number;
}

/** 피드 조회 필터 */
export interface FeedFilter {
  eventTypes?: FeedEventType[];
  visibility?: FeedVisibility;
  userId?: string;
  guildId?: string;
  /** 커서 기반 페이지네이션 */
  cursor?: string;
  limit?: number;
}

/** 피드 조회 결과 */
export interface FeedPage {
  entries: ActivityFeedEntry[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

// ─── Prisma 모델 정의 (schema.prisma 추가 필요) ────────────────
/*
  model ActivityFeedEntry {
    id           String         @id @default(uuid())
    userId       String
    displayName  String
    eventType    String         // FeedEventType enum
    visibility   String         @default("FRIENDS")
    payload      Json           @default("{}")
    summary      String
    likeCount    Int            @default(0)
    commentCount Int            @default(0)
    createdAt    DateTime       @default(now())
    updatedAt    DateTime       @updatedAt

    @@index([userId, createdAt])
    @@index([eventType, createdAt])
    @@index([visibility, createdAt])
  }
*/

// ─── 상수 ───────────────────────────────────────────────────────

const FEED_CACHE_PREFIX = 'feed:';
const FEED_CACHE_TTL = 120;          // 2분
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const FEED_REALTIME_CHANNEL = 'activity-feed';

// ─── 피드 작성 ──────────────────────────────────────────────────

/**
 * 활동 피드 엔트리 생성.
 * DB 기록 + Redis pub/sub로 실시간 푸시.
 */
export async function createFeedEntry(params: {
  userId: string;
  displayName: string;
  eventType: FeedEventType;
  visibility?: FeedVisibility;
  payload?: Record<string, unknown>;
  summary: string;
}): Promise<ActivityFeedEntry> {
  const entry = await prisma.activityFeedEntry.create({
    data: {
      userId: params.userId,
      displayName: params.displayName,
      eventType: params.eventType,
      visibility: params.visibility ?? 'FRIENDS',
      payload: params.payload ?? {},
      summary: params.summary,
    },
  });

  // 캐시 무효화: 해당 유저의 피드 캐시 삭제
  await invalidateFeedCache(params.userId);

  // 실시간 소켓 푸시 (Redis pub/sub)
  await publishFeedEvent(entry as unknown as ActivityFeedEntry);

  return entry as unknown as ActivityFeedEntry;
}

/**
 * 배치 피드 생성 (길드 이벤트 등 다수 유저 동시 발생).
 */
export async function createFeedEntriesBatch(
  entries: Array<{
    userId: string;
    displayName: string;
    eventType: FeedEventType;
    visibility?: FeedVisibility;
    payload?: Record<string, unknown>;
    summary: string;
  }>
): Promise<number> {
  const result = await prisma.activityFeedEntry.createMany({
    data: entries.map(e => ({
      userId: e.userId,
      displayName: e.displayName,
      eventType: e.eventType,
      visibility: e.visibility ?? 'FRIENDS',
      payload: e.payload ?? {},
      summary: e.summary,
    })),
  });

  // 관련 캐시 일괄 무효화
  const userIds = [...new Set(entries.map(e => e.userId))];
  await Promise.all(userIds.map(uid => invalidateFeedCache(uid)));

  return result.count;
}

// ─── 피드 조회 ──────────────────────────────────────────────────

/**
 * 피드 조회 (페이지네이션 + 필터).
 * 캐시 → DB fallback.
 */
export async function getFeed(filter: FeedFilter): Promise<FeedPage> {
  const limit = Math.min(filter.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const cacheKey = buildFeedCacheKey(filter, limit);

  // 1) Redis 캐시 확인
  if (redisConnected()) {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as FeedPage;
    }
  }

  // 2) DB 쿼리
  const where: Record<string, unknown> = {};

  if (filter.eventTypes?.length) {
    where.eventType = { in: filter.eventTypes };
  }
  if (filter.visibility) {
    where.visibility = filter.visibility;
  }
  if (filter.userId) {
    where.userId = filter.userId;
  }
  if (filter.cursor) {
    where.createdAt = { lt: new Date(filter.cursor) };
  }

  const [entries, total] = await Promise.all([
    prisma.activityFeedEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // +1로 hasMore 판단
    }),
    prisma.activityFeedEntry.count({ where }),
  ]);

  const hasMore = entries.length > limit;
  const pageEntries = hasMore ? entries.slice(0, limit) : entries;
  const nextCursor = hasMore
    ? (pageEntries[pageEntries.length - 1] as unknown as ActivityFeedEntry).createdAt.toISOString()
    : null;

  const result: FeedPage = {
    entries: pageEntries as unknown as ActivityFeedEntry[],
    nextCursor,
    hasMore,
    total,
  };

  // 3) 캐시 저장
  if (redisConnected()) {
    await redisClient.setex(cacheKey, FEED_CACHE_TTL, JSON.stringify(result));
  }

  return result;
}

/**
 * 특정 유저의 활동 피드 조회 (프로필 페이지용).
 */
export async function getUserFeed(
  userId: string,
  cursor?: string,
  limit = DEFAULT_PAGE_SIZE
): Promise<FeedPage> {
  return getFeed({ userId, cursor, limit });
}

/**
 * 친구 피드: 친구 목록의 활동만 표시.
 * friendIds는 호출자가 미리 조회해서 전달.
 */
export async function getFriendsFeed(
  friendIds: string[],
  cursor?: string,
  limit = DEFAULT_PAGE_SIZE
): Promise<FeedPage> {
  if (friendIds.length === 0) {
    return { entries: [], nextCursor: null, hasMore: false, total: 0 };
  }

  const where: Record<string, unknown> = {
    userId: { in: friendIds },
    visibility: { in: ['PUBLIC', 'FRIENDS'] },
  };
  if (cursor) {
    where.createdAt = { lt: new Date(cursor) };
  }

  const [entries, total] = await Promise.all([
    prisma.activityFeedEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    }),
    prisma.activityFeedEntry.count({ where }),
  ]);

  const hasMore = entries.length > limit;
  const pageEntries = hasMore ? entries.slice(0, limit) : entries;
  const nextCursor = hasMore
    ? (pageEntries[pageEntries.length - 1] as unknown as ActivityFeedEntry).createdAt.toISOString()
    : null;

  return {
    entries: pageEntries as unknown as ActivityFeedEntry[],
    nextCursor,
    hasMore,
    total,
  };
}

/**
 * 길드 피드: 길드원 활동 필터링.
 */
export async function getGuildFeed(
  guildMemberIds: string[],
  cursor?: string,
  limit = DEFAULT_PAGE_SIZE
): Promise<FeedPage> {
  if (guildMemberIds.length === 0) {
    return { entries: [], nextCursor: null, hasMore: false, total: 0 };
  }

  const where: Record<string, unknown> = {
    userId: { in: guildMemberIds },
    visibility: { in: ['PUBLIC', 'FRIENDS', 'GUILD'] },
  };
  if (cursor) {
    where.createdAt = { lt: new Date(cursor) };
  }

  const [entries, total] = await Promise.all([
    prisma.activityFeedEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    }),
    prisma.activityFeedEntry.count({ where }),
  ]);

  const hasMore = entries.length > limit;
  const pageEntries = hasMore ? entries.slice(0, limit) : entries;
  const nextCursor = hasMore
    ? (pageEntries[pageEntries.length - 1] as unknown as ActivityFeedEntry).createdAt.toISOString()
    : null;

  return {
    entries: pageEntries as unknown as ActivityFeedEntry[],
    nextCursor,
    hasMore,
    total,
  };
}

// ─── 피드 상호작용 ──────────────────────────────────────────────

/**
 * 피드 엔트리 좋아요 토글.
 */
export async function toggleFeedLike(
  entryId: string,
  userId: string
): Promise<{ liked: boolean; likeCount: number }> {
  // 좋아요 레코드 존재 확인
  const existing = await prisma.feedLike.findUnique({
    where: { entryId_userId: { entryId, userId } },
  });

  if (existing) {
    // 좋아요 취소
    await prisma.$transaction([
      prisma.feedLike.delete({ where: { entryId_userId: { entryId, userId } } }),
      prisma.activityFeedEntry.update({
        where: { id: entryId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);
    const updated = await prisma.activityFeedEntry.findUnique({ where: { id: entryId } });
    return { liked: false, likeCount: (updated as any)?.likeCount ?? 0 };
  } else {
    // 좋아요
    await prisma.$transaction([
      prisma.feedLike.create({ data: { entryId, userId } }),
      prisma.activityFeedEntry.update({
        where: { id: entryId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);
    const updated = await prisma.activityFeedEntry.findUnique({ where: { id: entryId } });
    return { liked: true, likeCount: (updated as any)?.likeCount ?? 0 };
  }
}

// ─── 소켓 통합 (실시간 피드 푸시) ───────────────────────────────

/**
 * Redis pub/sub으로 피드 이벤트 발행.
 * 소켓 서버가 구독해서 관련 클라이언트에 푸시.
 */
async function publishFeedEvent(entry: ActivityFeedEntry): Promise<void> {
  if (!redisConnected()) return;

  const message = JSON.stringify({
    channel: FEED_REALTIME_CHANNEL,
    type: 'NEW_FEED_ENTRY',
    data: {
      id: entry.id,
      userId: entry.userId,
      displayName: entry.displayName,
      eventType: entry.eventType,
      visibility: entry.visibility,
      summary: entry.summary,
      createdAt: entry.createdAt,
    },
  });

  await redisClient.publish(FEED_REALTIME_CHANNEL, message);
}

/**
 * 소켓 핸들러 등록 (서버 초기화 시 호출).
 * io: Socket.IO 서버 인스턴스.
 */
export function registerFeedSocketHandlers(io: any): void {
  io.on('connection', (socket: any) => {
    // 클라이언트가 피드 구독 요청
    socket.on('feed:subscribe', (data: { userId: string; friendIds?: string[]; guildId?: string }) => {
      // 개인 피드 채널
      socket.join(`feed:user:${data.userId}`);

      // 친구 피드 채널
      if (data.friendIds?.length) {
        data.friendIds.forEach((fid: string) => {
          socket.join(`feed:user:${fid}`);
        });
      }

      // 길드 피드 채널
      if (data.guildId) {
        socket.join(`feed:guild:${data.guildId}`);
      }
    });

    socket.on('feed:unsubscribe', () => {
      const rooms = Array.from(socket.rooms as Set<string>);
      rooms.forEach((room: string) => {
        if (room.startsWith('feed:')) {
          socket.leave(room);
        }
      });
    });
  });

  // Redis 구독 → 소켓 브로드캐스트
  if (redisConnected()) {
    const subscriber = redisClient.duplicate();
    subscriber.subscribe(FEED_REALTIME_CHANNEL);
    subscriber.on('message', (_channel: string, message: string) => {
      try {
        const parsed = JSON.parse(message);
        const entry = parsed.data;
        // 해당 유저의 피드 채널로 전송
        io.to(`feed:user:${entry.userId}`).emit('feed:new', entry);
      } catch {
        // 파싱 실패 무시
      }
    });
  }
}

// ─── 이벤트 트리거 헬퍼 ─────────────────────────────────────────

/** 레벨업 피드 생성 */
export async function onLevelUp(userId: string, displayName: string, newLevel: number): Promise<void> {
  await createFeedEntry({
    userId,
    displayName,
    eventType: 'LEVEL_UP',
    summary: `${displayName}님이 레벨 ${newLevel}에 도달했습니다!`,
    payload: { newLevel },
  });
}

/** 업적 달성 피드 생성 */
export async function onAchievementUnlocked(
  userId: string, displayName: string, achievementName: string, achievementId: string
): Promise<void> {
  await createFeedEntry({
    userId,
    displayName,
    eventType: 'ACHIEVEMENT_UNLOCKED',
    summary: `${displayName}님이 업적 [${achievementName}]을 달성했습니다!`,
    payload: { achievementId, achievementName },
  });
}

/** 던전 클리어 피드 생성 */
export async function onDungeonClear(
  userId: string, displayName: string, dungeonName: string, clearTime: number
): Promise<void> {
  await createFeedEntry({
    userId,
    displayName,
    eventType: 'DUNGEON_CLEAR',
    summary: `${displayName}님이 [${dungeonName}]을 ${Math.floor(clearTime / 60)}분 ${clearTime % 60}초에 클리어!`,
    payload: { dungeonName, clearTime },
  });
}

/** PvP 승리 피드 생성 */
export async function onPvpVictory(
  userId: string, displayName: string, opponentName: string, rating: number
): Promise<void> {
  await createFeedEntry({
    userId,
    displayName,
    eventType: 'PVP_VICTORY',
    summary: `${displayName}님이 PvP에서 ${opponentName}님을 이겼습니다! (레이팅 ${rating})`,
    payload: { opponentName, rating },
  });
}

/** 아이템 획득 피드 생성 */
export async function onItemAcquired(
  userId: string, displayName: string, itemName: string, rarity: string
): Promise<void> {
  await createFeedEntry({
    userId,
    displayName,
    eventType: 'ITEM_ACQUIRED',
    visibility: rarity === 'LEGENDARY' ? 'PUBLIC' : 'FRIENDS',
    summary: `${displayName}님이 [${rarity}] ${itemName}을(를) 획득했습니다!`,
    payload: { itemName, rarity },
  });
}

// ─── 라우트 등록 ────────────────────────────────────────────────

/**
 * Fastify 라우트 등록.
 */
export function registerFeedRoutes(app: any): void {
  // GET /api/feed — 글로벌/필터 피드 조회
  app.get('/api/feed', async (request: any, reply: any) => {
    const query = request.query as Record<string, string | undefined>;
    const filter: FeedFilter = {
      cursor: query.cursor,
      limit: query.limit ? parseInt(query.limit, 10) : DEFAULT_PAGE_SIZE,
      visibility: query.visibility as FeedVisibility | undefined,
    };
    if (query.eventTypes) {
      filter.eventTypes = query.eventTypes.split(',') as FeedEventType[];
    }
    const result = await getFeed(filter);
    return reply.send(result);
  });

  // GET /api/feed/user/:userId — 특정 유저 피드
  app.get('/api/feed/user/:userId', async (request: any, reply: any) => {
    const { userId } = request.params as { userId: string };
    const query = request.query as Record<string, string | undefined>;
    const result = await getUserFeed(userId, query.cursor, query.limit ? parseInt(query.limit, 10) : undefined);
    return reply.send(result);
  });

  // GET /api/feed/friends — 친구 피드 (인증 필요)
  app.get('/api/feed/friends', async (request: any, reply: any) => {
    const currentUserId = (request as any).userId;
    if (!currentUserId) return reply.status(401).send({ error: '인증 필요' });

    // 친구 목록 조회 (socialManager 연동)
    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ userId: currentUserId }, { friendId: currentUserId }], status: 'ACCEPTED' },
      select: { userId: true, friendId: true },
    });
    const friendIds = friendships.map(f => f.userId === currentUserId ? f.friendId : f.userId);

    const query = request.query as Record<string, string | undefined>;
    const result = await getFriendsFeed(friendIds, query.cursor, query.limit ? parseInt(query.limit, 10) : undefined);
    return reply.send(result);
  });

  // GET /api/feed/guild/:guildId — 길드 피드
  app.get('/api/feed/guild/:guildId', async (request: any, reply: any) => {
    const { guildId } = request.params as { guildId: string };
    const members = await prisma.guildMember.findMany({
      where: { guildId },
      select: { userId: true },
    });
    const memberIds = members.map(m => m.userId);

    const query = request.query as Record<string, string | undefined>;
    const result = await getGuildFeed(memberIds, query.cursor, query.limit ? parseInt(query.limit, 10) : undefined);
    return reply.send(result);
  });

  // POST /api/feed/:entryId/like — 좋아요 토글
  app.post('/api/feed/:entryId/like', async (request: any, reply: any) => {
    const currentUserId = (request as any).userId;
    if (!currentUserId) return reply.status(401).send({ error: '인증 필요' });

    const { entryId } = request.params as { entryId: string };
    const result = await toggleFeedLike(entryId, currentUserId);
    return reply.send(result);
  });
}

// ─── 캐시 유틸 ──────────────────────────────────────────────────

function buildFeedCacheKey(filter: FeedFilter, limit: number): string {
  const parts = [FEED_CACHE_PREFIX];
  if (filter.userId) parts.push(`u:${filter.userId}`);
  if (filter.guildId) parts.push(`g:${filter.guildId}`);
  if (filter.eventTypes?.length) parts.push(`t:${filter.eventTypes.join(',')}`);
  if (filter.visibility) parts.push(`v:${filter.visibility}`);
  if (filter.cursor) parts.push(`c:${filter.cursor}`);
  parts.push(`l:${limit}`);
  return parts.join(':');
}

async function invalidateFeedCache(userId: string): Promise<void> {
  if (!redisConnected()) return;
  // 패턴 매칭으로 관련 캐시 삭제
  const keys = await redisClient.keys(`${FEED_CACHE_PREFIX}*u:${userId}*`);
  if (keys.length > 0) {
    await redisClient.del(...keys);
  }
}
