/**
 * eventScheduler.ts — 시간 한정 이벤트 스케줄러 엔진 (P8-11)
 *
 * 역할:
 *   - 이벤트 시작/종료 자동 스케줄링
 *   - 참여/점수/보상 관리
 *   - 3종 시즌 2 이벤트: 안개해 축제, 기억 수집 레이스, 보물 사냥
 *   - EventParticipation 모델 활용
 */

import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

export type ScheduledEventType = 'festival' | 'race' | 'treasure_hunt';

export interface ScheduledEventDef {
  code: string;
  name: string;
  description: string;
  type: ScheduledEventType;
  durationHours: number;
  config: Record<string, any>;
  scoreConfig: {
    maxScore: number;
    scoreUnit: string;            // 점수 단위 이름
    rankingRewards: RankingReward[];
    milestoneRewards: MilestoneReward[];
  };
}

interface RankingReward {
  rankMin: number;
  rankMax: number;
  rewards: { type: string; itemId?: string; amount: number }[];
}

interface MilestoneReward {
  scoreThreshold: number;
  reward: { type: string; itemId?: string; amount: number };
}

// ─── 시즌 2 이벤트 시드 3종 ─────────────────────────────────────

export const SEASON2_EVENTS: ScheduledEventDef[] = [
  {
    code: 'EVT_MIST_FESTIVAL',
    name: '안개해 축제',
    description: '봉인의 첨탑 주변에서 열리는 안개해 대축제! 미니게임과 특별 상점이 열린다.',
    type: 'festival',
    durationHours: 168, // 7일
    config: {
      location: 'mist_sea',
      minigames: ['fog_fishing', 'memory_puzzle', 'seal_defense'],
      specialShop: true,
      eventCurrency: 'MIST_TOKEN',
      dailyBonuses: [
        { day: 1, reward: { type: 'event_coin', amount: 100 } },
        { day: 3, reward: { type: 'item', itemId: 'MAT_FOG_ESSENCE', amount: 5 } },
        { day: 5, reward: { type: 'diamond', amount: 200 } },
        { day: 7, reward: { type: 'item', itemId: 'FURN_LIGHT_MIST_LAMP', amount: 1 } },
      ],
    },
    scoreConfig: {
      maxScore: 10000,
      scoreUnit: '축제 포인트',
      rankingRewards: [
        { rankMin: 1, rankMax: 1, rewards: [{ type: 'item', itemId: 'EQUIP_LEGENDARY_STAFF_NEBULOS', amount: 1 }, { type: 'gold', amount: 50000 }] },
        { rankMin: 2, rankMax: 10, rewards: [{ type: 'diamond', amount: 1000 }, { type: 'gold', amount: 30000 }] },
        { rankMin: 11, rankMax: 50, rewards: [{ type: 'diamond', amount: 500 }, { type: 'gold', amount: 15000 }] },
        { rankMin: 51, rankMax: 100, rewards: [{ type: 'diamond', amount: 200 }, { type: 'gold', amount: 5000 }] },
      ],
      milestoneRewards: [
        { scoreThreshold: 500, reward: { type: 'gold', amount: 1000 } },
        { scoreThreshold: 1500, reward: { type: 'item', itemId: 'MAT_MIST_JELLY', amount: 10 } },
        { scoreThreshold: 3000, reward: { type: 'diamond', amount: 100 } },
        { scoreThreshold: 5000, reward: { type: 'item', itemId: 'FURN_DECO_AQUARIUM', amount: 1 } },
        { scoreThreshold: 8000, reward: { type: 'diamond', amount: 300 } },
        { scoreThreshold: 10000, reward: { type: 'item', itemId: 'COSMETIC_MIST_WING', amount: 1 } },
      ],
    },
  },
  {
    code: 'EVT_MEMORY_RACE',
    name: '기억 수집 레이스',
    description: '안개해 곳곳에 흩어진 기억 파편을 가장 빨리 수집하라! 실시간 경쟁.',
    type: 'race',
    durationHours: 72, // 3일
    config: {
      location: 'mist_sea',
      fragmentCount: 50,
      timeLimit: 1800, // 30분 제한
      reviveAllowed: false,
      laps: 3,
      pvpEnabled: false,
    },
    scoreConfig: {
      maxScore: 50,
      scoreUnit: '기억 파편',
      rankingRewards: [
        { rankMin: 1, rankMax: 1, rewards: [{ type: 'item', itemId: 'FURN_SP_MEMORY_CRYSTAL', amount: 1 }, { type: 'gold', amount: 30000 }] },
        { rankMin: 2, rankMax: 10, rewards: [{ type: 'diamond', amount: 800 }, { type: 'gold', amount: 20000 }] },
        { rankMin: 11, rankMax: 50, rewards: [{ type: 'diamond', amount: 400 }, { type: 'gold', amount: 10000 }] },
        { rankMin: 51, rankMax: 100, rewards: [{ type: 'diamond', amount: 150 }, { type: 'gold', amount: 3000 }] },
      ],
      milestoneRewards: [
        { scoreThreshold: 5, reward: { type: 'gold', amount: 500 } },
        { scoreThreshold: 15, reward: { type: 'item', itemId: 'MAT_MEMORY_BEAD', amount: 10 } },
        { scoreThreshold: 30, reward: { type: 'diamond', amount: 200 } },
        { scoreThreshold: 50, reward: { type: 'item', itemId: 'MAT_OBLIVION_ESSENCE', amount: 3 } },
      ],
    },
  },
  {
    code: 'EVT_TREASURE_HUNT',
    name: '심해 보물 사냥',
    description: '침몰선에 잠든 보물을 찾아라! 단서를 따라 안개해를 탐험하는 보물 사냥.',
    type: 'treasure_hunt',
    durationHours: 120, // 5일
    config: {
      location: 'mist_sea',
      clueStages: 7,
      hiddenBoss: 'MON_BOSS_MS02',  // 침몰 함대 함장 레버넌트
      coopAllowed: true,
      maxPartySize: 4,
      dailyClueLimit: 3,
    },
    scoreConfig: {
      maxScore: 7,
      scoreUnit: '보물 상자',
      rankingRewards: [
        { rankMin: 1, rankMax: 1, rewards: [{ type: 'item', itemId: 'EQUIP_LEGENDARY_TRIDENT_ABYSSAL', amount: 1 }, { type: 'gold', amount: 40000 }] },
        { rankMin: 2, rankMax: 10, rewards: [{ type: 'diamond', amount: 600 }, { type: 'gold', amount: 25000 }] },
        { rankMin: 11, rankMax: 50, rewards: [{ type: 'diamond', amount: 300 }, { type: 'gold', amount: 12000 }] },
        { rankMin: 51, rankMax: 100, rewards: [{ type: 'diamond', amount: 100 }, { type: 'gold', amount: 5000 }] },
      ],
      milestoneRewards: [
        { scoreThreshold: 1, reward: { type: 'gold', amount: 2000 } },
        { scoreThreshold: 3, reward: { type: 'item', itemId: 'MAT_SUNKEN_TREASURE', amount: 5 } },
        { scoreThreshold: 5, reward: { type: 'diamond', amount: 300 } },
        { scoreThreshold: 7, reward: { type: 'item', itemId: 'FURN_DECO_SEAL_REPLICA', amount: 1 } },
      ],
    },
  },
];

// ═══════════════════════════════════════════════════════════════
//  이벤트 시작 (GameEvent + 스케줄 등록)
// ═══════════════════════════════════════════════════════════════

export async function startScheduledEvent(
  eventDef: ScheduledEventDef,
  startAt?: Date,
): Promise<{ eventId: string; message: string }> {
  const start = startAt ?? new Date();
  const end = new Date(start.getTime() + eventDef.durationHours * 3600 * 1000);

  const event = await prisma.gameEvent.upsert({
    where: { code: eventDef.code },
    update: {
      name: eventDef.name,
      description: eventDef.description,
      type: eventDef.type,
      config: eventDef.config as any,
      rewards: eventDef.scoreConfig as any,
      startAt: start,
      endAt: end,
      isActive: true,
    },
    create: {
      code: eventDef.code,
      name: eventDef.name,
      description: eventDef.description,
      type: eventDef.type,
      config: eventDef.config as any,
      rewards: eventDef.scoreConfig as any,
      startAt: start,
      endAt: end,
      isActive: true,
    },
  });

  return { eventId: event.id, message: `이벤트 '${eventDef.name}' 시작됨 (~${end.toISOString()})` };
}

// ═══════════════════════════════════════════════════════════════
//  이벤트 참여/점수 업데이트
// ═══════════════════════════════════════════════════════════════

export async function participateEvent(
  userId: string,
  eventCode: string,
  scoreIncrement: number,
): Promise<{ success: boolean; totalScore: number; message: string }> {
  const event = await prisma.gameEvent.findUnique({ where: { code: eventCode } });
  if (!event || !event.isActive) {
    return { success: false, totalScore: 0, message: '활성 이벤트가 아닙니다.' };
  }

  const now = new Date();
  if (now < event.startAt || now > event.endAt) {
    return { success: false, totalScore: 0, message: '이벤트 기간이 아닙니다.' };
  }

  const participation = await prisma.eventParticipation.upsert({
    where: { userId_eventId: { userId, eventId: event.id } },
    update: {
      score: { increment: scoreIncrement },
    },
    create: {
      userId,
      eventId: event.id,
      score: scoreIncrement,
    },
  });

  return {
    success: true,
    totalScore: participation.score,
    message: `+${scoreIncrement}점! 총 ${participation.score}점`,
  };
}

// ═══════════════════════════════════════════════════════════════
//  랭킹 조회
// ═══════════════════════════════════════════════════════════════

export async function getEventRanking(
  eventCode: string,
  limit = 100,
): Promise<{ userId: string; score: number; rank: number }[]> {
  const event = await prisma.gameEvent.findUnique({ where: { code: eventCode } });
  if (!event) return [];

  const participants = await prisma.eventParticipation.findMany({
    where: { eventId: event.id },
    orderBy: { score: 'desc' },
    take: limit,
  });

  return participants.map((p, i) => ({
    userId: p.userId,
    score: p.score,
    rank: i + 1,
  }));
}

// ═══════════════════════════════════════════════════════════════
//  이벤트 종료 + 보상 지급
// ═══════════════════════════════════════════════════════════════

export async function finalizeEvent(
  eventCode: string,
): Promise<{ success: boolean; rewarded: number; message: string }> {
  const event = await prisma.gameEvent.findUnique({ where: { code: eventCode } });
  if (!event) return { success: false, rewarded: 0, message: '이벤트를 찾을 수 없습니다.' };

  // 비활성화
  await prisma.gameEvent.update({
    where: { code: eventCode },
    data: { isActive: false },
  });

  // 랭킹 계산 + 보상 매핑
  const ranking = await getEventRanking(eventCode, 1000);

  let rewarded = 0;
  for (const entry of ranking) {
    // 랭킹 기록
    await prisma.eventParticipation.update({
      where: { userId_eventId: { userId: entry.userId, eventId: event.id } },
      data: {
        rank: entry.rank,
        completedAt: new Date(),
        // 보상은 Mail 시스템으로 전달 (여기서는 기록만)
        rewards: { rank: entry.rank, score: entry.score } as any,
      },
    });
    rewarded++;
  }

  return {
    success: true,
    rewarded,
    message: `이벤트 '${event.name}' 종료. ${rewarded}명에게 보상 기록 완료.`,
  };
}

// ═══════════════════════════════════════════════════════════════
//  이벤트 시드 등록 (일괄)
// ═══════════════════════════════════════════════════════════════

export async function seedSeason2Events(): Promise<{ seeded: number }> {
  let seeded = 0;
  for (const def of SEASON2_EVENTS) {
    // 미래 시점으로 등록 (수동 활성화 대기)
    const start = new Date();
    start.setDate(start.getDate() + 7); // 1주 후 자동 시작
    await startScheduledEvent(def, start);
    seeded++;
  }
  return { seeded };
}
