/**
 * compositionRoot.ts — 앱 조립 진입점
 * P10-01: server.ts 부트스트랩 분해
 *
 * Fastify 생성 → 미들웨어 → 라우트 → HTTP 시작 → Socket.io → 서비스 초기화 → shutdown 등록
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';

import { registerRoutes, registerSocketHandlers } from './featureRegistry';
import { registerMiddleware, initInfraServices, initTickManager, initSpawnManager, startSchedulers } from './runtimeServices';
import { registerShutdownHandlers } from './shutdownManager';
import { socketAuthGate } from '../security/socketAuthGate';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

/**
 * 서버 전체 조립 및 시작
 */
export async function bootstrap(): Promise<void> {
  const fastify = Fastify({ logger: true });

  try {
    // 1. CORS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @fastify/cors@9 types expect Fastify v5, server runs v4
    await fastify.register(cors as any, { origin: ALLOWED_ORIGINS });

    // 2. 글로벌 미들웨어 (에러 핸들러, 보안, APM 메트릭 훅)
    await registerMiddleware(fastify);

    // 3. REST 라우트 등록 (선언형 매니페스트)
    await registerRoutes(fastify);

    // 4. HTTP 서버 시작
    const PORT = parseInt(process.env.PORT || '3000', 10);
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`API Server listening on http://localhost:${PORT}`);

    // 5. Socket.io 바인딩 + 핸들러 등록
    const io = new Server(fastify.server, { cors: { origin: ALLOWED_ORIGINS } });
    // 5-0. 핸드셰이크 인증 미들웨어 (deny-by-default). 모든 connection 핸들러 등록보다 먼저 둬야
    //      인증되지 않은 소켓이 존재할 수 있는 창을 없앤다. io.use 는 connection 보다 항상 먼저 실행된다.
    //      검증된 userId 는 socket.data.userId 에 주입되어 핸들러가 클라 payload 대신 actor 로 사용한다.
    io.use((socket, next) => { void socketAuthGate(socket, next); });
    // 기능별 소켓 모듈이 기본 namespace에 connection listener를 나눠 등록한다.
    // 등록 모듈 수가 Node 기본 limit(10)을 넘는 것이 정상 구조라, 누수 오탐 경고를 방지한다.
    io.setMaxListeners(64);
    io.of('/').setMaxListeners(64);
    await registerSocketHandlers(io, fastify);

    // 6. 인프라 서비스 (APM, Redis)
    await initInfraServices(fastify, io);

    // 7. 틱 매니저 + 스폰 매니저
    initTickManager(io, fastify);
    await initSpawnManager(fastify);

    // 8. 스케줄러 (퀘스트 리셋, 이벤트 동기화, 제재 만료, 우편 정리)
    const schedulerIntervals = startSchedulers(fastify);

    // 9. Graceful shutdown
    registerShutdownHandlers(fastify, schedulerIntervals);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
