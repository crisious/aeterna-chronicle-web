/**
 * rankingManager.ts — 통합 랭킹 비즈니스 로직 (P5-07)
 *
 * - 점수 갱신 (Redis sorted set 우선, DB fallback)
 * - 순위 계산
 * - 시즌 리셋
 * - 카테고리: level, combat_power, pvp_rating, raid_clear, achievement_points
 */

import { prisma } from '../db';
import { redisClient, redisConnected } from '../redis';
import { RankingEntry as PrismaRankingEntry } from '@prisma/client';

// ─── 상수 ──────────────────────────────────────────────────────

const VALID_CATEGORIES = ['level', 'combat_power', 'pvp_rating', 'raid_clear', 'achievement_points'] as const;
export type RankingCategory = typeof VALID_CATEGORIES[number];

const REDIS_KEY_PREFIX = 'ranking:';
const TOP_N_DEFAULT = 100;
const AROUND_RANGE = 5; // 내 순위 ±5

// ─── 타입 ──────────────────────────────────────────────────────

export interface RankingEntry {
  userId: string;
  category: string;
  score: number;
  rank: number;
  season?: string;
}

export interface RankingResult {
  ok: boolean;
  error?: string;
  data?: unknown;
}

// ─── Redis 키 헬퍼 ─────────────────────────────────────────────

function redisKey(category: string, season?: string): string {
  return season
    ? `${REDIS_KEY_PREFIX}${category}:${season}`
    : `${REDIS_KEY_PREFIX}${category}:current`;
}

// ─── RankingManager ─────────────────────────────────────────────

class RankingManager {

  // ── 카테고리 유효성 검증 ──────────────────────────────────────

  private isValidCategory(cat: string): cat is RankingCategory {
    return (VALID_CATEGORIES as readonly string[]).includes(cat);
  }

  // ── 점수 갱신 ─────────────────────────────────────────────────

  async updateScore(userId: string, category: string, score: number, season?: string): Promise<RankingResult> {
    if (!this.isValidCategory(category)) {
      return { ok: false, error: `유효하지 않은 카테고리: ${category}` };
    }

    // Redis sorted set 갱신
    if (redisConnected) {
      try {
        await redisClient.zAdd(redisKey(category, season), [{ score, value: userId }]);
      } catch (err) {
        console.error(`[Ranking] Redis zAdd 실패: ${err}`);
      }
    }

    // DB upsert
    await prisma.rankingEntry.upsert({
      where: {
        userId_category_season: {
          userId,
          category,
          season: season ?? 'current',
        },
      },
      update: { score },
      create: {
        userId,
        category,
        score,
        season: season ?? 'current',
      },
    });

    return { ok: true };
  }

  // ── Top N 조회 ────────────────────────────────────────────────

  async getTopN(category: string, n: number = TOP_N_DEFAULT, season?: string): Promise<RankingEntry[]> {
    if (!this.isValidCategory(category)) return [];

    // Redis 우선
    if (redisConnected) {
      try {
        const results = await redisClient.zRangeWithScores(
          redisKey(category, season),
          0, n - 1,
          { REV: true },
        );

        return results.map((entry, idx) => ({
          userId: entry.value,
          category,
          score: entry.score,
          rank: idx + 1,
          season: season ?? 'current',
        }));
      } catch {
        // Redis 실패 시 DB fallback
      }
    }

    // DB fallback
    const entries = await prisma.rankingEntry.findMany({
      where: {
        category,
        season: season ?? 'current',
      },
      orderBy: { score: 'desc' },
      take: n,
    });

    return entries.map((e: PrismaRankingEntry, idx: number) => ({
      userId: e.userId,
      category: e.category,
      score: e.score,
      rank: idx + 1,
      season: e.season ?? 'current',
    }));
  }

  // ── 내 순위 조회 ─────────────────────────────────────────────

  async getMyRank(userId: string, category: string, season?: string): Promise<RankingEntry | null> {
    if (!this.isValidCategory(category)) return null;

    // Redis 우선
    if (redisConnected) {
      try {
        const rank = await redisClient.zRevRank(redisKey(category, season), userId);
        if (rank === null) return null;

        const score = await redisClient.zScore(redisKey(category, season), userId);
        return {
          userId,
          category,
          score: score ?? 0,
          rank: rank + 1,
          season: season ?? 'current',
        };
      } catch {
        // fallback
      }
    }

    // DB fallback — 점수 기준 순위 계산
    const entry = await prisma.rankingEntry.findUnique({
      where: {
        userId_category_season: {
          userId,
          category,
          season: season ?? 'current',
        },
      },
    });

    if (!entry) return null;

    const higherCount = await prisma.rankingEntry.count({
      where: {
        category,
        season: season ?? 'current',
        score: { gt: entry.score },
      },
    });

    return {
      userId,
      category,
      score: entry.score,
      rank: higherCount + 1,
      season: entry.season ?? 'current',
    };
  }

  // ── 주변 순위 조회 ───────────────────────────────────────────

  async getAroundMe(userId: string, category: string, range: number = AROUND_RANGE, season?: string): Promise<RankingEntry[]> {
    if (!this.isValidCategory(category)) return [];

    // Redis 우선
    if (redisConnected) {
      try {
        const myRank = await redisClient.zRevRank(redisKey(category, season), userId);
        if (myRank === null) return [];

        const start = Math.max(0, myRank - range);
        const end = myRank + range;

        const results = await redisClient.zRangeWithScores(
          redisKey(category, season),
          start, end,
          { REV: true },
        );

        return results.map((entry, idx) => ({
          userId: entry.value,
          category,
          score: entry.score,
          rank: start + idx + 1,
          season: season ?? 'current',
        }));
      } catch {
        // fallback
      }
    }

    // DB fallback
    const myEntry = await this.getMyRank(userId, category, season);
    if (!myEntry) return [];

    const myRank = myEntry.rank;
    const skip = Math.max(0, myRank - range - 1);

    const entries = await prisma.rankingEntry.findMany({
      where: {
        category,
        season: season ?? 'current',
      },
      orderBy: { score: 'desc' },
      skip,
      take: range * 2 + 1,
    });

    return entries.map((e: PrismaRankingEntry, idx: number) => ({
      userId: e.userId,
      category: e.category,
      score: e.score,
      rank: skip + idx + 1,
      season: e.season ?? 'current',
    }));
  }

  // ── 시즌 이력 조회 ───────────────────────────────────────────

  async getSeasonHistory(userId: string, category: string): Promise<RankingEntry[]> {
    if (!this.isValidCategory(category)) return [];

    const entries = await prisma.rankingEntry.findMany({
      where: { userId, category },
      orderBy: { updatedAt: 'desc' },
    });

    return entries.map((e: PrismaRankingEntry) => ({
      userId: e.userId,
      category: e.category,
      score: e.score,
      rank: e.rank ?? 0,
      season: e.season ?? 'current',
    }));
  }

  // ── 시즌 리셋 ─────────────────────────────────────────────────

  async resetSeason(currentSeason: string, newSeason: string): Promise<{ archived: number }> {
    // 현재 시즌의 순위를 확정하고 DB rank 컬럼에 기록
    let archived = 0;

    for (const category of VALID_CATEGORIES) {
      const top = await this.getTopN(category, 10000, currentSeason);

      // DB rank 업데이트
      for (const entry of top) {
        await prisma.rankingEntry.updateMany({
          where: {
            userId: entry.userId,
            category,
            season: currentSeason,
          },
          data: { rank: entry.rank },
        });
        archived++;
      }

      // Redis 키 삭제 (새 시즌 시작)
      if (redisConnected) {
        try {
          await redisClient.del(redisKey(category, currentSeason));
        } catch {
          // 무시
        }
      }
    }

    console.log(`[Ranking] 시즌 리셋 완료: ${currentSeason} → ${newSeason}, ${archived}건 아카이브`);
    return { archived };
  }
}

// 싱글턴
export const rankingManager = new RankingManager();
