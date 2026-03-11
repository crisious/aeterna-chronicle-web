/**
 * APM 대시보드 엔드포인트 — 메트릭 JSON 및 상세 헬스 반환
 */

import { FastifyInstance } from 'fastify';
import { getMetricsSummary } from './metrics';

/** APM 대시보드 라우트 등록 */
export function registerApmRoutes(fastify: FastifyInstance): void {
    /**
     * GET /api/apm/metrics — 전체 메트릭 JSON 반환
     * 슬라이딩 윈도우 기반 실시간 데이터
     */
    fastify.get('/api/apm/metrics', async (_request, _reply) => {
        return getMetricsSummary();
    });

    /**
     * GET /api/apm/health — 상세 헬스체크
     * latency p50/p95/p99, 메모리, 연결 수, 이벤트 처리량
     */
    fastify.get('/api/apm/health', async (_request, _reply) => {
        const summary = getMetricsSummary();

        // 임계치 기반 상태 판정
        const socketOk = summary.socketLatency.count === 0 || summary.socketLatency.p95 <= 150;
        const httpOk = summary.httpResponseTime.count === 0 || summary.httpResponseTime.p95 <= 500;
        const memoryOk = summary.memory.rss <= 512;
        const overallStatus = socketOk && httpOk && memoryOk ? 'healthy' : 'degraded';

        return {
            status: overallStatus,
            checks: {
                socketLatency: {
                    status: socketOk ? 'ok' : 'warning',
                    p50: summary.socketLatency.p50,
                    p95: summary.socketLatency.p95,
                    p99: summary.socketLatency.p99,
                    count: summary.socketLatency.count,
                },
                httpResponseTime: {
                    status: httpOk ? 'ok' : 'warning',
                    p50: summary.httpResponseTime.p50,
                    p95: summary.httpResponseTime.p95,
                    p99: summary.httpResponseTime.p99,
                    count: summary.httpResponseTime.count,
                },
                memory: {
                    status: memoryOk ? 'ok' : 'warning',
                    rssMb: summary.memory.rss,
                    heapUsedMb: summary.memory.heapUsed,
                    heapTotalMb: summary.memory.heapTotal,
                },
                connections: {
                    active: summary.activeConnections,
                },
                throughput: {
                    eventsPerSecond: summary.eventThroughput,
                },
            },
            uptime: summary.uptime,
            collectedAt: summary.collectedAt,
        };
    });

    console.log('[APM] 대시보드 라우트 등록: /api/apm/metrics, /api/apm/health');
}
