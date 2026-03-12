/**
 * P14-08: 추천 시스템
 * 아이템/던전/퀘스트 개인화 추천
 * 협업 필터링 + 콘텐츠 기반 하이브리드
 *
 * API 엔드포인트: GET /api/recommendations/:type
 */

import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

export type RecommendationType = 'item' | 'dungeon' | 'quest';

export interface RecommendationItem {
  id: string;
  type: RecommendationType;
  name: string;
  score: number;             // 0~1 추천 점수
  reason: RecommendationReason;
  metadata: Record<string, unknown>;
}

export interface RecommendationReason {
  method: 'collaborative' | 'content_based' | 'popularity' | 'cold_start';
  description: string;
  confidence: number;        // 0~1
}

export interface UserProfile {
  userId: string;
  level: number;
  classId: string;
  completedQuests: string[];
  clearedDungeons: string[];
  ownedItems: string[];
  recentActions: UserAction[];
  guildId: string | null;
  seasonPassLevel: number;
  playTimeHours: number;
}

export interface UserAction {
  actionType: 'purchase' | 'use' | 'clear' | 'abandon' | 'equip';
  targetId: string;
  targetType: RecommendationType;
  timestamp: Date;
  rating?: number;           // 암시적 평점 (체류시간/반복횟수 기반)
}

/** 유저-아이템 매트릭스 셀 */
interface MatrixCell {
  userId: string;
  itemId: string;
  score: number;             // 암시적 평점
}

/** 콘텐츠 기반 필터링용 아이템 특성 */
interface ContentFeatures {
  id: string;
  type: RecommendationType;
  tags: string[];
  levelReq: number;
  classReq: string | null;
  difficulty: number;        // 0~1
  popularity: number;        // 일간 사용 수
}

/** 추천 요청 파라미터 */
export interface RecommendationRequest {
  userId: string;
  type: RecommendationType;
  limit?: number;
  excludeOwned?: boolean;
  minLevel?: number;
  maxLevel?: number;
}

/** 추천 응답 */
export interface RecommendationResponse {
  userId: string;
  type: RecommendationType;
  recommendations: RecommendationItem[];
  generatedAt: Date;
  strategy: string;          // 사용된 전략 설명
}

// ─── 설정 상수 ─────────────────────────────────────────────────

const DEFAULT_LIMIT = 10;
const COLD_START_THRESHOLD = 5;          // 이 액션 수 미만이면 콜드 스타트
const COLLABORATIVE_WEIGHT = 0.6;
const CONTENT_BASED_WEIGHT = 0.4;
const SIMILARITY_TOP_K = 20;             // 유사 유저 상위 K명
const DECAY_HALF_LIFE_DAYS = 14;         // 액션 점수 반감기
const MIN_SCORE_THRESHOLD = 0.05;        // 이 점수 이하 추천 제외
const POPULARITY_FALLBACK_DAYS = 7;      // 인기도 계산 기간

// ─── 추천 엔진 클래스 ──────────────────────────────────────────

export class RecommendationEngine {

  // ── 메인 추천 로직 ────────────────────────────────────────

  /**
   * 개인화 추천 생성 — 콜드 스타트 분기 + 하이브리드 결합
   */
  async getRecommendations(req: RecommendationRequest): Promise<RecommendationResponse> {
    const limit = req.limit ?? DEFAULT_LIMIT;
    const profile = await this.buildUserProfile(req.userId);

    // 콜드 스타트 체크
    if (profile.recentActions.length < COLD_START_THRESHOLD) {
      return this.coldStartRecommendations(profile, req.type, limit);
    }

    // 하이브리드 추천: 협업 필터링 + 콘텐츠 기반
    const [collabResults, contentResults] = await Promise.all([
      this.collaborativeFiltering(profile, req.type, limit * 2),
      this.contentBasedFiltering(profile, req.type, limit * 2),
    ]);

    // 점수 결합 (가중 평균)
    const merged = this.mergeRecommendations(collabResults, contentResults, limit);

    // 필터링 (이미 보유/완료 항목 제외)
    const filtered = req.excludeOwned !== false
      ? this.filterOwned(merged, profile, req.type)
      : merged;

    // 레벨 필터링
    const leveled = this.filterByLevel(filtered, req.minLevel, req.maxLevel);

    return {
      userId: req.userId,
      type: req.type,
      recommendations: leveled.slice(0, limit),
      generatedAt: new Date(),
      strategy: `hybrid(collab=${COLLABORATIVE_WEIGHT},content=${CONTENT_BASED_WEIGHT})`,
    };
  }

  // ── 협업 필터링 ───────────────────────────────────────────

  /**
   * 유저-아이템 매트릭스 기반 협업 필터링
   * 1. 대상 유저의 액션 벡터 구성
   * 2. 유사 유저 K명 선택 (코사인 유사도)
   * 3. 유사 유저들이 소비했지만 대상 유저는 안 한 항목 추천
   */
  private async collaborativeFiltering(
    profile: UserProfile,
    type: RecommendationType,
    limit: number,
  ): Promise<RecommendationItem[]> {
    // 1. 전체 유저-아이템 매트릭스 로드 (최근 활성 유저)
    const matrix = await this.loadUserItemMatrix(type);
    if (matrix.length === 0) return [];

    // 2. 대상 유저 벡터
    const userVector = this.buildUserVector(profile, matrix);
    if (Object.keys(userVector).length === 0) return [];

    // 3. 유사 유저 찾기
    const allUserIds = [...new Set(matrix.map(c => c.userId))].filter(id => id !== profile.userId);
    const similarities: { userId: string; similarity: number }[] = [];

    for (const otherId of allUserIds) {
      const otherVector = this.buildVectorForUser(otherId, matrix);
      const sim = this.cosineSimilarity(userVector, otherVector);
      if (sim > 0) similarities.push({ userId: otherId, similarity: sim });
    }

    similarities.sort((a, b) => b.similarity - a.similarity);
    const topK = similarities.slice(0, SIMILARITY_TOP_K);

    if (topK.length === 0) return [];

    // 4. 유사 유저의 아이템 점수 가중 합산
    const candidateScores = new Map<string, number>();
    const userOwnedSet = new Set(Object.keys(userVector));

    for (const { userId: simUserId, similarity } of topK) {
      const simVector = this.buildVectorForUser(simUserId, matrix);
      for (const [itemId, score] of Object.entries(simVector)) {
        if (userOwnedSet.has(itemId)) continue; // 이미 소유한 건 제외
        const current = candidateScores.get(itemId) ?? 0;
        candidateScores.set(itemId, current + score * similarity);
      }
    }

    // 5. 정렬 + 변환
    const sorted = [...candidateScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    const maxScore = sorted[0]?.[1] ?? 1;

    return sorted.map(([itemId, rawScore]) => ({
      id: itemId,
      type,
      name: itemId, // 실제로는 DB에서 이름 조회
      score: rawScore / maxScore,
      reason: {
        method: 'collaborative' as const,
        description: '비슷한 플레이 스타일의 유저들이 선호하는 항목',
        confidence: Math.min(1, topK.length / SIMILARITY_TOP_K),
      },
      metadata: { similarUsers: topK.length },
    }));
  }

  // ── 콘텐츠 기반 필터링 ───────────────────────────────────

  /**
   * 유저 프로필(레벨/클래스/진행도)과 아이템 특성 매칭
   */
  private async contentBasedFiltering(
    profile: UserProfile,
    type: RecommendationType,
    limit: number,
  ): Promise<RecommendationItem[]> {
    const allContent = await this.loadContentFeatures(type);

    const scored: { content: ContentFeatures; score: number }[] = [];

    for (const content of allContent) {
      let score = 0;

      // 레벨 적합성 (±10 레벨 범위, 정확히 맞으면 최고점)
      const levelDiff = Math.abs(profile.level - content.levelReq);
      const levelScore = Math.max(0, 1 - levelDiff / 20);
      score += levelScore * 0.3;

      // 클래스 적합성
      if (!content.classReq || content.classReq === profile.classId) {
        score += 0.2;
      }

      // 난이도 적합성 (진행도에 맞는 도전감)
      const progressRatio = profile.completedQuests.length / Math.max(1, profile.playTimeHours);
      const difficultyMatch = 1 - Math.abs(content.difficulty - Math.min(1, progressRatio));
      score += difficultyMatch * 0.2;

      // 인기도 보너스
      const popularityScore = Math.min(1, content.popularity / 100);
      score += popularityScore * 0.15;

      // 태그 매칭 (최근 액션의 타입 기반)
      const recentTargets = new Set(
        profile.recentActions
          .filter(a => a.targetType === type)
          .map(a => a.targetId),
      );
      const tagOverlap = content.tags.filter(t => recentTargets.has(t)).length;
      score += Math.min(0.15, tagOverlap * 0.05);

      scored.push({ content, score });
    }

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(({ content, score }) => ({
      id: content.id,
      type,
      name: content.id,
      score,
      reason: {
        method: 'content_based' as const,
        description: '플레이어 레벨/클래스/진행도에 적합한 콘텐츠',
        confidence: score,
      },
      metadata: {
        tags: content.tags,
        levelReq: content.levelReq,
        difficulty: content.difficulty,
      },
    }));
  }

  // ── 콜드 스타트 추천 ─────────────────────────────────────

  /**
   * 신규/저활동 유저용 — 인기도 + 레벨 적합성 기반
   */
  private async coldStartRecommendations(
    profile: UserProfile,
    type: RecommendationType,
    limit: number,
  ): Promise<RecommendationResponse> {
    const allContent = await this.loadContentFeatures(type);

    const candidates = allContent
      .filter(c => !c.classReq || c.classReq === profile.classId)
      .filter(c => c.levelReq <= profile.level + 5)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);

    return {
      userId: profile.userId,
      type,
      recommendations: candidates.map((c, i) => ({
        id: c.id,
        type,
        name: c.id,
        score: 1 - i / limit,
        reason: {
          method: 'cold_start' as const,
          description: '인기 콘텐츠 기반 추천 (활동 데이터 부족)',
          confidence: 0.5,
        },
        metadata: { popularity: c.popularity },
      })),
      generatedAt: new Date(),
      strategy: 'cold_start(popularity + level_match)',
    };
  }

  // ── 점수 결합 ─────────────────────────────────────────────

  /**
   * 협업 필터링 + 콘텐츠 기반 점수를 가중 결합
   */
  private mergeRecommendations(
    collab: RecommendationItem[],
    content: RecommendationItem[],
    limit: number,
  ): RecommendationItem[] {
    const scoreMap = new Map<string, {
      collabScore: number;
      contentScore: number;
      collabItem?: RecommendationItem;
      contentItem?: RecommendationItem;
    }>();

    for (const item of collab) {
      scoreMap.set(item.id, {
        collabScore: item.score,
        contentScore: 0,
        collabItem: item,
      });
    }

    for (const item of content) {
      const existing = scoreMap.get(item.id);
      if (existing) {
        existing.contentScore = item.score;
        existing.contentItem = item;
      } else {
        scoreMap.set(item.id, {
          collabScore: 0,
          contentScore: item.score,
          contentItem: item,
        });
      }
    }

    const merged: RecommendationItem[] = [];

    for (const [id, scores] of scoreMap) {
      const combinedScore =
        scores.collabScore * COLLABORATIVE_WEIGHT +
        scores.contentScore * CONTENT_BASED_WEIGHT;

      if (combinedScore < MIN_SCORE_THRESHOLD) continue;

      // 주 추천 사유: 점수가 높은 쪽
      const primary = scores.collabScore >= scores.contentScore
        ? scores.collabItem
        : scores.contentItem;

      if (!primary) continue;

      merged.push({
        ...primary,
        score: combinedScore,
        metadata: {
          ...primary.metadata,
          collabScore: scores.collabScore,
          contentScore: scores.contentScore,
        },
      });
    }

    merged.sort((a, b) => b.score - a.score);
    return merged.slice(0, limit);
  }

  // ── 필터링 유틸 ───────────────────────────────────────────

  private filterOwned(
    items: RecommendationItem[],
    profile: UserProfile,
    type: RecommendationType,
  ): RecommendationItem[] {
    const ownedSet = new Set<string>();
    if (type === 'item') profile.ownedItems.forEach(id => ownedSet.add(id));
    if (type === 'dungeon') profile.clearedDungeons.forEach(id => ownedSet.add(id));
    if (type === 'quest') profile.completedQuests.forEach(id => ownedSet.add(id));
    return items.filter(item => !ownedSet.has(item.id));
  }

  private filterByLevel(
    items: RecommendationItem[],
    minLevel?: number,
    maxLevel?: number,
  ): RecommendationItem[] {
    return items.filter(item => {
      const lvl = (item.metadata.levelReq as number | undefined) ?? 0;
      if (minLevel !== undefined && lvl < minLevel) return false;
      if (maxLevel !== undefined && lvl > maxLevel) return false;
      return true;
    });
  }

  // ── 데이터 로드 ───────────────────────────────────────────

  /**
   * 유저-아이템 매트릭스 로드 (최근 활성 유저 기준)
   * 시간 감쇠 적용
   */
  private async loadUserItemMatrix(type: RecommendationType): Promise<MatrixCell[]> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 60); // 최근 60일

    const actions = await prisma.userAction.findMany({
      where: {
        targetType: type,
        createdAt: { gte: sinceDate },
      },
      select: {
        userId: true,
        targetId: true,
        actionType: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50_000, // 성능 제한
    });

    const now = Date.now();
    return actions.map(a => ({
      userId: a.userId,
      itemId: a.targetId,
      score: this.timeDecayScore(a.actionType, a.createdAt, now),
    }));
  }

  /**
   * 시간 감쇠 + 액션 타입별 가중치
   */
  private timeDecayScore(actionType: string, createdAt: Date, now: number): number {
    const actionWeights: Record<string, number> = {
      purchase: 1.0,
      equip: 0.9,
      clear: 0.8,
      use: 0.6,
      abandon: -0.3,
    };
    const weight = actionWeights[actionType] ?? 0.5;
    const daysPassed = (now - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const decay = Math.pow(0.5, daysPassed / DECAY_HALF_LIFE_DAYS);
    return weight * decay;
  }

  /**
   * 콘텐츠 특성 로드 (타입별)
   */
  private async loadContentFeatures(type: RecommendationType): Promise<ContentFeatures[]> {
    switch (type) {
      case 'item': {
        const items = await prisma.item.findMany({
          where: { isActive: true },
          select: { id: true, tags: true, requiredLevel: true, classRestriction: true, dailyUsageCount: true },
        });
        return items.map(i => ({
          id: i.id,
          type: 'item',
          tags: (i.tags as string[] | null) ?? [],
          levelReq: i.requiredLevel ?? 0,
          classReq: i.classRestriction ?? null,
          difficulty: 0,
          popularity: i.dailyUsageCount ?? 0,
        }));
      }
      case 'dungeon': {
        const dungeons = await prisma.dungeon.findMany({
          where: { isActive: true },
          select: { id: true, tags: true, recommendedLevel: true, difficulty: true, dailyRunCount: true },
        });
        return dungeons.map(d => ({
          id: d.id,
          type: 'dungeon',
          tags: (d.tags as string[] | null) ?? [],
          levelReq: d.recommendedLevel ?? 0,
          classReq: null,
          difficulty: (d.difficulty ?? 5) / 10,
          popularity: d.dailyRunCount ?? 0,
        }));
      }
      case 'quest': {
        const quests = await prisma.quest.findMany({
          where: { isActive: true },
          select: { id: true, tags: true, requiredLevel: true, difficulty: true, dailyCompletionCount: true },
        });
        return quests.map(q => ({
          id: q.id,
          type: 'quest',
          tags: (q.tags as string[] | null) ?? [],
          levelReq: q.requiredLevel ?? 0,
          classReq: null,
          difficulty: (q.difficulty ?? 5) / 10,
          popularity: q.dailyCompletionCount ?? 0,
        }));
      }
    }
  }

  /**
   * 유저 프로필 구성
   */
  private async buildUserProfile(userId: string): Promise<UserProfile> {
    const [character, actions] = await Promise.all([
      prisma.character.findFirst({
        where: { userId },
        select: {
          level: true,
          classId: true,
          guildId: true,
          seasonPassLevel: true,
          playTimeHours: true,
        },
      }),
      prisma.userAction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    const completedQuests = await prisma.questCompletion.findMany({
      where: { userId },
      select: { questId: true },
    });
    const clearedDungeons = await prisma.dungeonClear.findMany({
      where: { userId },
      select: { dungeonId: true },
    });
    const ownedItems = await prisma.inventoryItem.findMany({
      where: { userId },
      select: { itemId: true },
    });

    return {
      userId,
      level: character?.level ?? 1,
      classId: character?.classId ?? '',
      completedQuests: completedQuests.map(q => q.questId),
      clearedDungeons: clearedDungeons.map(d => d.dungeonId),
      ownedItems: ownedItems.map(i => i.itemId),
      recentActions: actions.map(a => ({
        actionType: a.actionType as UserAction['actionType'],
        targetId: a.targetId,
        targetType: a.targetType as RecommendationType,
        timestamp: a.createdAt,
        rating: a.rating ?? undefined,
      })),
      guildId: character?.guildId ?? null,
      seasonPassLevel: character?.seasonPassLevel ?? 0,
      playTimeHours: character?.playTimeHours ?? 0,
    };
  }

  // ── 벡터 연산 유틸 ────────────────────────────────────────

  private buildUserVector(
    profile: UserProfile,
    matrix: MatrixCell[],
  ): Record<string, number> {
    const vector: Record<string, number> = {};
    for (const cell of matrix) {
      if (cell.userId === profile.userId) {
        vector[cell.itemId] = (vector[cell.itemId] ?? 0) + cell.score;
      }
    }
    return vector;
  }

  private buildVectorForUser(
    userId: string,
    matrix: MatrixCell[],
  ): Record<string, number> {
    const vector: Record<string, number> = {};
    for (const cell of matrix) {
      if (cell.userId === userId) {
        vector[cell.itemId] = (vector[cell.itemId] ?? 0) + cell.score;
      }
    }
    return vector;
  }

  /**
   * 코사인 유사도 (희소 벡터)
   */
  private cosineSimilarity(
    a: Record<string, number>,
    b: Record<string, number>,
  ): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of allKeys) {
      const va = a[key] ?? 0;
      const vb = b[key] ?? 0;
      dotProduct += va * vb;
      normA += va * va;
      normB += vb * vb;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}

// ── API 라우트 핸들러 ───────────────────────────────────────

const engine = new RecommendationEngine();

/**
 * GET /api/recommendations/:type
 * Query params: limit, excludeOwned, minLevel, maxLevel
 */
export async function handleGetRecommendations(
  userId: string,
  type: string,
  query: Record<string, string>,
): Promise<RecommendationResponse> {
  if (!['item', 'dungeon', 'quest'].includes(type)) {
    throw new Error(`유효하지 않은 추천 타입: ${type}`);
  }

  return engine.getRecommendations({
    userId,
    type: type as RecommendationType,
    limit: query.limit ? parseInt(query.limit, 10) : undefined,
    excludeOwned: query.excludeOwned !== 'false',
    minLevel: query.minLevel ? parseInt(query.minLevel, 10) : undefined,
    maxLevel: query.maxLevel ? parseInt(query.maxLevel, 10) : undefined,
  });
}

// ── 싱글턴 내보내기 ─────────────────────────────────────────

export const recommendationEngine = engine;
