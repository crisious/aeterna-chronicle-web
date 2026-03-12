/**
 * P14-09: 밸런스 자동 조정
 * 승률/클리어율/평균 플레이시간 기반 튜닝
 * 자동 제안 (어드민 승인 후 적용)
 * 스킬/몬스터/던전 난이도 파라미터 대상
 */

import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

export type BalanceTarget = 'skill' | 'monster' | 'dungeon';
export type TuningStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'reverted';

export interface BalanceMetrics {
  targetId: string;
  targetType: BalanceTarget;
  targetName: string;

  // 핵심 지표
  winRate: number;              // 승률 (0~1) — PvP/보스전
  clearRate: number;            // 클리어율 (0~1) — 던전/퀘스트
  avgPlayTimeMin: number;       // 평균 플레이시간 (분)
  sampleSize: number;           // 표본 크기

  // 보조 지표
  usageRate: number;            // 사용률 (0~1) — 스킬/클래스 선택 비율
  abandonRate: number;          // 이탈률 (0~1) — 콘텐츠 포기 비율
  playerSatisfaction: number;   // 만족도 추정 (0~1) — 반복 이용률 기반

  // 기간
  periodDays: number;
  calculatedAt: Date;
}

export interface TuningProposal {
  id: string;
  targetId: string;
  targetType: BalanceTarget;
  targetName: string;

  // 변경 내용
  parameter: string;            // 변경 대상 파라미터 (예: 'damage', 'hp', 'dropRate')
  currentValue: number;
  proposedValue: number;
  changePercent: number;        // 변경률 (%)

  // 근거
  reason: string;
  metrics: BalanceMetrics;
  confidence: number;           // 0~1 제안 신뢰도
  priority: 'low' | 'medium' | 'high' | 'critical';

  // 상태
  status: TuningStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  appliedAt: Date | null;
}

/** 밸런스 목표 범위 */
interface BalanceObjective {
  targetType: BalanceTarget;
  metric: keyof Pick<BalanceMetrics, 'winRate' | 'clearRate' | 'avgPlayTimeMin' | 'usageRate'>;
  idealMin: number;
  idealMax: number;
  /** 이 범위 밖이면 critical */
  criticalMin: number;
  criticalMax: number;
}

/** 파라미터 조정 규칙 */
interface TuningRule {
  targetType: BalanceTarget;
  metric: string;
  condition: 'above_max' | 'below_min';
  parameter: string;
  adjustPercent: number;        // + = 증가, - = 감소
  maxAdjustPercent: number;     // 한 번에 최대 조정 범위
}

// ─── 밸런스 목표 정의 ──────────────────────────────────────────

const BALANCE_OBJECTIVES: BalanceObjective[] = [
  // 스킬: 사용률 15~35% (클래스 내 균등 분포 목표)
  { targetType: 'skill', metric: 'usageRate',      idealMin: 0.15, idealMax: 0.35, criticalMin: 0.05, criticalMax: 0.60 },
  // 스킬: PvP 승률 45~55%
  { targetType: 'skill', metric: 'winRate',         idealMin: 0.45, idealMax: 0.55, criticalMin: 0.35, criticalMax: 0.65 },

  // 몬스터: 클리어율 60~85%
  { targetType: 'monster', metric: 'clearRate',     idealMin: 0.60, idealMax: 0.85, criticalMin: 0.40, criticalMax: 0.95 },
  // 몬스터: 평균 전투 시간 1~5분
  { targetType: 'monster', metric: 'avgPlayTimeMin', idealMin: 1, idealMax: 5, criticalMin: 0.3, criticalMax: 10 },

  // 던전: 클리어율 40~70%
  { targetType: 'dungeon', metric: 'clearRate',     idealMin: 0.40, idealMax: 0.70, criticalMin: 0.20, criticalMax: 0.90 },
  // 던전: 평균 클리어 시간 15~40분
  { targetType: 'dungeon', metric: 'avgPlayTimeMin', idealMin: 15, idealMax: 40, criticalMin: 5, criticalMax: 60 },
];

/** 자동 조정 규칙 */
const TUNING_RULES: TuningRule[] = [
  // 스킬 사용률 너무 높음 → 데미지 감소
  { targetType: 'skill', metric: 'usageRate', condition: 'above_max', parameter: 'damage',    adjustPercent: -5,  maxAdjustPercent: 15 },
  // 스킬 사용률 너무 낮음 → 데미지 증가
  { targetType: 'skill', metric: 'usageRate', condition: 'below_min', parameter: 'damage',    adjustPercent: 5,   maxAdjustPercent: 15 },
  // 스킬 승률 너무 높음 → 쿨타임 증가
  { targetType: 'skill', metric: 'winRate',   condition: 'above_max', parameter: 'cooldown',  adjustPercent: 10,  maxAdjustPercent: 25 },
  // 스킬 승률 너무 낮음 → 쿨타임 감소
  { targetType: 'skill', metric: 'winRate',   condition: 'below_min', parameter: 'cooldown',  adjustPercent: -8,  maxAdjustPercent: 20 },

  // 몬스터 클리어율 너무 높음 → HP 증가
  { targetType: 'monster', metric: 'clearRate', condition: 'above_max', parameter: 'hp',      adjustPercent: 8,   maxAdjustPercent: 20 },
  // 몬스터 클리어율 너무 낮음 → HP 감소
  { targetType: 'monster', metric: 'clearRate', condition: 'below_min', parameter: 'hp',      adjustPercent: -8,  maxAdjustPercent: 20 },
  // 몬스터 전투 너무 길음 → 데미지 감소
  { targetType: 'monster', metric: 'avgPlayTimeMin', condition: 'above_max', parameter: 'damage', adjustPercent: -5, maxAdjustPercent: 15 },

  // 던전 클리어율 너무 높음 → 난이도 증가
  { targetType: 'dungeon', metric: 'clearRate', condition: 'above_max', parameter: 'difficultyMultiplier', adjustPercent: 10, maxAdjustPercent: 25 },
  // 던전 클리어율 너무 낮음 → 난이도 감소
  { targetType: 'dungeon', metric: 'clearRate', condition: 'below_min', parameter: 'difficultyMultiplier', adjustPercent: -10, maxAdjustPercent: 25 },
];

// ─── 상수 ───────────────────────────────────────────────────

const MIN_SAMPLE_SIZE = 100;            // 최소 표본 크기 (미달 시 제안 보류)
const DEFAULT_ANALYSIS_PERIOD_DAYS = 7;
const MAX_PENDING_PROPOSALS = 50;       // 최대 미처리 제안 수

// ─── 밸런스 자동 조정기 ────────────────────────────────────────

export class BalanceAutoTuner {

  // ── 분석 + 제안 생성 ─────────────────────────────────────

  /**
   * 전체 밸런스 분석 실행 — 주기적(일/주) 호출
   * 각 타겟에 대해 메트릭 수집 → 목표 벗어남 감지 → 제안 생성
   */
  async runAnalysis(periodDays: number = DEFAULT_ANALYSIS_PERIOD_DAYS): Promise<TuningProposal[]> {
    const proposals: TuningProposal[] = [];

    // 기존 pending 제안이 너무 많으면 경고
    const pendingCount = await prisma.tuningProposal.count({ where: { status: 'pending' } });
    if (pendingCount >= MAX_PENDING_PROPOSALS) {
      console.warn(`[BalanceAutoTuner] 미처리 제안 ${pendingCount}건 — 어드민 리뷰 필요`);
    }

    // 타겟 타입별 분석
    for (const targetType of ['skill', 'monster', 'dungeon'] as BalanceTarget[]) {
      const metrics = await this.collectMetrics(targetType, periodDays);

      for (const metric of metrics) {
        if (metric.sampleSize < MIN_SAMPLE_SIZE) continue; // 표본 부족

        const targetProposals = this.evaluateMetric(metric);
        proposals.push(...targetProposals);
      }
    }

    // DB에 제안 저장
    if (proposals.length > 0) {
      await prisma.tuningProposal.createMany({
        data: proposals.map(p => ({
          id: p.id,
          targetId: p.targetId,
          targetType: p.targetType,
          targetName: p.targetName,
          parameter: p.parameter,
          currentValue: p.currentValue,
          proposedValue: p.proposedValue,
          changePercent: p.changePercent,
          reason: p.reason,
          metrics: p.metrics as any,
          confidence: p.confidence,
          priority: p.priority,
          status: 'pending',
        })),
      });
    }

    console.log(`[BalanceAutoTuner] 분석 완료: ${metrics.length ?? '?'}개 타겟, ${proposals.length}개 제안 생성`);
    return proposals;
  }

  // ── 메트릭 수집 ──────────────────────────────────────────

  /**
   * 타겟 타입별 밸런스 메트릭 수집
   */
  private async collectMetrics(
    targetType: BalanceTarget,
    periodDays: number,
  ): Promise<BalanceMetrics[]> {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    switch (targetType) {
      case 'skill':
        return this.collectSkillMetrics(since, periodDays);
      case 'monster':
        return this.collectMonsterMetrics(since, periodDays);
      case 'dungeon':
        return this.collectDungeonMetrics(since, periodDays);
    }
  }

  private async collectSkillMetrics(since: Date, periodDays: number): Promise<BalanceMetrics[]> {
    const skills = await prisma.skill.findMany({ where: { isActive: true } });
    const results: BalanceMetrics[] = [];

    for (const skill of skills) {
      const stats = await prisma.skillUsageStat.aggregate({
        where: { skillId: skill.id, createdAt: { gte: since } },
        _count: true,
        _avg: { winRate: true, playTimeMin: true },
      });

      const totalUsage = await prisma.skillUsageStat.count({
        where: { createdAt: { gte: since } },
      });

      results.push({
        targetId: skill.id,
        targetType: 'skill',
        targetName: skill.name,
        winRate: stats._avg.winRate ?? 0.5,
        clearRate: 0,
        avgPlayTimeMin: stats._avg.playTimeMin ?? 0,
        sampleSize: stats._count,
        usageRate: totalUsage > 0 ? stats._count / totalUsage : 0,
        abandonRate: 0,
        playerSatisfaction: 0.5,
        periodDays,
        calculatedAt: new Date(),
      });
    }

    return results;
  }

  private async collectMonsterMetrics(since: Date, periodDays: number): Promise<BalanceMetrics[]> {
    const monsters = await prisma.monster.findMany({ where: { isActive: true } });
    const results: BalanceMetrics[] = [];

    for (const monster of monsters) {
      const stats = await prisma.combatLog.aggregate({
        where: { targetId: monster.id, targetType: 'monster', createdAt: { gte: since } },
        _count: true,
        _avg: { durationMin: true },
      });

      const clears = await prisma.combatLog.count({
        where: { targetId: monster.id, targetType: 'monster', result: 'victory', createdAt: { gte: since } },
      });

      results.push({
        targetId: monster.id,
        targetType: 'monster',
        targetName: monster.name,
        winRate: 0,
        clearRate: stats._count > 0 ? clears / stats._count : 0,
        avgPlayTimeMin: stats._avg.durationMin ?? 0,
        sampleSize: stats._count,
        usageRate: 0,
        abandonRate: 0,
        playerSatisfaction: 0.5,
        periodDays,
        calculatedAt: new Date(),
      });
    }

    return results;
  }

  private async collectDungeonMetrics(since: Date, periodDays: number): Promise<BalanceMetrics[]> {
    const dungeons = await prisma.dungeon.findMany({ where: { isActive: true } });
    const results: BalanceMetrics[] = [];

    for (const dungeon of dungeons) {
      const stats = await prisma.dungeonRun.aggregate({
        where: { dungeonId: dungeon.id, createdAt: { gte: since } },
        _count: true,
        _avg: { durationMin: true },
      });

      const clears = await prisma.dungeonRun.count({
        where: { dungeonId: dungeon.id, result: 'cleared', createdAt: { gte: since } },
      });

      const abandons = await prisma.dungeonRun.count({
        where: { dungeonId: dungeon.id, result: 'abandoned', createdAt: { gte: since } },
      });

      results.push({
        targetId: dungeon.id,
        targetType: 'dungeon',
        targetName: dungeon.name,
        winRate: 0,
        clearRate: stats._count > 0 ? clears / stats._count : 0,
        avgPlayTimeMin: stats._avg.durationMin ?? 0,
        sampleSize: stats._count,
        usageRate: 0,
        abandonRate: stats._count > 0 ? abandons / stats._count : 0,
        playerSatisfaction: stats._count > 0 ? clears / stats._count : 0.5,
        periodDays,
        calculatedAt: new Date(),
      });
    }

    return results;
  }

  // ── 목표 평가 + 제안 생성 ────────────────────────────────

  /**
   * 메트릭을 목표 범위와 비교하여 조정 제안 생성
   */
  private evaluateMetric(metric: BalanceMetrics): TuningProposal[] {
    const proposals: TuningProposal[] = [];
    const objectives = BALANCE_OBJECTIVES.filter(o => o.targetType === metric.targetType);

    for (const obj of objectives) {
      const value = metric[obj.metric] as number;
      let condition: 'above_max' | 'below_min' | null = null;

      if (value > obj.idealMax) condition = 'above_max';
      else if (value < obj.idealMin) condition = 'below_min';
      else continue; // 범위 내 — 조정 불필요

      // 심각도 판정
      const isCritical = value > obj.criticalMax || value < obj.criticalMin;
      const priority = isCritical ? 'critical' : (Math.abs(value - (obj.idealMin + obj.idealMax) / 2) > (obj.idealMax - obj.idealMin) ? 'high' : 'medium');

      // 매칭되는 조정 규칙 찾기
      const rules = TUNING_RULES.filter(
        r => r.targetType === metric.targetType && r.metric === obj.metric && r.condition === condition,
      );

      for (const rule of rules) {
        // 편차 비율에 따라 조정 강도 스케일링
        const deviation = condition === 'above_max'
          ? (value - obj.idealMax) / (obj.criticalMax - obj.idealMax)
          : (obj.idealMin - value) / (obj.idealMin - obj.criticalMin);

        const scaledAdjust = Math.min(
          Math.abs(rule.maxAdjustPercent),
          Math.abs(rule.adjustPercent) * Math.max(1, deviation),
        ) * Math.sign(rule.adjustPercent);

        // 현재값 조회 (시뮬레이션용 기본값)
        const currentValue = 100; // 실제로는 DB에서 조회
        const proposedValue = currentValue * (1 + scaledAdjust / 100);

        const id = `tp_${metric.targetId}_${rule.parameter}_${Date.now()}`;

        proposals.push({
          id,
          targetId: metric.targetId,
          targetType: metric.targetType,
          targetName: metric.targetName,
          parameter: rule.parameter,
          currentValue,
          proposedValue: Math.round(proposedValue * 100) / 100,
          changePercent: Math.round(scaledAdjust * 100) / 100,
          reason: this.buildReason(metric, obj, condition, value),
          metrics: metric,
          confidence: this.calculateConfidence(metric.sampleSize, deviation),
          priority: priority as TuningProposal['priority'],
          status: 'pending',
          createdAt: new Date(),
          reviewedAt: null,
          reviewedBy: null,
          appliedAt: null,
        });
      }
    }

    return proposals;
  }

  private buildReason(
    metric: BalanceMetrics,
    obj: BalanceObjective,
    condition: 'above_max' | 'below_min',
    value: number,
  ): string {
    const metricName = {
      winRate: '승률',
      clearRate: '클리어율',
      avgPlayTimeMin: '평균 플레이시간',
      usageRate: '사용률',
    }[obj.metric] ?? obj.metric;

    const direction = condition === 'above_max' ? '높음' : '낮음';
    const ideal = `${obj.idealMin}~${obj.idealMax}`;

    return `[${metric.targetName}] ${metricName} ${this.formatValue(value, obj.metric)}이(가) 목표 범위(${ideal}) 대비 ${direction}. 표본: ${metric.sampleSize}건`;
  }

  private formatValue(value: number, metric: string): string {
    if (metric.includes('Rate')) return `${(value * 100).toFixed(1)}%`;
    if (metric.includes('Time')) return `${value.toFixed(1)}분`;
    return `${value}`;
  }

  private calculateConfidence(sampleSize: number, deviation: number): number {
    // 표본이 많을수록 + 편차가 클수록 신뢰도 높음
    const sampleConf = Math.min(1, sampleSize / 1000);
    const devConf = Math.min(1, Math.abs(deviation));
    return Math.round((sampleConf * 0.6 + devConf * 0.4) * 100) / 100;
  }

  // ── 어드민 워크플로우 ────────────────────────────────────

  /**
   * 제안 승인 — 어드민이 확인 후 적용 대기열에 추가
   */
  async approveProposal(proposalId: string, adminUserId: string): Promise<TuningProposal> {
    const proposal = await prisma.tuningProposal.update({
      where: { id: proposalId },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
      },
    });
    return proposal as unknown as TuningProposal;
  }

  /**
   * 제안 거부
   */
  async rejectProposal(proposalId: string, adminUserId: string, reason?: string): Promise<TuningProposal> {
    const proposal = await prisma.tuningProposal.update({
      where: { id: proposalId },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
        rejectReason: reason,
      },
    });
    return proposal as unknown as TuningProposal;
  }

  /**
   * 승인된 제안 적용 — 실제 DB 파라미터 변경
   */
  async applyApprovedProposals(): Promise<{ applied: number; failed: number }> {
    const approved = await prisma.tuningProposal.findMany({
      where: { status: 'approved' },
      orderBy: { createdAt: 'asc' },
    });

    let applied = 0;
    let failed = 0;

    for (const proposal of approved) {
      try {
        await this.applyParameterChange(
          proposal.targetType as BalanceTarget,
          proposal.targetId,
          proposal.parameter,
          proposal.proposedValue as number,
        );

        await prisma.tuningProposal.update({
          where: { id: proposal.id },
          data: { status: 'applied', appliedAt: new Date() },
        });

        applied++;
      } catch (err) {
        console.error(`[BalanceAutoTuner] 적용 실패 (${proposal.id}):`, err);
        failed++;
      }
    }

    console.log(`[BalanceAutoTuner] 적용 완료: ${applied}건 성공, ${failed}건 실패`);
    return { applied, failed };
  }

  /**
   * 실제 파라미터 변경 (타겟 타입별 분기)
   */
  private async applyParameterChange(
    targetType: BalanceTarget,
    targetId: string,
    parameter: string,
    newValue: number,
  ): Promise<void> {
    switch (targetType) {
      case 'skill':
        await prisma.skill.update({
          where: { id: targetId },
          data: { [parameter]: newValue },
        });
        break;
      case 'monster':
        await prisma.monster.update({
          where: { id: targetId },
          data: { [parameter]: newValue },
        });
        break;
      case 'dungeon':
        await prisma.dungeon.update({
          where: { id: targetId },
          data: { [parameter]: newValue },
        });
        break;
    }
  }

  /**
   * 적용된 제안 롤백
   */
  async revertProposal(proposalId: string): Promise<void> {
    const proposal = await prisma.tuningProposal.findUnique({ where: { id: proposalId } });
    if (!proposal || proposal.status !== 'applied') {
      throw new Error(`롤백 불가: ${proposalId} (상태: ${proposal?.status})`);
    }

    await this.applyParameterChange(
      proposal.targetType as BalanceTarget,
      proposal.targetId,
      proposal.parameter,
      proposal.currentValue as number,
    );

    await prisma.tuningProposal.update({
      where: { id: proposalId },
      data: { status: 'reverted' },
    });
  }

  // ── 조회 API ──────────────────────────────────────────────

  /**
   * 제안 목록 조회 (어드민 대시보드)
   */
  async getProposals(filters: {
    status?: TuningStatus;
    targetType?: BalanceTarget;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ proposals: TuningProposal[]; total: number }> {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.targetType) where.targetType = filters.targetType;
    if (filters.priority) where.priority = filters.priority;

    const [proposals, total] = await Promise.all([
      prisma.tuningProposal.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        take: filters.limit ?? 20,
        skip: filters.offset ?? 0,
      }),
      prisma.tuningProposal.count({ where }),
    ]);

    return {
      proposals: proposals as unknown as TuningProposal[],
      total,
    };
  }

  /**
   * 타겟별 밸런스 히스토리 조회
   */
  async getTargetHistory(targetId: string): Promise<TuningProposal[]> {
    const proposals = await prisma.tuningProposal.findMany({
      where: { targetId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return proposals as unknown as TuningProposal[];
  }
}

// ── 싱글턴 ──────────────────────────────────────────────────

export const balanceAutoTuner = new BalanceAutoTuner();
