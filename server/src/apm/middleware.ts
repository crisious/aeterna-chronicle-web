/**
 * Fastify APM 미들웨어 — HTTP 요청/응답 시간 자동 측정
 * onRequest/onResponse 훅으로 비침투적 계측
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { recordHttpResponse } from './metrics';

/** 요청별 시작 시각 저장 (WeakMap은 사용 불가하므로 request 데코레이터 활용) */
declare module 'fastify' {
    interface FastifyRequest {
        _apmStartTime?: number;
    }
}

/** Fastify APM 훅 등록 */
export function registerApmHooks(fastify: FastifyInstance): void {
    // 요청 시작 시 타임스탬프 기록
    fastify.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
        request._apmStartTime = performance.now();
    });

    // 응답 완료 시 소요 시간 계산 및 기록
    fastify.addHook('onResponse', async (request: FastifyRequest, _reply: FastifyReply) => {
        if (request._apmStartTime !== undefined) {
            const elapsed = performance.now() - request._apmStartTime;
            const ms = Math.round(elapsed * 100) / 100;
            recordHttpResponse(request.url, ms);
        }
    });

    console.log('[APM] Fastify HTTP 훅 등록 완료');
}
