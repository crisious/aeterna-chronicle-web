import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { setupSocketHandlers } from './socket/socketHandler';

const fastify = Fastify({ logger: true });

// 1. PostgreSQL ORM (PrismaClient)
export const prisma = new PrismaClient();

// 2. Redis Client (캐싱 및 상태 동기화)
export const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

async function startServer() {
    try {
        // CORS 설정 추가
        await fastify.register(cors, {
            origin: '*' // 운영 시에는 프론트엔드 도메인으로 한정
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
                origin: '*',
            }
        });

        // 웹소켓 이벤트 핸들러 초기화
        setupSocketHandlers(io);
        fastify.log.info(`Socket Server attached`);

        // Redis 연결 시작
        redisClient.on('error', (err) => console.log('Redis Client Error', err));
        await redisClient.connect();
        fastify.log.info('Connected to Redis In-Memory Store');

    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

startServer();
