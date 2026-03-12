/**
 * P6-14: KPI/BI 분석 엔진
 * DAU/MAU 집계, ARPU, LTV, 리텐션(코호트), 전환율, 인플레이션 지수
 * 일일 스냅샷 크론 자동 집계
 */
import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

export type KpiMetric =
  | 'dau'
  | 'mau'
  | 'arpu'
  | 'ltv'
  | 'retention_d1'
  | 'retention_d7'
  | 'retention_d30'
  | 'revenue'
  | 'arppu'
  | 'conversion';

export interface KpiFilter {
  startDate: Date;
  endDate: Date;
  metric?: KpiMetric;
  segment?: string;
}

// ─── DAU/MAU 집계 ───────────────────────────────────────────────

/** 특정 날짜의 DAU (lastLoginAt 기준 고유 유저 수) */
export async function calculateDau(date: Date): Promise<number> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const count = await prisma.user.count({
    where: {
      lastLoginAt: { gte: dayStart, lte: dayEnd },
    },
  });
  return count;
}

/** 특정 월의 MAU (해당 월 중 한 번이라도 로그인한 유저 수) */
export async function calculateMau(year: number, month: number): Promise<number> {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const count = await prisma.user.count({
    where: {
      lastLoginAt: { gte: monthStart, lte: monthEnd },
    },
  });
  return count;
}

// ─── 매출/ARPU/ARPPU ───────────────────────────────────────────

/** 특정 기간의 총 매출 (PaymentReceipt 합계) */
export async function calculateRevenue(startDate: Date, endDate: Date): Promise<number> {
  const result = await prisma.paymentReceipt.aggregate({
    _sum: { amount: true },
    where: {
      status: 'verified',
      createdAt: { gte: startDate, lte: endDate },
    },
  });
  return result._sum.amount ?? 0;
}

/** ARPU = 매출 / 활성 유저 수 */
export async function calculateArpu(date: Date): Promise<number> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const [revenue, dau] = await Promise.all([
    calculateRevenue(dayStart, dayEnd),
    calculateDau(date),
  ]);

  return dau > 0 ? revenue / dau : 0;
}

/** ARPPU = 매출 / 결제 유저 수 */
export async function calculateArppu(startDate: Date, endDate: Date): Promise<number> {
  const [revenue, payingUsers] = await Promise.all([
    calculateRevenue(startDate, endDate),
    prisma.paymentReceipt.groupBy({
      by: ['userId'],
      where: {
        status: 'verified',
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  return payingUsers.length > 0 ? revenue / payingUsers.length : 0;
}

// ─── LTV ────────────────────────────────────────────────────────

/** LTV = ARPU × 평균 활동 개월 수 */
export async function calculateLtv(): Promise<number> {
  // 평균 활동 개월 수: (현재 - 가입일) 평균
  const users = await prisma.user.findMany({
    select: { createdAt: true },
    where: { lastLoginAt: { not: null } },
  });

  if (users.length === 0) return 0;

  const now = Date.now();
  const totalMonths = users.reduce((sum, u) => {
    const months = (now - u.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000);
    return sum + Math.max(months, 1); // 최소 1개월
  }, 0);
  const avgMonths = totalMonths / users.length;

  // 최근 30일 기준 일평균 ARPU
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const revenue = await calculateRevenue(thirtyDaysAgo, new Date());
  const avgDau = await calculateDau(new Date()); // 단순화: 오늘 기준
  const dailyArpu = avgDau > 0 ? revenue / 30 / avgDau : 0;
  const monthlyArpu = dailyArpu * 30;

  return monthlyArpu * avgMonths;
}

// ─── 리텐션 (코호트 분석) ───────────────────────────────────────

/**
 * D-N 리텐션: 특정 날짜에 가입한 유저 중 N일 후 접속한 비율.
 * @param cohortDate 코호트 기준일 (가입일)
 * @param dayN 리텐션 일수 (1, 7, 30)
 */
export async function calculateRetention(cohortDate: Date, dayN: number): Promise<number> {
  const cohortStart = new Date(cohortDate);
  cohortStart.setHours(0, 0, 0, 0);
  const cohortEnd = new Date(cohortDate);
  cohortEnd.setHours(23, 59, 59, 999);

  // 해당 날짜에 가입한 유저 목록
  const cohortUsers = await prisma.user.findMany({
    select: { id: true },
    where: { createdAt: { gte: cohortStart, lte: cohortEnd } },
  });

  if (cohortUsers.length === 0) return 0;

  // N일 후 로그인한 유저 확인
  const targetStart = new Date(cohortStart.getTime() + dayN * 24 * 60 * 60 * 1000);
  const targetEnd = new Date(targetStart);
  targetEnd.setHours(23, 59, 59, 999);

  const returnedCount = await prisma.user.count({
    where: {
      id: { in: cohortUsers.map(u => u.id) },
      lastLoginAt: { gte: targetStart, lte: targetEnd },
    },
  });

  return returnedCount / cohortUsers.length;
}

// ─── 전환율 ─────────────────────────────────────────────────────

/** 전환율: 무과금 → 첫 결제 비율 (전체 유저 대비 결제 유저) */
export async function calculateConversionRate(): Promise<number> {
  const [totalUsers, payingUsers] = await Promise.all([
    prisma.user.count(),
    prisma.paymentReceipt.groupBy({
      by: ['userId'],
      where: { status: 'verified' },
    }),
  ]);

  return totalUsers > 0 ? payingUsers.length / totalUsers : 0;
}

// ─── 인플레이션 지수 ────────────────────────────────────────────

/** 인플레이션 지수: 골드 유통량 / 골드 소모량 (1보다 크면 인플레이션) */
export async function calculateInflationIndex(): Promise<{
  totalCirculating: number;
  totalSunk: number;
  index: number;
}> {
  // 전체 유저 골드 보유량 합계 (유통량) — User.gold 필드 기반
  const circulatingResult = await prisma.user.aggregate({
    _sum: { gold: true },
  });
  const totalCirculating = circulatingResult._sum.gold ?? 0;

  // 골드 소모량: 최근 30일 TransactionLog에서 음수 amount 합계
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sinkResult = await prisma.transactionLog.aggregate({
    _sum: { amount: true },
    where: {
      currency: 'gold',
      amount: { lt: 0 }, // 음수 = 소비
      createdAt: { gte: thirtyDaysAgo },
    },
  });
  const totalSunk = Math.abs(sinkResult._sum.amount ?? 0);

  return {
    totalCirculating,
    totalSunk,
    index: totalSunk > 0 ? totalCirculating / totalSunk : Infinity,
  };
}

// ─── KPI 스냅샷 저장/조회 ───────────────────────────────────────

/** KPI 스냅샷 1건 저장 (upsert) */
export async function saveKpiSnapshot(
  date: Date,
  metric: KpiMetric,
  value: number,
  segment?: string,
): Promise<void> {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  await prisma.kpiSnapshot.upsert({
    where: {
      date_metric_segment: {
        date: normalizedDate,
        metric,
        segment: segment ?? '',
      },
    },
    update: { value },
    create: {
      date: normalizedDate,
      metric,
      value,
      segment: segment ?? '',
    },
  });
}

/** KPI 스냅샷 조회 (기간/메트릭 필터) */
export async function getKpiSnapshots(filter: KpiFilter) {
  const where: Record<string, unknown> = {
    date: { gte: filter.startDate, lte: filter.endDate },
  };
  if (filter.metric) where['metric'] = filter.metric;
  if (filter.segment) where['segment'] = filter.segment;

  return prisma.kpiSnapshot.findMany({
    where,
    orderBy: { date: 'asc' },
  });
}

// ─── 일일 스냅샷 크론 (전체 KPI 일괄 집계) ─────────────────────

/** 일일 KPI 스냅샷을 생성한다 (크론 또는 수동 호출) */
export async function runDailyKpiSnapshot(targetDate?: Date): Promise<{
  date: Date;
  metrics: Record<string, number>;
}> {
  const date = targetDate ?? new Date();
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const metrics: Record<string, number> = {};

  // DAU
  metrics['dau'] = await calculateDau(date);
  await saveKpiSnapshot(date, 'dau', metrics['dau']);

  // MAU (해당 월)
  metrics['mau'] = await calculateMau(date.getFullYear(), date.getMonth() + 1);
  await saveKpiSnapshot(date, 'mau', metrics['mau']);

  // 매출
  metrics['revenue'] = await calculateRevenue(dayStart, dayEnd);
  await saveKpiSnapshot(date, 'revenue', metrics['revenue']);

  // ARPU
  metrics['arpu'] = metrics['dau'] > 0 ? metrics['revenue'] / metrics['dau'] : 0;
  await saveKpiSnapshot(date, 'arpu', metrics['arpu']);

  // ARPPU
  metrics['arppu'] = await calculateArppu(dayStart, dayEnd);
  await saveKpiSnapshot(date, 'arppu', metrics['arppu']);

  // 전환율
  metrics['conversion'] = await calculateConversionRate();
  await saveKpiSnapshot(date, 'conversion', metrics['conversion']);

  // 리텐션 D1/D7/D30 (어제 가입 코호트 기준)
  const yesterday = new Date(date.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000);

  metrics['retention_d1'] = await calculateRetention(yesterday, 1);
  await saveKpiSnapshot(date, 'retention_d1', metrics['retention_d1']);

  metrics['retention_d7'] = await calculateRetention(sevenDaysAgo, 7);
  await saveKpiSnapshot(date, 'retention_d7', metrics['retention_d7']);

  metrics['retention_d30'] = await calculateRetention(thirtyDaysAgo, 30);
  await saveKpiSnapshot(date, 'retention_d30', metrics['retention_d30']);

  // LTV
  metrics['ltv'] = await calculateLtv();
  await saveKpiSnapshot(date, 'ltv', metrics['ltv']);

  // P7-11: 세션 시간 + 클리어율
  metrics['avg_session_time'] = await calculateAvgSessionTime(date);
  // KPI 스냅샷 저장 (커스텀 메트릭은 segment로 구분)
  await saveKpiSnapshot(date, 'dau', metrics['avg_session_time'], 'session_time_sec');

  const clearData = await calculateStageClearRate(dayStart, dayEnd);
  metrics['stage_clear_rate'] = clearData.clearRate;
  await saveKpiSnapshot(date, 'dau', metrics['stage_clear_rate'], 'stage_clear_rate');

  return { date, metrics };
}

// ─── 경제 지표 조회 (대시보드용) ────────────────────────────────

export async function getEconomyMetrics() {
  const inflation = await calculateInflationIndex();

  // 통화별 총 유통량 — User 모델의 gold/diamond 필드 합산
  const currencyTotals = await prisma.user.aggregate({
    _sum: { gold: true, diamond: true },
  });

  return {
    inflation,
    totalGold: currencyTotals._sum.gold ?? 0,
    totalDiamond: currencyTotals._sum.diamond ?? 0,
  };
}

// ─── 세션 시간 집계 (P7-11: KPI 실데이터 수집) ────────────────

/**
 * 평균 세션 시간(초) — 오늘 로그인한 유저의 세이브 슬롯 playtime 기반 추정.
 * 정밀한 세션 트래킹은 TelemetryGameEvent 기반으로 확장 예정.
 */
export async function calculateAvgSessionTime(date: Date): Promise<number> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // 오늘 접속한 유저 ID
  const activeUsers = await prisma.user.findMany({
    where: { lastLoginAt: { gte: dayStart, lte: dayEnd } },
    select: { id: true },
  });

  if (activeUsers.length === 0) return 0;

  // 세이브 슬롯에서 오늘 업데이트된 것들의 playtime 변동 추정
  const saves = await prisma.saveSlot.findMany({
    where: {
      userId: { in: activeUsers.map(u => u.id) },
      updatedAt: { gte: dayStart, lte: dayEnd },
    },
    select: { playtime: true },
  });

  if (saves.length === 0) return 0;

  const totalPlaytime = saves.reduce((sum, s) => sum + s.playtime, 0);
  return Math.round(totalPlaytime / activeUsers.length);
}

// ─── 스테이지/던전 클리어율 집계 (P7-11) ───────────────────────

/**
 * 특정 기간의 던전 클리어율 (cleared / total runs).
 */
export async function calculateStageClearRate(startDate: Date, endDate: Date): Promise<{
  totalRuns: number;
  clearedRuns: number;
  clearRate: number;
  byDungeon: Array<{ dungeonId: string; total: number; cleared: number; rate: number }>;
}> {
  const runs = await prisma.dungeonRun.findMany({
    where: {
      startedAt: { gte: startDate, lte: endDate },
      status: { in: ['cleared', 'failed', 'abandoned'] },
    },
    select: { dungeonId: true, status: true },
  });

  const totalRuns = runs.length;
  const clearedRuns = runs.filter(r => r.status === 'cleared').length;

  // 던전별 집계
  const dungeonMap = new Map<string, { total: number; cleared: number }>();
  for (const run of runs) {
    const entry = dungeonMap.get(run.dungeonId) ?? { total: 0, cleared: 0 };
    entry.total++;
    if (run.status === 'cleared') entry.cleared++;
    dungeonMap.set(run.dungeonId, entry);
  }

  const byDungeon = Array.from(dungeonMap.entries()).map(([dungeonId, stats]) => ({
    dungeonId,
    total: stats.total,
    cleared: stats.cleared,
    rate: stats.total > 0 ? stats.cleared / stats.total : 0,
  }));

  return {
    totalRuns,
    clearedRuns,
    clearRate: totalRuns > 0 ? clearedRuns / totalRuns : 0,
    byDungeon,
  };
}

// ─── 매출 시계열 (대시보드용) ───────────────────────────────────

export async function getRevenueTimeSeries(startDate: Date, endDate: Date) {
  const snapshots = await prisma.kpiSnapshot.findMany({
    where: {
      metric: 'revenue',
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });
  return snapshots.map(s => ({ date: s.date, value: s.value }));
}
