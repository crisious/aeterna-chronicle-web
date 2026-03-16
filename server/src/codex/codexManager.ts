/**
 * codexManager.ts — 도감/컬렉션 시스템 (P5-08)
 *
 * 역할:
 *   - 발견 등록 (첫 조우/획득 시 자동)
 *   - 카테고리별 완성도 계산
 *   - 완성 보상 (업적 엔진 연동)
 */

import { prisma } from '../db';
import { achievementEngine } from '../achievement/achievementEngine';

// ── 타입 정의 ──────────────────────────────────────────────────

/** 도감 카테고리 */
export type CodexCategory = 'monster' | 'item' | 'npc' | 'zone' | 'skill';

/** 발견 등록 결과 */
export interface DiscoverResult {
  isNew: boolean;
  category: CodexCategory;
  targetCode: string;
  percentage: number;
}

/** 카테고리별 완성도 */
export interface CompletionStats {
  category: CodexCategory;
  discovered: number;
  total: number;
  percentage: number;
}

/** 전체 완성도 요약 */
export interface CompletionSummary {
  categories: CompletionStats[];
  overallPercentage: number;
  totalDiscovered: number;
  totalEntries: number;
}

// ── 카테고리별 전체 엔트리 수 산출 ──────────────────────────────

/** 각 카테고리의 마스터 데이터 총 개수를 조회 */
async function getTotalCountByCategory(category: CodexCategory): Promise<number> {
  switch (category) {
    case 'monster':
      return prisma.monster.count();
    case 'item':
      return prisma.item.count();
    case 'npc':
      return prisma.npc.count();
    case 'zone':
      return prisma.zone.count();
    case 'skill':
      return prisma.skill.count();
    default:
      return 0;
  }
}

// ── 완성 보상 임계값 ────────────────────────────────────────────

/** 카테고리 완성도 보상 기준 (%) */
const COMPLETION_MILESTONES = [25, 50, 75, 100];

// ── 도감 매니저 ─────────────────────────────────────────────────

class CodexManager {
  /**
   * 도감 엔트리 발견 등록
   * - 이미 등록된 경우 percentage만 갱신
   * - 새 발견 시 업적 이벤트 발행
   */
  async discover(
    userId: string,
    category: CodexCategory,
    targetCode: string,
    percentage: number = 100,
  ): Promise<DiscoverResult> {
    // upsert: 이미 있으면 percentage 갱신, 없으면 새 등록
    const existing = await prisma.codexEntry.findUnique({
      where: {
        userId_category_targetCode: { userId, category, targetCode },
      },
    });

    if (existing) {
      // 진행도가 더 높은 경우만 갱신
      if (percentage > existing.percentage) {
        await prisma.codexEntry.update({
          where: { id: existing.id },
          data: { percentage, discovered: true },
        });
      }
      return { isNew: false, category, targetCode, percentage: Math.max(existing.percentage, percentage) };
    }

    // 새로운 발견
    await prisma.codexEntry.create({
      data: {
        userId,
        category,
        targetCode,
        discovered: true,
        percentage: Math.min(percentage, 100),
      },
    });

    // 업적 이벤트: 도감 발견 (카테고리별)
    await achievementEngine.check({
      userId,
      type: `codex_discover_${category}`,
      value: 1,
    });

    // 전체 도감 발견 업적
    await achievementEngine.check({
      userId,
      type: 'codex_discover',
      value: 1,
    });

    // 완성도 마일스톤 체크
    await this.checkCompletionMilestone(userId, category);

    return { isNew: true, category, targetCode, percentage: Math.min(percentage, 100) };
  }

  /**
   * 유저의 전체 도감 조회
   */
  async getAll(userId: string): Promise<Record<CodexCategory, { targetCode: string; percentage: number; unlockedAt: Date }[]>> {
    const entries = await prisma.codexEntry.findMany({
      where: { userId, discovered: true },
      orderBy: { unlockedAt: 'desc' },
    });

    const result: Record<string, { targetCode: string; percentage: number; unlockedAt: Date }[]> = {
      monster: [],
      item: [],
      npc: [],
      zone: [],
      skill: [],
    };

    for (const entry of entries) {
      if (result[entry.category]) {
        result[entry.category].push({
          targetCode: entry.targetCode,
          percentage: entry.percentage,
          unlockedAt: entry.unlockedAt,
        });
      }
    }

    return result as Record<CodexCategory, { targetCode: string; percentage: number; unlockedAt: Date }[]>;
  }

  /**
   * 특정 카테고리 도감 조회
   */
  async getByCategory(userId: string, category: CodexCategory) {
    return prisma.codexEntry.findMany({
      where: { userId, category, discovered: true },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  /**
   * 전체 완성도 계산
   */
  async getCompletion(userId: string): Promise<CompletionSummary> {
    const categories: CodexCategory[] = ['monster', 'item', 'npc', 'zone', 'skill'];
    const stats: CompletionStats[] = [];
    let totalDiscovered = 0;
    let totalEntries = 0;

    for (const cat of categories) {
      const [discovered, total] = await Promise.all([
        prisma.codexEntry.count({ where: { userId, category: cat, discovered: true } }),
        getTotalCountByCategory(cat),
      ]);

      const pct = total > 0 ? Math.round((discovered / total) * 10000) / 100 : 0;
      stats.push({ category: cat, discovered, total, percentage: pct });
      totalDiscovered += discovered;
      totalEntries += total;
    }

    const overallPercentage = totalEntries > 0
      ? Math.round((totalDiscovered / totalEntries) * 10000) / 100
      : 0;

    return {
      categories: stats,
      overallPercentage,
      totalDiscovered,
      totalEntries,
    };
  }

  /**
   * 완성도 마일스톤 달성 시 업적 이벤트 발행
   */
  private async checkCompletionMilestone(userId: string, category: CodexCategory): Promise<void> {
    const [discovered, total] = await Promise.all([
      prisma.codexEntry.count({ where: { userId, category, discovered: true } }),
      getTotalCountByCategory(category),
    ]);

    if (total === 0) return;

    const pct = (discovered / total) * 100;

    for (const milestone of COMPLETION_MILESTONES) {
      if (pct >= milestone) {
        // 업적 플래그: codex_monster_25, codex_item_50 등
        await achievementEngine.check({
          userId,
          type: `codex_${category}_completion`,
          value: pct,
          flag: `codex_${category}_${milestone}`,
        });
      }
    }
  }
}

export const codexManager = new CodexManager();
