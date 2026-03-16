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
    await fastify.register(cors, { origin: ALLOWED_ORIGINS });

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
