/**
 * APM 통합 모듈 — 초기화/종료 진입점
 * 메트릭 수집, 알림 체크, HTTP 훅, 대시보드를 일괄 관리
 */

import { FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import {
    startMetricsCollection,
    stopMetricsCollection,
    incrementConnections,
    decrementConnections,
} from './metrics';
import { startAlertChecker, stopAlertChecker } from './alerts';
import { registerApmHooks } from './middleware';
import { registerApmRoutes } from './dashboard';

// 외부에서 사용할 메트릭 함수 re-export
export {
    recordSocketLatency,
    recordHttpResponse,
    getMetricsSummary,
    incrementConnections,
    decrementConnections,
} from './metrics';

export { startAlertChecker, stopAlertChecker } from './alerts';

/**
 * APM 전체 초기화
 * - Fastify HTTP 훅 등록 (응답 시간 측정)
 * - 대시보드 라우트 등록
 * - 메트릭 수집 시작 (메모리 샘플링)
 * - Socket.IO 연결 수 추적
 * - 알림 체커 시작
 */
export async function initApm(
    fastify: FastifyInstance,
    io: SocketIOServer
): Promise<void> {
    console.log('[APM] 초기화 시작...');

    // 1) Fastify HTTP 훅 등록 (onRequest/onResponse)
    registerApmHooks(fastify);

    // 2) 대시보드 엔드포인트 등록
    registerApmRoutes(fastify);

    // 3) 메트릭 수집 시작 (메모리 5초 간격 샘플링)
    startMetricsCollection(5000);

    // 4) Socket.IO 연결 수 추적
    io.on('connection', (socket) => {
        incrementConnections();
        socket.on('disconnect', () => {
            decrementConnections();
        });
    });

    // 5) 알림 체커 시작 (10초 간격)
    startAlertChecker();

    console.log('[APM] 초기화 완료');
}

/**
 * APM 종료 — 타이머 정리
 */
export async function shutdownApm(): Promise<void> {
    stopAlertChecker();
    stopMetricsCollection();
    console.log('[APM] 종료 완료');
}
