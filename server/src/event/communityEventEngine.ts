/**
 * communityEventEngine.ts — 커뮤니티 이벤트 엔진 (P12-06)
 *
 * GM이 설정하는 커스텀 이벤트 (보너스 경험치, 특별 보스 등).
 * 기존 eventEngine.ts 위에 커뮤니티 레이어 추가.
 */
import { prisma } from '../db';
import { redisClient, redisConnected } from '../redis';

// ─── 타입 정의 ──────────────────────────────────────────────────

export type CommunityEventType =
  | 'bonus_exp'        // 경험치 보너스
  | 'bonus_drop'       // 드랍률 보너스
  | 'bonus_gold'       // 골드 보너스
  | 'special_boss'     // 특별 보스 출현
  | 'pvp_tournament'   // PvP 토너먼트
  | 'treasure_hunt'    // 보물찾기
  | 'guild_rally'      // 길드 연합 이벤트
  | 'double_craft'     // 제작 더블 성공
  | 'custom';          // GM 커스텀

export interface CommunityEventConfig {
  name: string;
  type: CommunityEventType;
  description: string;
  /** 이벤트 시작 시각 (ISO 8601) */
  startAt: string;
  /** 이벤트 종료 시각 (ISO 8601) */
  endAt: string;
  /** 보너스 배율 (1.5 = 50% 증가) */
  multiplier?: number;
  /** 참여 조건 (최소 레벨 등) */
  requirements?: {
    minLevel?: number;
    maxLevel?: number;
    guildOnly?: boolean;
    vipOnly?: boolean;
  };
  /** 보상 풀 */
  rewards?: Array<{
    type: 'gold' | 'diamond' | 'item' | 'exp';
    itemId?: string;
    amount: number;
    /** 보상 조건 (참여, 랭킹 등) */
    condition?: string;
  }>;
  /** 특별 보스 설정 */
  bossConfig?: {
    monsterId: string;
    hpMultiplier: number;
    dropBonus: number;
  };
  /** GM 메모 (내부용) */
  gmNote?: string;
  /** 생성자 GM ID */
  createdBy: string;
}

export interface ActiveEvent {
  id: string;
  config: CommunityEventConfig;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  participantCount: number;
  createdAt: string;
}

export interface EventParticipation {
  userId: string;
  eventId: string;
  score: number;
  joinedAt: string;
}

// ─── 상수 ───────────────────────────────────────────────────────

const CACHE_KEY_PREFIX = 'community_event:';
const ACTIVE_EVENTS_KEY = 'community_events:active';
const CACHE_TTL = 60; // 1분

// ─── 인메모리 활성 이벤트 ───────────────────────────────────────

const activeEventsCache: Map<string, ActiveEvent> = new Map();

// ═══════════════════════════════════════════════════════════════
//  이벤트 CRUD
// ═══════════════════════════════════════════════════════════════

/** 커뮤니티 이벤트 생성 (GM 전용) */
export async function createCommunityEvent(config: CommunityEventConfig): Promise<ActiveEvent> {
  const startAt = new Date(config.startAt);
  const endAt = new Date(config.endAt);

  if (endAt <= startAt) {
    throw new Error('종료 시각은 시작 시각 이후여야 합니다.');
  }

  const now = new Date();
  const status = now >= startAt ? 'active' : 'scheduled';

  const event = await prisma.communityEvent.create({
    data: {
      name: config.name,
      type: config.type,
      description: config.description,
      startAt,
      endAt,
      config: JSON.parse(JSON.stringify(config)),
      status,
      participantCount: 0,
      createdBy: config.createdBy,
    },
  });

  const activeEvent = toActiveEvent(event);
  activeEventsCache.set(event.id, activeEvent);

  // Redis 캐시
  if (redisConnected()) {
    await redisClient.setex(
      `${CACHE_KEY_PREFIX}${event.id}`,
      CACHE_TTL,
      JSON.stringify(activeEvent),
    );
    await redisClient.sadd(ACTIVE_EVENTS_KEY, event.id);
  }

  console.log(`[CommunityEvent] 이벤트 생성: ${event.id} (${config.name}, ${status})`);
  return activeEvent;
}

/** 이벤트 조회 */
export async function getEvent(eventId: string): Promise<ActiveEvent | null> {
  // 캐시 우선
  const cached = activeEventsCache.get(eventId);
  if (cached) return cached;

  const event = await prisma.communityEvent.findUnique({ where: { id: eventId } });
  if (!event) return null;

  return toActiveEvent(event);
}

/** 활성 이벤트 목록 */
export async function getActiveEvents(): Promise<ActiveEvent[]> {
  const now = new Date();
  const events = await prisma.communityEvent.findMany({
    where: {
      status: { in: ['scheduled', 'active'] },
      endAt: { gte: now },
    },
    orderBy: { startAt: 'asc' },
  });

  return events.map(toActiveEvent);
}

/** 이벤트 취소 (GM 전용) */
export async function cancelEvent(eventId: string): Promise<boolean> {
  const event = await prisma.communityEvent.findUnique({ where: { id: eventId } });
  if (!event || event.status === 'ended' || event.status === 'cancelled') return false;

  await prisma.communityEvent.update({
    where: { id: eventId },
    data: { status: 'cancelled' },
  });

  activeEventsCache.delete(eventId);
  if (redisConnected()) {
    await redisClient.del(`${CACHE_KEY_PREFIX}${eventId}`);
    await redisClient.srem(ACTIVE_EVENTS_KEY, eventId);
  }

  console.log(`[CommunityEvent] 이벤트 취소: ${eventId}`);
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  이벤트 참여
// ═══════════════════════════════════════════════════════════════

/** 이벤트 참여 */
export async function joinEvent(
  eventId: string,
  userId: string,
): Promise<{ joined: boolean; message: string }> {
  const event = await getEvent(eventId);
  if (!event) return { joined: false, message: '존재하지 않는 이벤트입니다.' };

  const now = new Date();
  if (now < new Date(event.config.startAt)) {
    return { joined: false, message: '아직 시작되지 않은 이벤트입니다.' };
  }
  if (now > new Date(event.config.endAt)) {
    return { joined: false, message: '이미 종료된 이벤트입니다.' };
  }

  // 중복 참여 체크
  const existing = await prisma.eventParticipation.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
  if (existing) return { joined: true, message: '이미 참여 중입니다.' };

  await prisma.eventParticipation.create({
    data: { userId, eventId, score: 0 },
  });

  await prisma.communityEvent.update({
    where: { id: eventId },
    data: { participantCount: { increment: 1 } },
  });

  return { joined: true, message: '이벤트에 참여했습니다!' };
}

/** 참여자 점수 업데이트 */
export async function updateScore(
  eventId: string,
  userId: string,
  scoreDelta: number,
): Promise<number> {
  const participation = await prisma.eventParticipation.update({
    where: { userId_eventId: { userId, eventId } },
    data: { score: { increment: scoreDelta } },
  });
  return participation.score;
}

/** 이벤트 리더보드 */
export async function getLeaderboard(
  eventId: string,
  limit = 50,
): Promise<Array<{ userId: string; score: number; rank: number }>> {
  const participants = await prisma.eventParticipation.findMany({
    where: { eventId },
    orderBy: { score: 'desc' },
    take: limit,
    select: { userId: true, score: true },
  });

  return participants.map((p, i) => ({
    userId: p.userId,
    score: p.score,
    rank: i + 1,
  }));
}

// ═══════════════════════════════════════════════════════════════
//  보너스 배율 조회 (전투/경험치 시스템 연동용)
// ═══════════════════════════════════════════════════════════════

/** 현재 활성 보너스 배율 조회 */
export async function getActiveMultipliers(): Promise<{
  exp: number;
  drop: number;
  gold: number;
  craft: number;
}> {
  const now = new Date();
  const events = await prisma.communityEvent.findMany({
    where: {
      status: 'active',
      startAt: { lte: now },
      endAt: { gte: now },
    },
  });

  const multipliers = { exp: 1, drop: 1, gold: 1, craft: 1 };

  for (const event of events) {
    const config = event.config as unknown as CommunityEventConfig;
    const m = config.multiplier || 1;

    switch (config.type) {
      case 'bonus_exp':
        multipliers.exp *= m;
        break;
      case 'bonus_drop':
        multipliers.drop *= m;
        break;
      case 'bonus_gold':
        multipliers.gold *= m;
        break;
      case 'double_craft':
        multipliers.craft *= m;
        break;
    }
  }

  return multipliers;
}

// ═══════════════════════════════════════════════════════════════
//  상태 동기화 (주기적 호출)
// ═══════════════════════════════════════════════════════════════

/** 이벤트 상태 동기화 — scheduled → active, active → ended */
export async function syncEventStatuses(): Promise<{ activated: number; ended: number }> {
  const now = new Date();
  let activated = 0;
  let ended = 0;

  // scheduled → active
  const toActivate = await prisma.communityEvent.updateMany({
    where: { status: 'scheduled', startAt: { lte: now } },
    data: { status: 'active' },
  });
  activated = toActivate.count;

  // active → ended
  const toEnd = await prisma.communityEvent.updateMany({
    where: { status: 'active', endAt: { lte: now } },
    data: { status: 'ended' },
  });
  ended = toEnd.count;

  if (activated > 0 || ended > 0) {
    console.log(`[CommunityEvent] 상태 동기화: ${activated} 활성화, ${ended} 종료`);
  }

  return { activated, ended };
}

// ─── 유틸 ───────────────────────────────────────────────────────

function toActiveEvent(row: any): ActiveEvent {
  return {
    id: row.id,
    config: row.config as CommunityEventConfig,
    status: row.status,
    participantCount: row.participantCount,
    createdAt: row.createdAt?.toISOString?.() || row.createdAt,
  };
}
