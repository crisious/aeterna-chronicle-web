/**
 * endlessDungeonManager.ts — P11-04 엔드게임 무한 던전
 *
 * 매주 리셋 100층 챌린지 "시간의 탑"
 * - 층별 난이도 스케일링 (HP/ATK 3% 복리)
 * - 어픽스 시스템 10종 (10층마다 추가)
 * - 리더보드 + 주간 보상
 * - 체크포인트: 10층 단위
 */

import { prisma } from '../db';
import { redisClient } from '../redis';

// ─── 타입 정의 ──────────────────────────────────────────────────

export interface EndlessFloorConfig {
  floor: number;
  hpMultiplier: number;
  atkMultiplier: number;
  affixes: AffixType[];
  monsterCount: number;
  bossFloor: boolean;         // 10의 배수층
  checkpointFloor: boolean;   // 10의 배수층
  rewardTier: 'normal' | 'elite' | 'boss' | 'legendary';
}

export type AffixType =
  | 'enrage'          // 광폭화: 몬스터 공격력 +20%
  | 'fortified'       // 강화: 몬스터 HP +30%
  | 'explosive'       // 폭발: 처치 시 범위 피해
  | 'vampiric'        // 흡혈: 몬스터 피해의 10% HP 회복
  | 'necrotic'        // 괴사: 힐 효과 50% 감소
  | 'bolstering'      // 증원: 처치 시 나머지 강화
  | 'teeming'         // 밀집: 몬스터 수 50% 증가
  | 'volcanic'        // 화산: 바닥 장판 랜덤 생성
  | 'quaking'         // 진동: 주기적 범위 피해
  | 'tyrannical';     // 폭군: 보스 HP/ATK 40% 증가

/** 어픽스 풀 — 10층마다 1개씩 추가 (최대 10개) */
const AFFIX_POOL: AffixType[] = [
  'enrage', 'fortified', 'explosive', 'vampiric', 'necrotic',
  'bolstering', 'teeming', 'volcanic', 'quaking', 'tyrannical',
];

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  highestFloor: number;
  clearTime: number;      // 초
  weekId: string;          // 'YYYY-WW'
  timestamp: Date;
}

export interface WeeklyReward {
  rank: number;
  rewards: { type: string; id?: string; amount?: number; name: string }[];
}

// ─── 상수 ───────────────────────────────────────────────────────

const MAX_FLOOR = 100;
const BASE_HP_SCALE = 1.03;       // 층당 HP 3% 복리 증가
const BASE_ATK_SCALE = 1.03;      // 층당 ATK 3% 복리 증가
const CHECKPOINT_INTERVAL = 10;
const WEEKLY_RESET_DAY = 1;       // 월요일
const REDIS_LEADERBOARD_KEY = 'endless_dungeon:leaderboard';
const REDIS_WEEKLY_KEY_PREFIX = 'endless_dungeon:week:';

// ─── 층 설정 생성기 ─────────────────────────────────────────────

export function generateFloorConfig(floor: number): EndlessFloorConfig {
  if (floor < 1 || floor > MAX_FLOOR) {
    throw new Error(`Invalid floor: ${floor}. Must be 1-${MAX_FLOOR}`);
  }

  const hpMultiplier = Math.pow(BASE_HP_SCALE, floor - 1);
  const atkMultiplier = Math.pow(BASE_ATK_SCALE, floor - 1);
  const bossFloor = floor % CHECKPOINT_INTERVAL === 0;
  const checkpointFloor = bossFloor;

  // 어픽스: 10층마다 1개 추가 (시드 기반 결정적 선택)
  const affixCount = Math.floor(floor / CHECKPOINT_INTERVAL);
  const affixes: AffixType[] = [];
  for (let i = 0; i < affixCount && i < AFFIX_POOL.length; i++) {
    affixes.push(AFFIX_POOL[i]);
  }

  // 몬스터 수: 기본 5 + 층÷10 (밀집 어픽스 시 ×1.5)
  let monsterCount = 5 + Math.floor(floor / 10);
  if (affixes.includes('teeming')) {
    monsterCount = Math.ceil(monsterCount * 1.5);
  }

  // 보상 등급
  let rewardTier: EndlessFloorConfig['rewardTier'] = 'normal';
  if (floor >= 80) rewardTier = 'legendary';
  else if (bossFloor) rewardTier = 'boss';
  else if (floor >= 50) rewardTier = 'elite';

  return {
    floor,
    hpMultiplier: Math.round(hpMultiplier * 1000) / 1000,
    atkMultiplier: Math.round(atkMultiplier * 1000) / 1000,
    affixes,
    monsterCount,
    bossFloor,
    checkpointFloor,
    rewardTier,
  };
}

// ─── 주간 ID 생성 ───────────────────────────────────────────────

export function getWeekId(date: Date = new Date()): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.ceil((date.getTime() - startOfYear.getTime()) / 86400000);
  const weekNum = Math.ceil(dayOfYear / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

// ─── 리더보드 관리 ──────────────────────────────────────────────

export class EndlessDungeonLeaderboard {
  private weekId: string;

  constructor(weekId?: string) {
    this.weekId = weekId ?? getWeekId();
  }

  /** 플레이어 기록 제출 */
  async submitRecord(playerId: string, playerName: string, floor: number, clearTime: number): Promise<void> {
    const key = `${REDIS_WEEKLY_KEY_PREFIX}${this.weekId}`;
    const score = floor * 100000 - clearTime; // 높은 층 우선, 같은 층이면 빠른 클리어 우선

    await redisClient.zadd(key, score, JSON.stringify({
      playerId,
      playerName,
      highestFloor: floor,
      clearTime,
      weekId: this.weekId,
      timestamp: new Date().toISOString(),
    }));

    // 주간 만료: 8일 (여유 포함)
    await redisClient.expire(key, 8 * 86400);
  }

  /** 상위 N명 조회 */
  async getTopRanks(count: number = 100): Promise<LeaderboardEntry[]> {
    const key = `${REDIS_WEEKLY_KEY_PREFIX}${this.weekId}`;
    const entries = await redisClient.zrevrange(key, 0, count - 1);
    return entries.map((e: string) => JSON.parse(e) as LeaderboardEntry);
  }

  /** 플레이어 순위 조회 */
  async getPlayerRank(playerId: string): Promise<number | null> {
    const key = `${REDIS_WEEKLY_KEY_PREFIX}${this.weekId}`;
    const entries = await redisClient.zrevrange(key, 0, -1);
    const idx = entries.findIndex((e: string) => {
      const parsed = JSON.parse(e) as LeaderboardEntry;
      return parsed.playerId === playerId;
    });
    return idx >= 0 ? idx + 1 : null;
  }
}

// ─── 주간 보상 테이블 ───────────────────────────────────────────

export const WEEKLY_REWARDS: WeeklyReward[] = [
  { rank: 1, rewards: [
    { type: 'gold', amount: 100000, name: '골드 100,000' },
    { type: 'crystal', amount: 500, name: '크리스탈 500' },
    { type: 'cosmetic', id: 'COS_ENDLESS_CROWN', name: '시간의 탑 왕관 (주간 한정)' },
    { type: 'item', id: 'transcendence_stone_epic', amount: 5, name: '에픽 초월석 ×5' },
  ]},
  { rank: 2, rewards: [
    { type: 'gold', amount: 70000, name: '골드 70,000' },
    { type: 'crystal', amount: 350, name: '크리스탈 350' },
    { type: 'item', id: 'transcendence_stone_epic', amount: 3, name: '에픽 초월석 ×3' },
  ]},
  { rank: 3, rewards: [
    { type: 'gold', amount: 50000, name: '골드 50,000' },
    { type: 'crystal', amount: 250, name: '크리스탈 250' },
    { type: 'item', id: 'transcendence_stone_rare', amount: 5, name: '레어 초월석 ×5' },
  ]},
  // 4~10위
  ...Array.from({ length: 7 }, (_, i) => ({
    rank: i + 4,
    rewards: [
      { type: 'gold', amount: 30000, name: '골드 30,000' },
      { type: 'crystal', amount: 150, name: '크리스탈 150' },
      { type: 'item', id: 'transcendence_stone_rare', amount: 3, name: '레어 초월석 ×3' },
    ],
  })),
  // 11~50위
  ...Array.from({ length: 40 }, (_, i) => ({
    rank: i + 11,
    rewards: [
      { type: 'gold', amount: 15000, name: '골드 15,000' },
      { type: 'crystal', amount: 80, name: '크리스탈 80' },
      { type: 'item', id: 'transcendence_stone_common', amount: 5, name: '일반 초월석 ×5' },
    ],
  })),
  // 51~100위
  ...Array.from({ length: 50 }, (_, i) => ({
    rank: i + 51,
    rewards: [
      { type: 'gold', amount: 8000, name: '골드 8,000' },
      { type: 'crystal', amount: 40, name: '크리스탈 40' },
      { type: 'item', id: 'transcendence_stone_common', amount: 2, name: '일반 초월석 ×2' },
    ],
  })),
];

// ─── 층별 드랍 보상 ─────────────────────────────────────────────

export function getFloorRewards(floor: number, config: EndlessFloorConfig) {
  const baseGold = 500 + floor * 100;
  const baseExp = 200 + floor * 50;

  const rewards: { type: string; id?: string; amount: number; name: string }[] = [
    { type: 'gold', amount: baseGold, name: `골드 ${baseGold.toLocaleString()}` },
    { type: 'exp', amount: baseExp, name: `경험치 ${baseExp.toLocaleString()}` },
  ];

  // 보스층 추가 보상
  if (config.bossFloor) {
    rewards.push({ type: 'item', id: 'enchant_stone_r', amount: 2, name: '레어 강화석 ×2' });
  }

  // 고층 추가 보상
  if (floor >= 50) {
    rewards.push({ type: 'item', id: 'abyss_material', amount: 1, name: '심연 재료' });
  }
  if (floor >= 80) {
    rewards.push({ type: 'item', id: 'transcendence_stone_rare', amount: 1, name: '레어 초월석' });
  }
  if (floor === MAX_FLOOR) {
    rewards.push({ type: 'title', id: 'TITLE_ENDLESS_MASTER', amount: 1, name: '칭호: 시간의 탑 정복자' });
    rewards.push({ type: 'cosmetic', id: 'COS_ENDLESS_AURA', amount: 1, name: '시간의 오라 (코스메틱)' });
  }

  return rewards;
}

// ─── 진입 조건 / 주간 리셋 검증 ─────────────────────────────────

export async function canEnterEndlessDungeon(playerId: string): Promise<{ allowed: boolean; reason?: string }> {
  // 챕터 7 클리어 필수
  const progress = await prisma.storyProgress.findUnique({
    where: { playerId },
  });

  if (!progress || progress.currentChapter < 7) {
    return { allowed: false, reason: '챕터 7 클리어 필요' };
  }

  return { allowed: true };
}

export async function getPlayerProgress(playerId: string, weekId?: string): Promise<{
  highestFloor: number;
  lastCheckpoint: number;
  weekId: string;
}> {
  const wk = weekId ?? getWeekId();

  const record = await prisma.endlessDungeonProgress.findUnique({
    where: { playerId_weekId: { playerId, weekId: wk } },
  });

  if (!record) {
    return { highestFloor: 0, lastCheckpoint: 0, weekId: wk };
  }

  return {
    highestFloor: record.highestFloor,
    lastCheckpoint: Math.floor(record.highestFloor / CHECKPOINT_INTERVAL) * CHECKPOINT_INTERVAL,
    weekId: wk,
  };
}

// ─── 전체 층 설정 프리셋 (서버 시작 시 캐시) ─────────────────────

export function generateAllFloorConfigs(): EndlessFloorConfig[] {
  return Array.from({ length: MAX_FLOOR }, (_, i) => generateFloorConfig(i + 1));
}

console.log('[P11-04] EndlessDungeonManager 모듈 로드 완료');
