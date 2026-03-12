/**
 * P14-10: A/B 테스트 프레임워크
 * 실험 생성/할당/결과 수집/통계 분석
 * Prisma 모델: ABExperiment, ABVariant, ABAssignment
 * 어드민 API (실험 CRUD + 결과 조회)
 */

import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived';
export type AssignmentMethod = 'random' | 'user_id_hash' | 'stratified';

export interface ABExperiment {
  id: string;
  name: string;
  description: string;
  /** 실험 대상 기능 키 (예: 'shop_layout', 'dungeon_reward_v2') */
  featureKey: string;
  status: ExperimentStatus;
  /** 트래픽 비율 (0~1): 전체 유저 중 실험 참여 비율 */
  trafficPercent: number;
  assignmentMethod: AssignmentMethod;
  /** 시작/종료 예정 */
  startDate: Date | null;
  endDate: Date | null;
  /** 최소 표본 크기 (유의성 판정 기준) */
  minSampleSize: number;
  /** 유의수준 (기본 0.05) */
  significanceLevel: number;
  variants: ABVariant[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ABVariant {
  id: string;
  experimentId: string;
  name: string;                 // 'control', 'variant_a', 'variant_b', ...
  description: string;
  /** 변형 내 트래픽 가중치 (모든 변형 가중치 합 = 1) */
  weight: number;
  /** 변형 설정값 (JSON) */
  config: Record<string, unknown>;
  /** 통계 집계 */
  stats: VariantStats;
}

export interface VariantStats {
  participants: number;
  conversions: number;
  conversionRate: number;       // 0~1
  avgMetricValue: number;       // 핵심 지표 평균
  metricSum: number;
  metricSamples: number;
}

export interface ABAssignment {
  id: string;
  experimentId: string;
  variantId: string;
  userId: string;
  assignedAt: Date;
  /** 전환(성공) 여부 */
  converted: boolean;
  convertedAt: Date | null;
  /** 실험 지표 값 (예: 매출, 체류시간 등) */
  metricValue: number | null;
}

/** 실험 결과 요약 */
export interface ExperimentResult {
  experimentId: string;
  experimentName: string;
  status: ExperimentStatus;
  totalParticipants: number;
  variants: VariantResult[];
  winner: string | null;           // 승리 변형 ID (null = 아직 미판정)
  isSignificant: boolean;
  pValue: number | null;
  confidenceLevel: number;
  analysisNote: string;
}

export interface VariantResult {
  variantId: string;
  variantName: string;
  participants: number;
  conversions: number;
  conversionRate: number;
  avgMetricValue: number;
  uplift: number;                  // 대조군 대비 변화율 (%)
  isControl: boolean;
}

/** 실험 생성 요청 */
export interface CreateExperimentRequest {
  name: string;
  description: string;
  featureKey: string;
  trafficPercent: number;
  assignmentMethod?: AssignmentMethod;
  startDate?: Date;
  endDate?: Date;
  minSampleSize?: number;
  significanceLevel?: number;
  variants: {
    name: string;
    description: string;
    weight: number;
    config: Record<string, unknown>;
  }[];
  createdBy: string;
}

/** 이벤트 수집 요청 */
export interface TrackEventRequest {
  experimentId: string;
  userId: string;
  converted?: boolean;
  metricValue?: number;
}

// ─── 상수 ───────────────────────────────────────────────────

const DEFAULT_SIGNIFICANCE_LEVEL = 0.05;
const DEFAULT_MIN_SAMPLE_SIZE = 500;
const DEFAULT_TRAFFIC_PERCENT = 1.0;

// ─── A/B 테스트 매니저 ─────────────────────────────────────────

export class ABTestManager {

  // ── 실험 CRUD ─────────────────────────────────────────────

  /**
   * 실험 생성
   */
  async createExperiment(req: CreateExperimentRequest): Promise<ABExperiment> {
    // 가중치 합 검증
    const totalWeight = req.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      throw new Error(`변형 가중치 합이 1이 아닙니다: ${totalWeight}`);
    }

    if (req.variants.length < 2) {
      throw new Error('최소 2개 변형(대조군 + 실험군)이 필요합니다.');
    }

    // featureKey 중복 검사 (활성 실험 내)
    const existing = await prisma.aBExperiment.findFirst({
      where: { featureKey: req.featureKey, status: { in: ['running', 'draft'] } },
    });
    if (existing) {
      throw new Error(`동일 featureKey로 활성 실험 존재: ${existing.id}`);
    }

    const experiment = await prisma.aBExperiment.create({
      data: {
        name: req.name,
        description: req.description,
        featureKey: req.featureKey,
        status: 'draft',
        trafficPercent: req.trafficPercent ?? DEFAULT_TRAFFIC_PERCENT,
        assignmentMethod: req.assignmentMethod ?? 'user_id_hash',
        startDate: req.startDate ?? null,
        endDate: req.endDate ?? null,
        minSampleSize: req.minSampleSize ?? DEFAULT_MIN_SAMPLE_SIZE,
        significanceLevel: req.significanceLevel ?? DEFAULT_SIGNIFICANCE_LEVEL,
        createdBy: req.createdBy,
        variants: {
          create: req.variants.map(v => ({
            name: v.name,
            description: v.description,
            weight: v.weight,
            config: v.config as any,
          })),
        },
      },
      include: { variants: true },
    });

    return this.mapExperiment(experiment);
  }

  /**
   * 실험 시작 (draft → running)
   */
  async startExperiment(experimentId: string): Promise<ABExperiment> {
    const exp = await prisma.aBExperiment.update({
      where: { id: experimentId },
      data: { status: 'running', startDate: new Date() },
      include: { variants: true },
    });
    return this.mapExperiment(exp);
  }

  /**
   * 실험 일시중지
   */
  async pauseExperiment(experimentId: string): Promise<ABExperiment> {
    const exp = await prisma.aBExperiment.update({
      where: { id: experimentId },
      data: { status: 'paused' },
      include: { variants: true },
    });
    return this.mapExperiment(exp);
  }

  /**
   * 실험 완료
   */
  async completeExperiment(experimentId: string): Promise<ABExperiment> {
    const exp = await prisma.aBExperiment.update({
      where: { id: experimentId },
      data: { status: 'completed', endDate: new Date() },
      include: { variants: true },
    });
    return this.mapExperiment(exp);
  }

  /**
   * 실험 목록 조회
   */
  async listExperiments(filters?: {
    status?: ExperimentStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ experiments: ABExperiment[]; total: number }> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;

    const [experiments, total] = await Promise.all([
      prisma.aBExperiment.findMany({
        where,
        include: { variants: true },
        orderBy: { createdAt: 'desc' },
        take: filters?.limit ?? 20,
        skip: filters?.offset ?? 0,
      }),
      prisma.aBExperiment.count({ where }),
    ]);

    return {
      experiments: experiments.map(e => this.mapExperiment(e)),
      total,
    };
  }

  // ── 유저 할당 ─────────────────────────────────────────────

  /**
   * 유저를 실험 변형에 할당 (또는 기존 할당 반환)
   * 게임 클라이언트가 featureKey로 호출
   */
  async assignUser(featureKey: string, userId: string): Promise<{
    experimentId: string;
    variantId: string;
    variantName: string;
    config: Record<string, unknown>;
  } | null> {
    // 활성 실험 찾기
    const experiment = await prisma.aBExperiment.findFirst({
      where: { featureKey, status: 'running' },
      include: { variants: true },
    });

    if (!experiment) return null;

    // 트래픽 비율 체크 (해시 기반 결정론적 분할)
    const trafficHash = this.hashUserId(userId, experiment.id + '_traffic');
    if (trafficHash > experiment.trafficPercent) return null;

    // 기존 할당 확인
    const existing = await prisma.aBAssignment.findUnique({
      where: { experimentId_userId: { experimentId: experiment.id, userId } },
    });

    if (existing) {
      const variant = experiment.variants.find(v => v.id === existing.variantId);
      return variant ? {
        experimentId: experiment.id,
        variantId: variant.id,
        variantName: variant.name,
        config: variant.config as Record<string, unknown>,
      } : null;
    }

    // 새 할당
    const variant = this.selectVariant(experiment, userId);
    if (!variant) return null;

    await prisma.aBAssignment.create({
      data: {
        experimentId: experiment.id,
        variantId: variant.id,
        userId,
      },
    });

    return {
      experimentId: experiment.id,
      variantId: variant.id,
      variantName: variant.name,
      config: variant.config as Record<string, unknown>,
    };
  }

  /**
   * 변형 선택 (할당 방식별 분기)
   */
  private selectVariant(experiment: any, userId: string): any | null {
    const variants = experiment.variants;
    if (variants.length === 0) return null;

    const method = experiment.assignmentMethod as AssignmentMethod;

    switch (method) {
      case 'user_id_hash': {
        // 결정론적 해시 기반 — 같은 유저는 항상 같은 변형
        const hash = this.hashUserId(userId, experiment.id);
        let cumulative = 0;
        for (const v of variants) {
          cumulative += v.weight;
          if (hash <= cumulative) return v;
        }
        return variants[variants.length - 1];
      }
      case 'random': {
        const roll = Math.random();
        let cumulative = 0;
        for (const v of variants) {
          cumulative += v.weight;
          if (roll <= cumulative) return v;
        }
        return variants[variants.length - 1];
      }
      case 'stratified':
        // 층화 추출 — 현재 가장 참여자 적은 변형에 할당
        variants.sort((a: any, b: any) => {
          const aCount = a._count?.assignments ?? 0;
          const bCount = b._count?.assignments ?? 0;
          return aCount - bCount;
        });
        return variants[0];
    }
  }

  /**
   * 결정론적 해시 (userId + salt → 0~1)
   */
  private hashUserId(userId: string, salt: string): number {
    const str = userId + ':' + salt;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // 32bit int
    }
    return Math.abs(hash) / 2147483647; // normalize to 0~1
  }

  // ── 이벤트 수집 ──────────────────────────────────────────

  /**
   * 전환/지표 이벤트 기록
   */
  async trackEvent(req: TrackEventRequest): Promise<void> {
    const assignment = await prisma.aBAssignment.findUnique({
      where: { experimentId_userId: { experimentId: req.experimentId, userId: req.userId } },
    });

    if (!assignment) return; // 할당되지 않은 유저

    const updateData: any = {};
    if (req.converted !== undefined) {
      updateData.converted = req.converted;
      updateData.convertedAt = req.converted ? new Date() : null;
    }
    if (req.metricValue !== undefined) {
      updateData.metricValue = req.metricValue;
    }

    await prisma.aBAssignment.update({
      where: { id: assignment.id },
      data: updateData,
    });
  }

  // ── 통계 분석 ─────────────────────────────────────────────

  /**
   * 실험 결과 분석 — 변형별 통계 + 유의성 검정
   */
  async analyzeExperiment(experimentId: string): Promise<ExperimentResult> {
    const experiment = await prisma.aBExperiment.findUnique({
      where: { id: experimentId },
      include: { variants: true },
    });

    if (!experiment) throw new Error(`실험을 찾을 수 없습니다: ${experimentId}`);

    // 변형별 집계
    const variantResults: VariantResult[] = [];
    let controlResult: VariantResult | null = null;
    let totalParticipants = 0;

    for (const variant of experiment.variants) {
      const assignments = await prisma.aBAssignment.findMany({
        where: { experimentId, variantId: variant.id },
      });

      const participants = assignments.length;
      const conversions = assignments.filter(a => a.converted).length;
      const conversionRate = participants > 0 ? conversions / participants : 0;
      const metrics = assignments.filter(a => a.metricValue !== null).map(a => a.metricValue!);
      const avgMetricValue = metrics.length > 0
        ? metrics.reduce((s, v) => s + v, 0) / metrics.length
        : 0;

      totalParticipants += participants;

      const result: VariantResult = {
        variantId: variant.id,
        variantName: variant.name,
        participants,
        conversions,
        conversionRate,
        avgMetricValue,
        uplift: 0, // 대조군 대비 — 아래에서 계산
        isControl: variant.name === 'control',
      };

      if (variant.name === 'control') controlResult = result;
      variantResults.push(result);
    }

    // uplift 계산 (대조군 대비)
    if (controlResult && controlResult.conversionRate > 0) {
      for (const vr of variantResults) {
        if (!vr.isControl) {
          vr.uplift = Math.round(
            ((vr.conversionRate - controlResult.conversionRate) / controlResult.conversionRate) * 10000,
          ) / 100;
        }
      }
    }

    // 유의성 검정 (z-test for proportions)
    let isSignificant = false;
    let pValue: number | null = null;
    let winner: string | null = null;

    if (controlResult && variantResults.length === 2 && totalParticipants >= experiment.minSampleSize) {
      const treatment = variantResults.find(v => !v.isControl)!;
      const zTestResult = this.zTestProportions(
        controlResult.conversions, controlResult.participants,
        treatment.conversions, treatment.participants,
      );

      pValue = zTestResult.pValue;
      isSignificant = pValue < experiment.significanceLevel;

      if (isSignificant) {
        winner = treatment.conversionRate > controlResult.conversionRate
          ? treatment.variantId
          : controlResult.variantId;
      }
    }

    // 다변량 실험 (3+ 변형) — 각 쌍별 검정
    if (variantResults.length > 2 && controlResult) {
      const significantVariants: VariantResult[] = [];

      for (const vr of variantResults) {
        if (vr.isControl) continue;
        const test = this.zTestProportions(
          controlResult.conversions, controlResult.participants,
          vr.conversions, vr.participants,
        );
        if (test.pValue < (experiment.significanceLevel / (variantResults.length - 1))) { // Bonferroni 보정
          significantVariants.push(vr);
        }
      }

      if (significantVariants.length > 0) {
        isSignificant = true;
        winner = significantVariants.sort((a, b) => b.conversionRate - a.conversionRate)[0].variantId;
      }
    }

    const analysisNote = this.buildAnalysisNote(totalParticipants, experiment.minSampleSize, isSignificant, pValue);

    return {
      experimentId,
      experimentName: experiment.name,
      status: experiment.status as ExperimentStatus,
      totalParticipants,
      variants: variantResults,
      winner,
      isSignificant,
      pValue,
      confidenceLevel: 1 - (experiment.significanceLevel ?? DEFAULT_SIGNIFICANCE_LEVEL),
      analysisNote,
    };
  }

  /**
   * 두 비율의 z-검정 (양측 검정)
   */
  private zTestProportions(
    successA: number, nA: number,
    successB: number, nB: number,
  ): { zScore: number; pValue: number } {
    if (nA === 0 || nB === 0) return { zScore: 0, pValue: 1 };

    const pA = successA / nA;
    const pB = successB / nB;
    const pPooled = (successA + successB) / (nA + nB);
    const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / nA + 1 / nB));

    if (se === 0) return { zScore: 0, pValue: 1 };

    const zScore = (pA - pB) / se;
    // 양측 검정 p-값 근사 (표준 정규 CDF)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));

    return { zScore, pValue };
  }

  /**
   * 표준 정규분포 CDF 근사 (Abramowitz & Stegun)
   */
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.SQRT2;

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  private buildAnalysisNote(
    total: number,
    minSample: number,
    isSignificant: boolean,
    pValue: number | null,
  ): string {
    if (total < minSample) {
      return `표본 부족 (${total}/${minSample}). 최소 ${minSample - total}명 추가 필요.`;
    }
    if (!isSignificant) {
      return `통계적 유의성 미달 (p=${pValue?.toFixed(4) ?? 'N/A'}). 실험 계속 진행 권장.`;
    }
    return `통계적 유의 (p=${pValue?.toFixed(4)}). 승리 변형 적용 가능.`;
  }

  // ── 유틸 ──────────────────────────────────────────────────

  private mapExperiment(raw: any): ABExperiment {
    return {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      featureKey: raw.featureKey,
      status: raw.status as ExperimentStatus,
      trafficPercent: raw.trafficPercent,
      assignmentMethod: raw.assignmentMethod as AssignmentMethod,
      startDate: raw.startDate,
      endDate: raw.endDate,
      minSampleSize: raw.minSampleSize,
      significanceLevel: raw.significanceLevel,
      variants: (raw.variants ?? []).map((v: any) => ({
        id: v.id,
        experimentId: v.experimentId,
        name: v.name,
        description: v.description,
        weight: v.weight,
        config: v.config as Record<string, unknown>,
        stats: {
          participants: 0,
          conversions: 0,
          conversionRate: 0,
          avgMetricValue: 0,
          metricSum: 0,
          metricSamples: 0,
        },
      })),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      createdBy: raw.createdBy,
    };
  }
}

// ── 싱글턴 ──────────────────────────────────────────────────

export const abTestManager = new ABTestManager();
