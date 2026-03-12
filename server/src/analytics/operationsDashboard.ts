/**
 * P14-15: 실시간 운영 대시보드
 * ClickHouse 쿼리 래퍼 (CCU/매출/이탈률/추천 CTR)
 * 어드민 대시보드 API (GET /api/admin/analytics/*)
 * Grafana 임베드 URL 생성
 *
 * 의존: P14-01 dataWarehouse, P14-02 eventCollector, P14-03 churnPredictor,
 *       P14-08 recommendationEngine, P14-09 balanceAutoTuner
 */

import { prisma } from '../db';

// ─── ClickHouse 클라이언트 래퍼 ─────────────────────────────────

export interface ClickHouseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  protocol: 'http' | 'https';
}

const DEFAULT_CH_CONFIG: ClickHouseConfig = {
  host: process.env.CLICKHOUSE_HOST ?? 'localhost',
  port: parseInt(process.env.CLICKHOUSE_PORT ?? '8123', 10),
  database: process.env.CLICKHOUSE_DB ?? 'aeterna_analytics',
  username: process.env.CLICKHOUSE_USER ?? 'default',
  password: process.env.CLICKHOUSE_PASSWORD ?? '',
  protocol: (process.env.CLICKHOUSE_PROTOCOL as 'http' | 'https') ?? 'http',
};

/** ClickHouse HTTP 인터페이스 쿼리 실행 */
async function queryClickHouse<T = Record<string, unknown>>(
  sql: string,
  params?: Record<string, string | number>,
  config: ClickHouseConfig = DEFAULT_CH_CONFIG,
): Promise<T[]> {
  let query = sql;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      query = query.replace(`{${key}}`, typeof value === 'string' ? `'${value}'` : String(value));
    }
  }

  const url = `${config.protocol}://${config.host}:${config.port}/?database=${config.database}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'X-ClickHouse-User': config.username,
      'X-ClickHouse-Key': config.password,
    },
    body: `${query} FORMAT JSON`,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`[ClickHouse] Query failed (${response.status}): ${errorText}`);
  }

  const result = await response.json() as { data: T[] };
  return result.data;
}

// ─── CCU (동시 접속자) ──────────────────────────────────────────

export interface CCUSnapshot {
  timestamp: string;
  ccu: number;
  byRegion: Record<string, number>;
  byPlatform: Record<string, number>;
  peak24h: number;
  avg24h: number;
}

/** 현재 CCU — ClickHouse sessions 테이블 실시간 집계 */
export async function getCurrentCCU(): Promise<CCUSnapshot> {
  const now = new Date().toISOString();

  // 실시간 세션 기반 CCU
  const ccuRows = await queryClickHouse<{ ccu: number }>(`
    SELECT count(DISTINCT user_id) AS ccu
    FROM sessions
    WHERE ended_at IS NULL
      AND started_at >= now() - INTERVAL 30 MINUTE
  `);

  // 지역별 분포
  const regionRows = await queryClickHouse<{ region: string; cnt: number }>(`
    SELECT region, count(DISTINCT user_id) AS cnt
    FROM sessions
    WHERE ended_at IS NULL AND started_at >= now() - INTERVAL 30 MINUTE
    GROUP BY region
  `);

  // 플랫폼별 분포
  const platformRows = await queryClickHouse<{ platform: string; cnt: number }>(`
    SELECT platform, count(DISTINCT user_id) AS cnt
    FROM sessions
    WHERE ended_at IS NULL AND started_at >= now() - INTERVAL 30 MINUTE
    GROUP BY platform
  `);

  // 24시간 피크/평균
  const statsRows = await queryClickHouse<{ peak: number; avg_ccu: number }>(`
    SELECT
      max(ccu_snapshot) AS peak,
      avg(ccu_snapshot) AS avg_ccu
    FROM ccu_minutely
    WHERE ts >= now() - INTERVAL 24 HOUR
  `);

  const byRegion: Record<string, number> = {};
  for (const row of regionRows) byRegion[row.region] = row.cnt;

  const byPlatform: Record<string, number> = {};
  for (const row of platformRows) byPlatform[row.platform] = row.cnt;

  return {
    timestamp: now,
    ccu: ccuRows[0]?.ccu ?? 0,
    byRegion,
    byPlatform,
    peak24h: statsRows[0]?.peak ?? 0,
    avg24h: Math.round(statsRows[0]?.avg_ccu ?? 0),
  };
}

// ─── 매출 (Revenue) ─────────────────────────────────────────────

export interface RevenueSnapshot {
  period: string;
  totalRevenue: number;
  currency: string;
  byProduct: { productId: string; productName: string; revenue: number; count: number }[];
  arpu: number;
  arppu: number;
  conversionRate: number;
  comparisonPeriod?: { revenue: number; changePercent: number };
}

/** 기간별 매출 집계 */
export async function getRevenueSnapshot(
  period: 'today' | '7d' | '30d' | 'month',
): Promise<RevenueSnapshot> {
  const intervalMap = { today: '1 DAY', '7d': '7 DAY', '30d': '30 DAY', month: '30 DAY' };
  const interval = intervalMap[period];

  const revenueRows = await queryClickHouse<{
    total: number; paying_users: number; total_users: number;
  }>(`
    SELECT
      sum(amount_usd) AS total,
      count(DISTINCT user_id) AS paying_users,
      (SELECT count(DISTINCT user_id) FROM sessions WHERE started_at >= now() - INTERVAL ${interval}) AS total_users
    FROM payments
    WHERE created_at >= now() - INTERVAL ${interval}
      AND status = 'completed'
  `);

  const productRows = await queryClickHouse<{
    product_id: string; product_name: string; revenue: number; cnt: number;
  }>(`
    SELECT product_id, product_name, sum(amount_usd) AS revenue, count(*) AS cnt
    FROM payments
    WHERE created_at >= now() - INTERVAL ${interval} AND status = 'completed'
    GROUP BY product_id, product_name
    ORDER BY revenue DESC
    LIMIT 20
  `);

  // 비교 기간 (이전 동일 기간)
  const compRows = await queryClickHouse<{ prev_total: number }>(`
    SELECT sum(amount_usd) AS prev_total
    FROM payments
    WHERE created_at >= now() - INTERVAL ${interval} * 2
      AND created_at < now() - INTERVAL ${interval}
      AND status = 'completed'
  `);

  const total = revenueRows[0]?.total ?? 0;
  const payingUsers = revenueRows[0]?.paying_users ?? 0;
  const totalUsers = revenueRows[0]?.total_users ?? 1;
  const prevTotal = compRows[0]?.prev_total ?? 0;

  return {
    period,
    totalRevenue: Math.round(total * 100) / 100,
    currency: 'USD',
    byProduct: productRows.map(r => ({
      productId: r.product_id,
      productName: r.product_name,
      revenue: Math.round(r.revenue * 100) / 100,
      count: r.cnt,
    })),
    arpu: totalUsers > 0 ? Math.round((total / totalUsers) * 100) / 100 : 0,
    arppu: payingUsers > 0 ? Math.round((total / payingUsers) * 100) / 100 : 0,
    conversionRate: totalUsers > 0 ? Math.round((payingUsers / totalUsers) * 10000) / 100 : 0,
    comparisonPeriod: prevTotal > 0
      ? { revenue: prevTotal, changePercent: Math.round(((total - prevTotal) / prevTotal) * 10000) / 100 }
      : undefined,
  };
}

// ─── 이탈률 (Churn Rate) ────────────────────────────────────────

export interface ChurnRateSnapshot {
  period: string;
  churnRate: number;        // 0~100%
  churnedUsers: number;
  totalActiveUsers: number;
  riskDistribution: { level: string; count: number; percent: number }[];
  trend7d: { date: string; rate: number }[];
  topChurnFactors: { factor: string; avgWeight: number; affectedUsers: number }[];
}

/** 이탈률 대시보드 데이터 */
export async function getChurnRateSnapshot(): Promise<ChurnRateSnapshot> {
  // 30일 기준 이탈률
  const churnRows = await queryClickHouse<{
    churned: number; total_active: number;
  }>(`
    SELECT
      countIf(last_login < now() - INTERVAL 7 DAY AND last_login >= now() - INTERVAL 37 DAY) AS churned,
      countIf(last_login >= now() - INTERVAL 37 DAY) AS total_active
    FROM user_activity_daily
    WHERE snapshot_date = today()
  `);

  // 리스크 분포 (churn_predictions 테이블)
  const riskRows = await queryClickHouse<{ risk_level: string; cnt: number }>(`
    SELECT risk_level, count(*) AS cnt
    FROM churn_predictions
    WHERE predicted_at >= now() - INTERVAL 1 DAY
    GROUP BY risk_level
  `);

  // 7일 트렌드
  const trendRows = await queryClickHouse<{ dt: string; rate: number }>(`
    SELECT
      toDate(snapshot_date) AS dt,
      round(countIf(churned = 1) * 100.0 / count(*), 2) AS rate
    FROM user_activity_daily
    WHERE snapshot_date >= today() - 7
    GROUP BY dt
    ORDER BY dt
  `);

  // 주요 이탈 요인
  const factorRows = await queryClickHouse<{
    factor: string; avg_weight: number; affected: number;
  }>(`
    SELECT factor, avg(weight) AS avg_weight, count(DISTINCT user_id) AS affected
    FROM churn_factor_details
    WHERE predicted_at >= now() - INTERVAL 1 DAY
    GROUP BY factor
    ORDER BY affected DESC
    LIMIT 10
  `);

  const churned = churnRows[0]?.churned ?? 0;
  const totalActive = churnRows[0]?.total_active ?? 1;
  const totalRisk = riskRows.reduce((s, r) => s + r.cnt, 0) || 1;

  return {
    period: 'last_30d',
    churnRate: Math.round((churned / totalActive) * 10000) / 100,
    churnedUsers: churned,
    totalActiveUsers: totalActive,
    riskDistribution: riskRows.map(r => ({
      level: r.risk_level,
      count: r.cnt,
      percent: Math.round((r.cnt / totalRisk) * 10000) / 100,
    })),
    trend7d: trendRows.map(r => ({ date: r.dt, rate: r.rate })),
    topChurnFactors: factorRows.map(r => ({
      factor: r.factor,
      avgWeight: Math.round(r.avg_weight * 100) / 100,
      affectedUsers: r.affected,
    })),
  };
}

// ─── 추천 CTR ───────────────────────────────────────────────────

export interface RecommendationCTRSnapshot {
  period: string;
  overallCTR: number;           // 0~100%
  impressions: number;
  clicks: number;
  byCategory: { category: string; impressions: number; clicks: number; ctr: number }[];
  byAlgorithm: { algorithm: string; impressions: number; clicks: number; ctr: number }[];
  trend7d: { date: string; ctr: number; impressions: number }[];
}

/** 추천 시스템 CTR 대시보드 */
export async function getRecommendationCTR(
  period: '1d' | '7d' | '30d' = '7d',
): Promise<RecommendationCTRSnapshot> {
  const intervalMap = { '1d': '1 DAY', '7d': '7 DAY', '30d': '30 DAY' };
  const interval = intervalMap[period];

  const overallRows = await queryClickHouse<{ impressions: number; clicks: number }>(`
    SELECT
      count(*) AS impressions,
      countIf(clicked = 1) AS clicks
    FROM recommendation_impressions
    WHERE ts >= now() - INTERVAL ${interval}
  `);

  const categoryRows = await queryClickHouse<{
    category: string; impressions: number; clicks: number;
  }>(`
    SELECT
      category,
      count(*) AS impressions,
      countIf(clicked = 1) AS clicks
    FROM recommendation_impressions
    WHERE ts >= now() - INTERVAL ${interval}
    GROUP BY category
    ORDER BY impressions DESC
  `);

  const algorithmRows = await queryClickHouse<{
    algorithm: string; impressions: number; clicks: number;
  }>(`
    SELECT
      algorithm,
      count(*) AS impressions,
      countIf(clicked = 1) AS clicks
    FROM recommendation_impressions
    WHERE ts >= now() - INTERVAL ${interval}
    GROUP BY algorithm
  `);

  const trendRows = await queryClickHouse<{
    dt: string; impressions: number; clicks: number;
  }>(`
    SELECT
      toDate(ts) AS dt,
      count(*) AS impressions,
      countIf(clicked = 1) AS clicks
    FROM recommendation_impressions
    WHERE ts >= now() - INTERVAL 7 DAY
    GROUP BY dt
    ORDER BY dt
  `);

  const totalImpressions = overallRows[0]?.impressions ?? 0;
  const totalClicks = overallRows[0]?.clicks ?? 0;

  return {
    period,
    overallCTR: totalImpressions > 0
      ? Math.round((totalClicks / totalImpressions) * 10000) / 100
      : 0,
    impressions: totalImpressions,
    clicks: totalClicks,
    byCategory: categoryRows.map(r => ({
      category: r.category,
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.impressions > 0 ? Math.round((r.clicks / r.impressions) * 10000) / 100 : 0,
    })),
    byAlgorithm: algorithmRows.map(r => ({
      algorithm: r.algorithm,
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.impressions > 0 ? Math.round((r.clicks / r.impressions) * 10000) / 100 : 0,
    })),
    trend7d: trendRows.map(r => ({
      date: r.dt,
      ctr: r.impressions > 0 ? Math.round((r.clicks / r.impressions) * 10000) / 100 : 0,
      impressions: r.impressions,
    })),
  };
}

// ─── 종합 대시보드 API 인터페이스 ────────────────────────────────

export interface DashboardOverview {
  timestamp: string;
  ccu: CCUSnapshot;
  revenue: RevenueSnapshot;
  churn: ChurnRateSnapshot;
  recommendationCTR: RecommendationCTRSnapshot;
  systemHealth: SystemHealthSnapshot;
  alerts: DashboardAlert[];
}

export interface SystemHealthSnapshot {
  serverUptime: number;          // seconds
  avgResponseTimeMs: number;
  errorRate: number;             // 0~100%
  activeWebSockets: number;
  queueDepth: number;
  clickhouseStatus: 'healthy' | 'degraded' | 'down';
  redisStatus: 'healthy' | 'degraded' | 'down';
  dbStatus: 'healthy' | 'degraded' | 'down';
}

export interface DashboardAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'ccu' | 'revenue' | 'churn' | 'security' | 'system';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

/** 종합 대시보드 — 단일 호출로 전체 운영 현황 취합 */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  const [ccu, revenue, churn, recommendationCTR] = await Promise.all([
    getCurrentCCU(),
    getRevenueSnapshot('today'),
    getChurnRateSnapshot(),
    getRecommendationCTR('7d'),
  ]);

  // 시스템 헬스 (간이 — 실제로는 Prometheus/Datadog 연동)
  const systemHealth: SystemHealthSnapshot = {
    serverUptime: process.uptime(),
    avgResponseTimeMs: 0,   // APM 연동 시 채워짐
    errorRate: 0,
    activeWebSockets: 0,    // Socket.io 인스턴스에서 주입
    queueDepth: 0,
    clickhouseStatus: 'healthy',
    redisStatus: 'healthy',
    dbStatus: 'healthy',
  };

  // 자동 알림 생성
  const alerts: DashboardAlert[] = [];

  if (ccu.ccu < ccu.avg24h * 0.5) {
    alerts.push({
      id: `alert_ccu_drop_${Date.now()}`,
      severity: 'warning',
      category: 'ccu',
      message: `CCU가 24시간 평균 대비 50% 이하로 하락 (현재: ${ccu.ccu}, 평균: ${ccu.avg24h})`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });
  }

  if (churn.churnRate > 15) {
    alerts.push({
      id: `alert_churn_high_${Date.now()}`,
      severity: 'critical',
      category: 'churn',
      message: `이탈률 ${churn.churnRate}% — 15% 임계치 초과`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });
  }

  if (revenue.comparisonPeriod && revenue.comparisonPeriod.changePercent < -20) {
    alerts.push({
      id: `alert_revenue_drop_${Date.now()}`,
      severity: 'warning',
      category: 'revenue',
      message: `매출 전기 대비 ${revenue.comparisonPeriod.changePercent}% 하락`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });
  }

  return {
    timestamp: new Date().toISOString(),
    ccu,
    revenue,
    churn,
    recommendationCTR,
    systemHealth,
    alerts,
  };
}

// ─── Grafana 임베드 URL 생성 ────────────────────────────────────

export interface GrafanaDashboardConfig {
  baseUrl: string;
  orgId: number;
  apiKey: string;
}

const DEFAULT_GRAFANA: GrafanaDashboardConfig = {
  baseUrl: process.env.GRAFANA_URL ?? 'http://localhost:3001',
  orgId: parseInt(process.env.GRAFANA_ORG_ID ?? '1', 10),
  apiKey: process.env.GRAFANA_API_KEY ?? '',
};

export type GrafanaPanelType =
  | 'ccu_realtime'
  | 'revenue_daily'
  | 'churn_trend'
  | 'recommendation_ctr'
  | 'system_health'
  | 'anomaly_alerts'
  | 'player_heatmap'
  | 'economy_flow';

const PANEL_UID_MAP: Record<GrafanaPanelType, { dashUid: string; panelId: number }> = {
  ccu_realtime:       { dashUid: 'aeterna-ops-main', panelId: 1 },
  revenue_daily:      { dashUid: 'aeterna-ops-main', panelId: 2 },
  churn_trend:        { dashUid: 'aeterna-ops-ml', panelId: 1 },
  recommendation_ctr: { dashUid: 'aeterna-ops-ml', panelId: 2 },
  system_health:      { dashUid: 'aeterna-ops-infra', panelId: 1 },
  anomaly_alerts:     { dashUid: 'aeterna-ops-security', panelId: 1 },
  player_heatmap:     { dashUid: 'aeterna-ops-players', panelId: 1 },
  economy_flow:       { dashUid: 'aeterna-ops-economy', panelId: 1 },
};

/** Grafana 패널 임베드 URL 생성 (iframe 용) */
export function generateGrafanaEmbedUrl(
  panelType: GrafanaPanelType,
  opts?: {
    from?: string;  // Grafana 시간 범위 (예: 'now-6h')
    to?: string;
    theme?: 'light' | 'dark';
    refresh?: string; // 예: '10s', '1m'
    vars?: Record<string, string>;
  },
  config: GrafanaDashboardConfig = DEFAULT_GRAFANA,
): string {
  const panel = PANEL_UID_MAP[panelType];
  const from = opts?.from ?? 'now-6h';
  const to = opts?.to ?? 'now';
  const theme = opts?.theme ?? 'dark';
  const refresh = opts?.refresh ?? '30s';

  const params = new URLSearchParams({
    orgId: String(config.orgId),
    from,
    to,
    theme,
    refresh,
    panelId: String(panel.panelId),
  });

  // 추가 변수 (e.g. region, platform 필터)
  if (opts?.vars) {
    for (const [key, value] of Object.entries(opts.vars)) {
      params.append(`var-${key}`, value);
    }
  }

  return `${config.baseUrl}/d-solo/${panel.dashUid}?${params.toString()}`;
}

/** 전체 대시보드 URL 생성 */
export function generateGrafanaDashboardUrl(
  dashboardType: 'main' | 'ml' | 'infra' | 'security' | 'players' | 'economy',
  config: GrafanaDashboardConfig = DEFAULT_GRAFANA,
): string {
  const uidMap: Record<string, string> = {
    main: 'aeterna-ops-main',
    ml: 'aeterna-ops-ml',
    infra: 'aeterna-ops-infra',
    security: 'aeterna-ops-security',
    players: 'aeterna-ops-players',
    economy: 'aeterna-ops-economy',
  };
  return `${config.baseUrl}/d/${uidMap[dashboardType]}?orgId=${config.orgId}`;
}

// ─── 어드민 API 라우트 헬퍼 ─────────────────────────────────────

/**
 * Fastify 라우트 등록용 — 어드민 인증 미들웨어 이후 사용
 *
 * GET /api/admin/analytics/overview    → getDashboardOverview()
 * GET /api/admin/analytics/ccu         → getCurrentCCU()
 * GET /api/admin/analytics/revenue     → getRevenueSnapshot(period)
 * GET /api/admin/analytics/churn       → getChurnRateSnapshot()
 * GET /api/admin/analytics/rec-ctr     → getRecommendationCTR(period)
 * GET /api/admin/analytics/grafana-url → generateGrafanaEmbedUrl(panel)
 */
export function registerDashboardRoutes(app: {
  get: (path: string, handler: (req: any, reply: any) => Promise<void>) => void;
}): void {
  app.get('/api/admin/analytics/overview', async (_req, reply) => {
    const data = await getDashboardOverview();
    reply.send(data);
  });

  app.get('/api/admin/analytics/ccu', async (_req, reply) => {
    const data = await getCurrentCCU();
    reply.send(data);
  });

  app.get('/api/admin/analytics/revenue', async (req, reply) => {
    const period = (req as any).query?.period ?? 'today';
    const data = await getRevenueSnapshot(period);
    reply.send(data);
  });

  app.get('/api/admin/analytics/churn', async (_req, reply) => {
    const data = await getChurnRateSnapshot();
    reply.send(data);
  });

  app.get('/api/admin/analytics/rec-ctr', async (req, reply) => {
    const period = (req as any).query?.period ?? '7d';
    const data = await getRecommendationCTR(period);
    reply.send(data);
  });

  app.get('/api/admin/analytics/grafana-url', async (req, reply) => {
    const panel = (req as any).query?.panel as GrafanaPanelType;
    if (!panel || !PANEL_UID_MAP[panel]) {
      reply.status(400).send({ error: `Invalid panel type. Valid: ${Object.keys(PANEL_UID_MAP).join(', ')}` });
      return;
    }
    const url = generateGrafanaEmbedUrl(panel, {
      from: (req as any).query?.from,
      to: (req as any).query?.to,
      theme: (req as any).query?.theme,
      refresh: (req as any).query?.refresh,
    });
    reply.send({ panel, url });
  });

  console.log('[OperationsDashboard] 6 admin analytics routes registered');
}
