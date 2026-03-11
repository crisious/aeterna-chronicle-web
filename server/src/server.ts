import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { redisClient, redisConnected } from './redis';
import { prisma } from './db';
import { setupSocketHandlers } from './socket/socketHandler';
import { stopPruneTimer } from './telemetry/dialogueTelemetryServer';
import { initApm, shutdownApm, getMetricsSummary } from './apm';

const fastify = Fastify({ logger: true });

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

async function startServer() {
    try {
        // CORS 설정 추가
        await fastify.register(cors, {
            origin: ALLOWED_ORIGINS
        });

        // 헬스 체크 API 엔드포인트 (메트릭 요약 포함 옵션: ?metrics=true)
        fastify.get('/api/health', async (request, _reply) => {
            const query = request.query as Record<string, string>;
            const base = { status: 'ok', game: 'Aeterna Chronicle', phase: 1 };
            if (query.metrics === 'true') {
                return { ...base, apm: getMetricsSummary() };
            }
            return base;
        });

        const PORT = parseInt(process.env.PORT || '3000', 10);

        // HTTP 서버 실행 (Socket.io 부착을 위해 fastify.server 사용)
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        fastify.log.info(`API Server listening on http://localhost:${PORT}`);

        // Fastify HTTP 서버에 Socket.io 서버 바인딩
        const io = new Server(fastify.server, {
            cors: {
                origin: ALLOWED_ORIGINS,
            }
        });

        // APM 초기화 (HTTP 훅 + 대시보드 + 메트릭 수집 + 알림)
        await initApm(fastify, io);
        fastify.log.info('APM monitoring initialized');

        // 웹소켓 이벤트 핸들러 초기화 (Protobuf 코덱 로딩 포함)
        await setupSocketHandlers(io);
        fastify.log.info(`Socket Server attached`);

        // Redis 연결 시작 (graceful degradation)
        try {
            await redisClient.connect();
            fastify.log.info('Connected to Redis In-Memory Store');
        } catch (redisErr) {
            fastify.log.warn(`Redis connection failed, continuing without Redis: ${redisErr}`);
        }

    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

// ── Graceful Shutdown ────────────────────────────────────────
async function gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n[Shutdown] ${signal} received. Graceful shutdown 시작...`);

    // 1) APM 타이머 정리
    await shutdownApm();
    console.log('[Shutdown] APM shutdown completed');

    // 2) 텔레메트리 prune 타이머 정리
    stopPruneTimer();
    console.log('[Shutdown] Telemetry prune timer stopped');

    // 3) Fastify (HTTP + Socket.io) 종료
    try {
        await fastify.close();
        console.log('[Shutdown] Fastify server closed');
    } catch (err) {
        console.error('[Shutdown] Fastify close error:', err);
    }

    // 4) Redis 연결 종료
    if (redisConnected) {
        try {
            await redisClient.quit();
            console.log('[Shutdown] Redis disconnected');
        } catch (err) {
            console.error('[Shutdown] Redis quit error:', err);
        }
    }

    // 5) Prisma (PostgreSQL) 연결 종료
    try {
        await prisma.$disconnect();
        console.log('[Shutdown] Prisma disconnected');
    } catch (err) {
        console.error('[Shutdown] Prisma disconnect error:', err);
    }

    console.log('[Shutdown] Graceful shutdown 완료');
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
