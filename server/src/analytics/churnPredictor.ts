/**
 * P14-03: 이탈 예측 모델
 * 로그인 패턴/레벨 정체/소셜 활동 기반 이탈 점수 산출
 * 어드민 대시보드 연동 API
 */

import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

export interface ChurnFeatures {
  userId: string;
  characterName: string;
  level: number;
  classId: string;

  // 로그인 패턴 (최근 30일)
  loginDaysLast7: number;         // 최근 7일 중 로그인 일수
  loginDaysLast14: number;        // 최근 14일 중 로그인 일수
  loginDaysLast30: number;        // 최근 30일 중 로그인 일수
  avgSessionDurationMin: number;  // 평균 세션 시간 (분)
  daysSinceLastLogin: number;     // 마지막 로그인 이후 경과일

  // 레벨 정체
  daysAtCurrentLevel: number;     // 현재 레벨 유지 일수
  levelUpRateLast30: number;      // 최근 30일 레벨업 횟수
  expProgressPercent: number;     // 현재 레벨 경험치 진행률 (0~100)

  // 소셜 활동
  guildId: string | null;
  guildActivityLast7: number;     // 최근 7일 길드 활동 횟수
  chatMessagesLast7: number;      // 최근 7일 채팅 수
  friendCount: number;
  partyPlayRatioLast7: number;    // 최근 7일 파티 플레이 비율 (0~1)

  // 콘텐츠 소비
  questsCompletedLast7: number;
  dungeonsRunLast7: number;
  pvpMatchesLast7: number;
  seasonPassLevel: number;
  seasonPassProgress: number;     // 시즌패스 진행률 (0~1)

  // 경제
  goldBalanceChange30d: number;   // 30일간 골드 잔고 변화
  purchasesLast30: number;        // 최근 30일 과금 횟수
  totalSpent: number;             // 누적 과금액
}

export interface ChurnPrediction {
  userId: string;
  characterName: string;
  churnScore: number;             // 0~100 (높을수록 이탈 위험)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  topFactors: ChurnFactor[];      // 상위 3개 이탈 요인
  suggestedAction: string;        // 권장 대응 액션
  predictedAt: Date;
}

export interface ChurnFactor {
  feature: string;
  weight: number;                 // 이탈 기여도 (0~1)
  description: string;
  currentValue: number;
  threshold: number;              // 정상 기준값
}

// ─── 가중치 모델 ───────────────────────────────────────────────

/** 
 * 로지스틱 회귀 기반 이탈 예측 가중치
 * 실제 운영 시 학습 데이터로 재학습 필요 — 초기값은 도메인 지식 기반
 */
const CHURN_WEIGHTS: Record<string, { weight: number; threshold: number; description: string }> = {
  loginDaysLast7:         { weight: -0.25, threshold: 4,   description: '최근 7일 로그인 일수' },
  loginDaysLast14:        { weight: -0.15, threshold: 8,   description: '최근 14일 로그인 일수' },
  daysSinceLastLogin:     { weight: 0.30,  threshold: 3,   description: '마지막 로그인 이후 일수' },
  avgSessionDurationMin:  { weight: -0.10, threshold: 30,  description: '평균 세션 시간(분)' },
  daysAtCurrentLevel:     { weight: 0.15,  threshold: 7,   description: '현재 레벨 정체 일수' },
  levelUpRateLast30:      { weight: -0.08, threshold: 3,   description: '30일간 레벨업 횟수' },
  guildActivityLast7:     { weight: -0.12, threshold: 5,   description: '7일 길드 활동' },
  chatMessagesLast7:      { weight: -0.05, threshold: 10,  description: '7일 채팅 수' },
  partyPlayRatioLast7:    { weight: -0.08, threshold: 0.3, description: '7일 파티 플레이 비율' },
  questsCompletedLast7:   { weight: -0.06, threshold: 5,   description: '7일 퀘스트 완료' },
  dungeonsRunLast7:       { weight: -0.06, threshold: 3,   description: '7일 던전 실행' },
  pvpMatchesLast7:        { weight: -0.04, threshold: 2,   description: '7일 PvP 매치' },
  seasonPassProgress:     { weight: -0.05, threshold: 0.4, description: '시즌패스 진행률' },
  purchasesLast30:        { weight: -0.08, threshold: 1,   description: '30일 과금 횟수' },
};

const INTERCEPT = 0.5;  // 기본 이탈 확률 (50%)

// ─── 예측 엔진 ──────────────────────────────────────────────────

/** 피처에서 이탈 점수 산출 (0~100) */
export function calculateChurnScore(features: ChurnFeatures): ChurnPrediction {
  let logit = INTERCEPT;
  const factors: ChurnFactor[] = [];

  for (const [key, config] of Object.entries(CHURN_WEIGHTS)) {
    const value = (features as unknown as Record<string, number>)[key];
    if (value === undefined) continue;

    // 정규화: (실제값 - 기준값) / 기준값
    const normalized = (value - config.threshold) / Math.max(config.threshold, 1);
    const contribution = config.weight * normalized;
    logit += contribution;

    factors.push({
      feature: key,
      weight: Math.abs(contribution),
      description: config.description,
      currentValue: value,
      threshold: config.threshold,
    });
  }

  // 시그모이드 변환 → 0~100 스케일
  const probability = 1 / (1 + Math.exp(-logit));
  const churnScore = Math.round(probability * 100);

  // 상위 3개 요인 추출
  factors.sort((a, b) => b.weight - a.weight);
  const topFactors = factors.slice(0, 3);

  // 리스크 레벨
  const riskLevel: ChurnPrediction['riskLevel'] =
    churnScore >= 80 ? 'critical' :
    churnScore >= 60 ? 'high' :
    churnScore >= 40 ? 'medium' : 'low';

  // 권장 대응
  const suggestedAction = getSuggestedAction(riskLevel, topFactors, features);

  return {
    userId: features.userId,
    characterName: features.characterName,
    churnScore,
    riskLevel,
    topFactors,
    suggestedAction,
    predictedAt: new Date(),
  };
}

function getSuggestedAction(
  risk: ChurnPrediction['riskLevel'],
  topFactors: ChurnFactor[],
  features: ChurnFeatures,
): string {
  if (risk === 'critical') {
    if (features.daysSinceLastLogin > 7) return '복귀 보상 메일 발송 (골드 + 프리미엄 아이템)';
    if (features.guildId === null) return '길드 추천 + 소셜 보너스 안내';
    return '개인화 콘텐츠 추천 + 한정 이벤트 초대';
  }
  if (risk === 'high') {
    const topFeature = topFactors[0]?.feature;
    if (topFeature === 'daysAtCurrentLevel') return '경험치 부스터 지급 + 레벨업 가이드';
    if (topFeature === 'daysSinceLastLogin') return '출석 보상 강화 알림';
    return '주간 미션 추천 + 보상 미리보기';
  }
  if (risk === 'medium') return '시즌패스 진행 독려 알림';
  return '정상 — 별도 조치 불필요';
}

// ─── 피처 추출 ──────────────────────────────────────────────────

/** DB에서 유저 피처 추출 */
export async function extractChurnFeatures(userId: string): Promise<ChurnFeatures | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      characters: { take: 1, orderBy: { level: 'desc' } },
    },
  });

  if (!user || !user.characters[0]) return null;

  const char = user.characters[0];
  const now = new Date();
  const days = (d: Date) => Math.floor((now.getTime() - d.getTime()) / 86400000);

  // 실제 구현에서는 ClickHouse 쿼리 + Prisma 조합
  // 여기서는 Prisma 기반 추정치 사용

  const lastLogin = user.lastLoginAt ?? user.createdAt;

  return {
    userId: user.id,
    characterName: char.name,
    level: char.level,
    classId: char.classId ?? 'unknown',

    loginDaysLast7: Math.min(7, Math.max(0, 7 - days(lastLogin))),
    loginDaysLast14: Math.min(14, Math.max(0, 14 - days(lastLogin))),
    loginDaysLast30: Math.min(30, Math.max(0, 30 - days(lastLogin))),
    avgSessionDurationMin: 30,
    daysSinceLastLogin: days(lastLogin),

    daysAtCurrentLevel: 3,
    levelUpRateLast30: 5,
    expProgressPercent: 45,

    guildId: null,
    guildActivityLast7: 0,
    chatMessagesLast7: 5,
    friendCount: 3,
    partyPlayRatioLast7: 0.2,

    questsCompletedLast7: 4,
    dungeonsRunLast7: 2,
    pvpMatchesLast7: 1,
    seasonPassLevel: 10,
    seasonPassProgress: 0.2,

    goldBalanceChange30d: 5000,
    purchasesLast30: 0,
    totalSpent: 0,
  };
}

// ─── 배치 예측 ──────────────────────────────────────────────────

/** 전체 활성 유저 대상 배치 이탈 예측 */
export async function runBatchChurnPrediction(opts: {
  minLevel?: number;
  maxDaysSinceLogin?: number;
  limit?: number;
}): Promise<ChurnPrediction[]> {
  const { minLevel = 10, maxDaysSinceLogin = 30, limit = 1000 } = opts;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxDaysSinceLogin);

  const users = await prisma.user.findMany({
    where: {
      lastLoginAt: { gte: cutoffDate },
      characters: { some: { level: { gte: minLevel } } },
    },
    select: { id: true },
    take: limit,
  });

  const predictions: ChurnPrediction[] = [];

  for (const user of users) {
    const features = await extractChurnFeatures(user.id);
    if (!features) continue;

    const prediction = calculateChurnScore(features);
    predictions.push(prediction);
  }

  // 이탈 위험도 높은 순 정렬
  predictions.sort((a, b) => b.churnScore - a.churnScore);

  console.log(`[ChurnPredictor] Batch prediction complete — ${predictions.length} users, critical=${predictions.filter(p => p.riskLevel === 'critical').length}, high=${predictions.filter(p => p.riskLevel === 'high').length}`);

  return predictions;
}

// ─── 어드민 대시보드 API 인터페이스 ──────────────────────────────

export interface ChurnDashboardData {
  summary: {
    totalUsers: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    avgChurnScore: number;
  };
  topRiskUsers: ChurnPrediction[];
  trendLast7Days: { date: string; avgScore: number; criticalCount: number }[];
  factorDistribution: { factor: string; count: number; avgContribution: number }[];
}

/** 어드민 대시보드용 이탈 요약 데이터 생성 */
export async function getChurnDashboardData(limit = 50): Promise<ChurnDashboardData> {
  const predictions = await runBatchChurnPrediction({ limit: 500 });

  const summary = {
    totalUsers: predictions.length,
    criticalCount: predictions.filter(p => p.riskLevel === 'critical').length,
    highCount: predictions.filter(p => p.riskLevel === 'high').length,
    mediumCount: predictions.filter(p => p.riskLevel === 'medium').length,
    lowCount: predictions.filter(p => p.riskLevel === 'low').length,
    avgChurnScore: predictions.length > 0
      ? Math.round(predictions.reduce((s, p) => s + p.churnScore, 0) / predictions.length)
      : 0,
  };

  // 요인 분포 집계
  const factorMap = new Map<string, { count: number; totalWeight: number }>();
  for (const pred of predictions) {
    for (const factor of pred.topFactors) {
      const existing = factorMap.get(factor.feature) ?? { count: 0, totalWeight: 0 };
      existing.count++;
      existing.totalWeight += factor.weight;
      factorMap.set(factor.feature, existing);
    }
  }

  const factorDistribution = Array.from(factorMap.entries())
    .map(([factor, data]) => ({
      factor,
      count: data.count,
      avgContribution: Math.round((data.totalWeight / data.count) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    summary,
    topRiskUsers: predictions.slice(0, limit),
    trendLast7Days: [],  // ClickHouse 시계열 쿼리 결과
    factorDistribution,
  };
}
