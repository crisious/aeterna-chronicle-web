import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { redisClient, redisConnected } from './redis';
import { prisma } from './db';
import { setupSocketHandlers } from './socket/socketHandler';
import { stopPruneTimer } from './telemetry/dialogueTelemetryServer';

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

        // 헬스 체크 API 엔드포인트
        fastify.get('/api/health', async (request, reply) => {
            return { status: 'ok', game: 'Aeterna Chronicle', phase: 1 };
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

        // 웹소켓 이벤트 핸들러 초기화
        setupSocketHandlers(io);
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

    // 1) 텔레메트리 prune 타이머 정리
    stopPruneTimer();
    console.log('[Shutdown] Telemetry prune timer stopped');

    // 2) Fastify (HTTP + Socket.io) 종료
    try {
        await fastify.close();
        console.log('[Shutdown] Fastify server closed');
    } catch (err) {
        console.error('[Shutdown] Fastify close error:', err);
    }

    // 3) Redis 연결 종료
    if (redisConnected) {
        try {
            await redisClient.quit();
            console.log('[Shutdown] Redis disconnected');
        } catch (err) {
            console.error('[Shutdown] Redis quit error:', err);
        }
    }

    // 4) Prisma (PostgreSQL) 연결 종료
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
