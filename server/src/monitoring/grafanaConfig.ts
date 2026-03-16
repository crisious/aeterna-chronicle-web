/**
 * Grafana 대시보드 + Prometheus/Loki 설정 — P4-18 로그/모니터링
 * 
 * 기능:
 *   - Grafana 대시보드 JSON 템플릿 생성
 *   - Prometheus 메트릭 엔드포인트 (/metrics)
 *   - Loki 로그 소스 설정 참조
 */

import { FastifyInstance } from 'fastify';
import { cacheMetricsPrometheus, getCacheMetrics } from '../cache/cacheLayer';
import { queryMetricsPrometheus, getQueryPatternStats, getOptimizationAdvice } from '../cache/queryOptimizer';

// ── Prometheus 메트릭 수집 ───────────────────────────────────

/** 서버 시작 시간 */
const serverStartTime = Date.now();

/** 요청 카운터 */
const requestCounters: Record<string, number> = {};
const errorCounters: Record<string, number> = {};
let totalRequests = 0;
let totalErrors = 0;

/** 요청 카운트 증가 (라우트 레벨) */
export function incrementRequestCount(method: string, path: string, statusCode: number): void {
  const key = `${method}:${path}`;
  requestCounters[key] = (requestCounters[key] || 0) + 1;
  totalRequests++;

  if (statusCode >= 400) {
    errorCounters[key] = (errorCounters[key] || 0) + 1;
    totalErrors++;
  }
}

/** Prometheus 텍스트 포맷 메트릭 생성 */
export function generatePrometheusMetrics(): string {
  const uptime = Math.round((Date.now() - serverStartTime) / 1000);
  const mem = process.memoryUsage();

  const lines: string[] = [
    // ── 서버 기본 메트릭 ──
    '# HELP aeterna_server_uptime_seconds 서버 가동 시간 (초)',
    '# TYPE aeterna_server_uptime_seconds gauge',
    `aeterna_server_uptime_seconds ${uptime}`,

    '# HELP aeterna_server_memory_rss_bytes RSS 메모리 (bytes)',
    '# TYPE aeterna_server_memory_rss_bytes gauge',
    `aeterna_server_memory_rss_bytes ${mem.rss}`,

    '# HELP aeterna_server_memory_heap_used_bytes 힙 사용량 (bytes)',
    '# TYPE aeterna_server_memory_heap_used_bytes gauge',
    `aeterna_server_memory_heap_used_bytes ${mem.heapUsed}`,

    '# HELP aeterna_server_memory_heap_total_bytes 힙 전체 (bytes)',
    '# TYPE aeterna_server_memory_heap_total_bytes gauge',
    `aeterna_server_memory_heap_total_bytes ${mem.heapTotal}`,

    // ── HTTP 메트릭 ──
    '# HELP aeterna_http_requests_total HTTP 요청 총 수',
    '# TYPE aeterna_http_requests_total counter',
    `aeterna_http_requests_total ${totalRequests}`,

    '# HELP aeterna_http_errors_total HTTP 에러 총 수',
    '# TYPE aeterna_http_errors_total counter',
    `aeterna_http_errors_total ${totalErrors}`,
  ];

  // 라우트별 요청 카운트
  lines.push('# HELP aeterna_http_route_requests_total 라우트별 요청 수');
  lines.push('# TYPE aeterna_http_route_requests_total counter');
  for (const [route, count] of Object.entries(requestCounters)) {
    const [method, path] = route.split(':');
    lines.push(`aeterna_http_route_requests_total{method="${method}",path="${path}"} ${count}`);
  }

  // ── 캐시 + 쿼리 메트릭 (P4-16) ──
  lines.push('');
  lines.push(cacheMetricsPrometheus());
  lines.push('');
  lines.push(queryMetricsPrometheus());

  return lines.join('\n') + '\n';
}

// ── Prometheus /metrics 엔드포인트 등록 ──────────────────────

/**
 * Fastify에 /metrics 엔드포인트 등록.
 * Prometheus가 scrape하는 표준 엔드포인트.
 */
export function registerMetricsEndpoint(app: FastifyInstance): void {
  app.get('/metrics', async (_request, reply) => {
    const body = generatePrometheusMetrics();
    return reply
      .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
      .send(body);
  });

  // 캐시 메트릭 JSON 엔드포인트 (어드민 대시보드용)
  app.get('/api/admin/cache-metrics', async () => {
    return {
      cache: getCacheMetrics(),
      queries: {
        patterns: getQueryPatternStats().slice(0, 20),
        advice: getOptimizationAdvice(),
      },
    };
  });
}

// ── Grafana 대시보드 JSON 템플릿 ─────────────────────────────

/** 서버 메트릭 대시보드 */
export function grafanaDashboardServerMetrics(): object {
  return {
    dashboard: {
      id: null,
      uid: 'aeterna-server-metrics',
      title: 'Aeterna Chronicle - 서버 메트릭',
      tags: ['aeterna', 'server'],
      timezone: 'Asia/Seoul',
      refresh: '10s',
      panels: [
        {
          id: 1,
          title: '서버 가동 시간',
          type: 'stat',
          gridPos: { h: 4, w: 6, x: 0, y: 0 },
          targets: [
            { expr: 'aeterna_server_uptime_seconds', legendFormat: 'Uptime (초)' },
          ],
        },
        {
          id: 2,
          title: '메모리 사용량',
          type: 'timeseries',
          gridPos: { h: 8, w: 12, x: 0, y: 4 },
          targets: [
            { expr: 'aeterna_server_memory_rss_bytes / 1024 / 1024', legendFormat: 'RSS (MB)' },
            { expr: 'aeterna_server_memory_heap_used_bytes / 1024 / 1024', legendFormat: 'Heap Used (MB)' },
          ],
        },
        {
          id: 3,
          title: '캐시 히트율',
          type: 'gauge',
          gridPos: { h: 4, w: 6, x: 6, y: 0 },
          targets: [
            { expr: 'aeterna_cache_hit_rate', legendFormat: 'Hit Rate (%)' },
          ],
        },
        {
          id: 4,
          title: 'HTTP 요청 수 (총합)',
          type: 'stat',
          gridPos: { h: 4, w: 6, x: 12, y: 0 },
          targets: [
            { expr: 'aeterna_http_requests_total', legendFormat: 'Total Requests' },
          ],
        },
        {
          id: 5,
          title: '슬로우 쿼리 수',
          type: 'stat',
          gridPos: { h: 4, w: 6, x: 18, y: 0 },
          targets: [
            { expr: 'aeterna_query_slow_total', legendFormat: 'Slow Queries' },
          ],
        },
      ],
    },
  };
}

/** API 레이턴시 대시보드 */
export function grafanaDashboardApiLatency(): object {
  return {
    dashboard: {
      id: null,
      uid: 'aeterna-api-latency',
      title: 'Aeterna Chronicle - API 레이턴시',
      tags: ['aeterna', 'api', 'latency'],
      timezone: 'Asia/Seoul',
      refresh: '10s',
      panels: [
        {
          id: 1,
          title: '라우트별 요청 수',
          type: 'table',
          gridPos: { h: 10, w: 24, x: 0, y: 0 },
          targets: [
            { expr: 'aeterna_http_route_requests_total', legendFormat: '{{method}} {{path}}' },
          ],
        },
        {
          id: 2,
          title: 'N+1 쿼리 경고',
          type: 'stat',
          gridPos: { h: 4, w: 8, x: 0, y: 10 },
          targets: [
            { expr: 'aeterna_query_n_plus_one_total', legendFormat: 'N+1 Warnings' },
          ],
        },
      ],
    },
  };
}

/** 에러율 대시보드 */
export function grafanaDashboardErrorRate(): object {
  return {
    dashboard: {
      id: null,
      uid: 'aeterna-error-rate',
      title: 'Aeterna Chronicle - 에러율',
      tags: ['aeterna', 'errors'],
      timezone: 'Asia/Seoul',
      refresh: '10s',
      panels: [
        {
          id: 1,
          title: 'HTTP 에러 수',
          type: 'timeseries',
          gridPos: { h: 8, w: 12, x: 0, y: 0 },
          targets: [
            { expr: 'aeterna_http_errors_total', legendFormat: 'Errors' },
          ],
        },
        {
          id: 2,
          title: '에러율 (%)',
          type: 'gauge',
          gridPos: { h: 8, w: 12, x: 12, y: 0 },
          targets: [
            { expr: 'aeterna_http_errors_total / aeterna_http_requests_total * 100', legendFormat: 'Error Rate (%)' },
          ],
        },
      ],
    },
  };
}

/** Loki 데이터 소스 설정 참조 */
export function lokiDataSourceConfig(): object {
  return {
    name: 'Aeterna Loki',
    type: 'loki',
    access: 'proxy',
    url: process.env.LOKI_URL || 'http://loki:3100',
    jsonData: {
      maxLines: 1000,
    },
  };
}

/** Prometheus 데이터 소스 설정 참조 */
export function prometheusDataSourceConfig(): object {
  return {
    name: 'Aeterna Prometheus',
    type: 'prometheus',
    access: 'proxy',
    url: process.env.PROMETHEUS_URL || 'http://prometheus:9090',
    jsonData: {
      timeInterval: '10s',
    },
  };
}
