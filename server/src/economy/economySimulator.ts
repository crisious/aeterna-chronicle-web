/**
 * P4-08: 게임 경제 시뮬레이터
 *
 * 재화 싱크/소스 분석 엔진, 인플레이션 감지 (재화 총량 추적),
 * 일일 리포트 생성 (유입/유출/순 변동)
 */

import {
  type GoldSinkType,
  type GoldSourceType,
  type ItemGrade,
  generateLevelEconomyCurves,
  ENHANCEMENT_TABLE,
  GRADE_PRICE_RANGES,
  SHOP_BUYBACK_RATIO,
} from './balanceTable';

// ─── 거래 기록 타입 ─────────────────────────────────────────────

/** 골드 유입 이벤트 */
export interface GoldSourceEvent {
  type: GoldSourceType;
  userId: string;
  amount: number;
  timestamp: Date;
  detail?: string;  // 예: "몬스터 Lv.35 처치", "퀘스트 MAIN_CH3_01"
}

/** 골드 유출 이벤트 */
export interface GoldSinkEvent {
  type: GoldSinkType;
  userId: string;
  amount: number;
  timestamp: Date;
  detail?: string;
}

// ─── 일일 리포트 ────────────────────────────────────────────────

export interface DailyEconomyReport {
  date: string;                    // YYYY-MM-DD
  totalInflow: number;             // 총 유입
  totalOutflow: number;            // 총 유출
  netChange: number;               // 순 변동 (양수 = 인플레이션 경향)
  inflowByType: Record<GoldSourceType, number>;
  outflowByType: Record<GoldSinkType, number>;
  activeUsers: number;             // 거래 참여 유저 수
  averageInflowPerUser: number;
  averageOutflowPerUser: number;
  inflationIndex: number;          // 인플레이션 지수 (1.0 기준)
  healthStatus: 'healthy' | 'warning' | 'critical';
}

// ─── 밸런스 검증 결과 ───────────────────────────────────────────

export interface BalanceCheckResult {
  timestamp: string;
  levelCurveDeviation: LevelDeviation[];  // 레벨별 기대치 대비 실측 편차
  enhancementSinkTotal: number;           // 강화 시스템 총 골드 소모
  topSinks: { type: GoldSinkType; amount: number }[];
  topSources: { type: GoldSourceType; amount: number }[];
  recommendations: string[];
}

interface LevelDeviation {
  level: number;
  expectedNet: number;
  actualNet: number;
  deviation: number;  // 백분율 편차
}

// ─── 경제 시뮬레이터 엔진 ───────────────────────────────────────

export class EconomySimulator {
  /** 인메모리 이벤트 버퍼 (프로덕션에서는 DB/Redis 교체) */
  private sourceEvents: GoldSourceEvent[] = [];
  private sinkEvents: GoldSinkEvent[] = [];

  /** 서버 내 총 골드 추적 (인플레이션 감지용) */
  private totalGoldSupply = 0;
  private previousDaySupply = 0;

  // ── 이벤트 기록 ──────────────────────────────────────────────

  /** 골드 유입 기록 */
  recordSource(event: GoldSourceEvent): void {
    this.sourceEvents.push(event);
    this.totalGoldSupply += event.amount;
  }

  /** 골드 유출 기록 */
  recordSink(event: GoldSinkEvent): void {
    this.sinkEvents.push(event);
    this.totalGoldSupply -= event.amount;
  }

  /** 현재 총 골드 공급량 조회 */
  getTotalGoldSupply(): number {
    return this.totalGoldSupply;
  }

  /** 외부에서 총 골드량 직접 설정 (DB 동기화용) */
  setTotalGoldSupply(amount: number): void {
    this.totalGoldSupply = amount;
  }

  // ── 인플레이션 지수 ──────────────────────────────────────────

  /**
   * 인플레이션 지수 계산
   * 1.0 = 안정, >1.05 = 경고, >1.15 = 위험
   * 전일 대비 골드 총량 변화율 기반
   */
  calculateInflationIndex(): number {
    if (this.previousDaySupply <= 0) return 1.0;
    return this.totalGoldSupply / this.previousDaySupply;
  }

  /** 인플레이션 상태 판정 */
  getInflationStatus(): 'healthy' | 'warning' | 'critical' {
    const idx = this.calculateInflationIndex();
    if (idx > 1.15) return 'critical';
    if (idx > 1.05) return 'warning';
    return 'healthy';
  }

  // ── 일일 리포트 생성 ─────────────────────────────────────────

  /** 특정 날짜의 일일 경제 리포트 생성 */
  generateDailyReport(date: string): DailyEconomyReport {
    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    // 해당 일자 이벤트 필터링
    const daySources = this.sourceEvents.filter(
      e => e.timestamp >= dayStart && e.timestamp <= dayEnd,
    );
    const daySinks = this.sinkEvents.filter(
      e => e.timestamp >= dayStart && e.timestamp <= dayEnd,
    );

    // 유형별 집계
    const inflowByType = this.aggregateSources(daySources);
    const outflowByType = this.aggregateSinks(daySinks);

    const totalInflow = Object.values(inflowByType).reduce((s, v) => s + v, 0);
    const totalOutflow = Object.values(outflowByType).reduce((s, v) => s + v, 0);
    const netChange = totalInflow - totalOutflow;

    // 활성 유저 수
    const userSet = new Set<string>();
    daySources.forEach(e => userSet.add(e.userId));
    daySinks.forEach(e => userSet.add(e.userId));
    const activeUsers = userSet.size;

    const inflationIndex = this.calculateInflationIndex();
    const healthStatus = this.getInflationStatus();

    return {
      date,
      totalInflow,
      totalOutflow,
      netChange,
      inflowByType,
      outflowByType,
      activeUsers,
      averageInflowPerUser: activeUsers > 0 ? Math.round(totalInflow / activeUsers) : 0,
      averageOutflowPerUser: activeUsers > 0 ? Math.round(totalOutflow / activeUsers) : 0,
      inflationIndex: Math.round(inflationIndex * 1000) / 1000,
      healthStatus,
    };
  }

  // ── 밸런스 검증 ──────────────────────────────────────────────

  /**
   * 밸런스 검증 — 레벨 곡선 대비 실측 편차 + 싱크/소스 상위 분석
   * actualByLevel: { [level]: netGold } 형태의 실측 데이터
   */
  checkBalance(actualByLevel: Record<number, number>): BalanceCheckResult {
    const curves = generateLevelEconomyCurves();
    const deviations: LevelDeviation[] = [];

    for (const curve of curves) {
      const actual = actualByLevel[curve.level] ?? 0;
      const deviation = curve.netGold > 0
        ? ((actual - curve.netGold) / curve.netGold) * 100
        : 0;
      if (Math.abs(deviation) > 10) {  // 10% 이상 편차만 기록
        deviations.push({
          level: curve.level,
          expectedNet: curve.netGold,
          actualNet: actual,
          deviation: Math.round(deviation * 10) / 10,
        });
      }
    }

    // 강화 시스템 총 소모 집계
    const enhancementTotal = this.sinkEvents
      .filter(e => e.type === 'enhancement')
      .reduce((sum, e) => sum + e.amount, 0);

    // 상위 싱크/소스 정렬
    const sinkAgg = this.aggregateSinks(this.sinkEvents);
    const sourceAgg = this.aggregateSources(this.sourceEvents);

    const topSinks = (Object.entries(sinkAgg) as [GoldSinkType, number][])
      .map(([type, amount]) => ({ type, amount }))
      .sort((a, b) => b.amount - a.amount);

    const topSources = (Object.entries(sourceAgg) as [GoldSourceType, number][])
      .map(([type, amount]) => ({ type, amount }))
      .sort((a, b) => b.amount - a.amount);

    // 자동 추천사항 생성
    const recommendations: string[] = [];
    const inflationIdx = this.calculateInflationIndex();
    if (inflationIdx > 1.10) {
      recommendations.push(`인플레이션 지수 ${inflationIdx.toFixed(3)} — 골드 싱크 강화 필요`);
    }
    if (inflationIdx < 0.90) {
      recommendations.push(`디플레이션 지수 ${inflationIdx.toFixed(3)} — 골드 소스 확대 검토`);
    }
    if (deviations.length > 20) {
      recommendations.push(`${deviations.length}개 레벨에서 10% 이상 편차 — 밸런스 테이블 재검토 필요`);
    }
    if (enhancementTotal === 0 && this.sinkEvents.length > 0) {
      recommendations.push('강화 시스템 소모가 0 — 강화 콘텐츠 참여 유도 필요');
    }

    return {
      timestamp: new Date().toISOString(),
      levelCurveDeviation: deviations,
      enhancementSinkTotal: enhancementTotal,
      topSinks,
      topSources,
      recommendations,
    };
  }

  // ── 요약 데이터 (API 응답용) ─────────────────────────────────

  /** 강화 비용 테이블 요약 */
  getEnhancementSummary() {
    return ENHANCEMENT_TABLE.map(e => ({
      level: `+${e.level}`,
      goldCost: e.goldCost,
      successRate: `${(e.successRate * 100).toFixed(0)}%`,
      destroyRate: e.destroyRate > 0 ? `${(e.destroyRate * 100).toFixed(0)}%` : '-',
    }));
  }

  /** 등급별 가격 범위 요약 */
  getGradePriceSummary() {
    return Object.values(GRADE_PRICE_RANGES);
  }

  /** 상점 매입 비율 */
  getBuybackRatio(): number {
    return SHOP_BUYBACK_RATIO;
  }

  // ── 일 마감 (daily rotation) ─────────────────────────────────

  /** 하루 마감 처리: 전일 공급량 저장 + 이벤트 버퍼 초기화 */
  rotateDailySnapshot(): void {
    this.previousDaySupply = this.totalGoldSupply;
    this.sourceEvents = [];
    this.sinkEvents = [];
  }

  // ── 내부 유틸 ────────────────────────────────────────────────

  private aggregateSources(events: GoldSourceEvent[]): Record<GoldSourceType, number> {
    const result: Record<GoldSourceType, number> = {
      monster_drop: 0,
      quest_reward: 0,
      item_sell: 0,
      achievement: 0,
    };
    for (const e of events) {
      result[e.type] = (result[e.type] ?? 0) + e.amount;
    }
    return result;
  }

  private aggregateSinks(events: GoldSinkEvent[]): Record<GoldSinkType, number> {
    const result: Record<GoldSinkType, number> = {
      enhancement: 0,
      repair: 0,
      tax: 0,
      teleport: 0,
      npc_shop: 0,
    };
    for (const e of events) {
      result[e.type] = (result[e.type] ?? 0) + e.amount;
    }
    return result;
  }
}

// ─── 싱글톤 인스턴스 ────────────────────────────────────────────
export const economySimulator = new EconomySimulator();
