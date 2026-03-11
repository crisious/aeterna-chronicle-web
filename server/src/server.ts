import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { redisClient, redisConnected } from './redis';
import { prisma } from './db';
import { setupSocketHandlers } from './socket/socketHandler';
import { setupGuildSocketHandlers } from './socket/guildSocketHandler';
import { guildRoutes } from './routes/guildRoutes';
import { stopPruneTimer } from './telemetry/dialogueTelemetryServer';
import { initApm, shutdownApm, getMetricsSummary } from './apm';
import { registerPvpRoutes } from './routes/pvpRoutes';
import { startMatchmaker, stopMatchmaker } from './pvp/matchmaker';
import { setupPvpSocketHandlers } from './socket/pvpSocketHandler';
import { endingRoutes } from './routes/endingRoutes';
import { shopRoutes } from './routes/shopRoutes';
import { seasonPassRoutes } from './routes/seasonPassRoutes';
import { achievementRoutes } from './routes/achievementRoutes';
import { setupAchievementSocketHandlers } from './socket/achievementSocketHandler';
import { raidRoutes } from './routes/raidRoutes';
import { setupRaidSocketHandlers } from './socket/raidSocketHandler';
import { raidManager } from './raid/raidManager';
import { tickManager } from './tick/tickManager';
import { classRoutes } from './routes/classRoutes';
import { npcRoutes } from './routes/npcRoutes';
import { tickAllNpcs } from './npc/behaviorTree';
import { craftRoutes } from './routes/craftRoutes';
import { petRoutes } from './routes/petRoutes';
import { setupPetSocketHandlers } from './socket/petSocketHandler';
import { questRoutes } from './routes/questRoutes';
import { startQuestResetScheduler, stopQuestResetScheduler } from './quest/questEngine';
import { socialRoutes } from './routes/socialRoutes';
import { setupSocialSocketHandlers, bindSocialIO } from './socket/socialSocketHandler';
import { purgeExpiredMails } from './social/mailSystem';
import { adminRoutes } from './routes/adminRoutes';

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

        // 길드 REST API 라우트 등록
        await fastify.register(guildRoutes);
        fastify.log.info('Guild REST routes registered');

        // PvP REST API 라우트 등록
        await registerPvpRoutes(fastify);
        fastify.log.info('PvP API routes registered');

        // 엔딩 시스템 REST API 라우트 등록
        await fastify.register(endingRoutes);
        fastify.log.info('Ending system routes registered');

        // 상점 REST API 라우트 등록
        await fastify.register(shopRoutes);
        fastify.log.info('Shop routes registered');

        // 시즌 패스 REST API 라우트 등록
        await fastify.register(seasonPassRoutes);
        fastify.log.info('Season Pass routes registered');

        // 업적 시스템 REST API 라우트 등록
        await fastify.register(achievementRoutes);
        fastify.log.info('Achievement routes registered');

        // 레이드 보스 REST API 라우트 등록
        await fastify.register(raidRoutes);
        fastify.log.info('Raid boss routes registered');

        // 2차 전직 시스템 REST API 라우트 등록
        await fastify.register(classRoutes);
        fastify.log.info('Class advancement routes registered');

        // NPC 시스템 REST API 라우트 등록
        await fastify.register(npcRoutes);
        fastify.log.info('NPC routes registered');

        // 제작 시스템 REST API 라우트 등록
        await fastify.register(craftRoutes);
        fastify.log.info('Craft system routes registered');

        // 펫 시스템 REST API 라우트 등록
        await fastify.register(petRoutes);
        fastify.log.info('Pet system routes registered');

        // 퀘스트 시스템 REST API 라우트 등록
        await fastify.register(questRoutes);
        fastify.log.info('Quest system routes registered');

        // 소셜 시스템 REST API 라우트 등록 (친구/파티/우편)
        await fastify.register(socialRoutes);
        fastify.log.info('Social system routes registered');

        // 어드민 대시보드 REST API 라우트 등록 (P4-07)
        await fastify.register(adminRoutes);
        fastify.log.info('Admin dashboard routes registered');

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

        // PvP 소켓 핸들러 + 매칭 시스템 초기화
        setupPvpSocketHandlers(io);
        startMatchmaker(io);
        fastify.log.info('PvP matchmaker started');

        // 길드 소켓 이벤트 핸들러 초기화
        setupGuildSocketHandlers(io);
        fastify.log.info('Guild socket handlers attached');

        // 업적 소켓 이벤트 핸들러 초기화
        setupAchievementSocketHandlers(io);
        fastify.log.info('Achievement socket handlers attached');

        // 레이드 보스 소켓 핸들러 초기화
        setupRaidSocketHandlers(io);
        fastify.log.info('Raid boss socket handlers attached');

        // 펫 시스템 소켓 핸들러 초기화
        setupPetSocketHandlers(io);
        fastify.log.info('Pet socket handlers attached');

        // 소셜 시스템 소켓 핸들러 초기화 (친구/파티/우편 실시간 알림)
        setupSocialSocketHandlers(io);
        bindSocialIO(io);
        fastify.log.info('Social socket handlers attached');

        // Redis 연결 시작 (graceful degradation)
        try {
            await redisClient.connect();
            fastify.log.info('Connected to Redis In-Memory Store');
        } catch (redisErr) {
            fastify.log.warn(`Redis connection failed, continuing without Redis: ${redisErr}`);
        }

        // ── 틱 매니저 초기화 (P3-18: 서버 틱 계층화) ──
        // 물리 틱 (20Hz): 충돌/위치 계산
        tickManager.on('physics', (deltaMs) => {
            // TODO: 물리 시뮬레이션 콜백 연결
            void deltaMs;
        });

        // 네트워크 틱 (10Hz): 상태 브로드캐스트
        tickManager.on('network', (_deltaMs) => {
            // TODO: io.emit으로 월드 상태 브로드캐스트
            void _deltaMs;
        });

        // 로직 틱 (2Hz): AI/스폰/버프 만료
        tickManager.on('logic', (deltaMs) => {
            // NPC 행동 트리 AI 업데이트
            tickAllNpcs(deltaMs);
            // TODO: 스폰 체크, 버프 만료 처리
        });

        tickManager.start();
        fastify.log.info('Tick manager started (physics:20Hz, network:10Hz, logic:2Hz)');

        // 퀘스트 일일/주간 초기화 스케줄러 시작
        startQuestResetScheduler();
        fastify.log.info('Quest reset scheduler started');

        // ── 만료 우편 정리 타이머 (1시간 간격) ──
        const mailPurgeInterval = setInterval(async () => {
          try {
            const count = await purgeExpiredMails();
            if (count > 0) fastify.log.info(`[Mail] 만료 우편 ${count}건 삭제`);
          } catch (err) {
            fastify.log.error(`[Mail] 만료 우편 정리 실패: ${err}`);
          }
        }, 60 * 60 * 1000);
        // graceful shutdown에서 정리할 수 있도록 저장
        (fastify as unknown as Record<string, unknown>)._mailPurgeInterval = mailPurgeInterval;

    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

// ── Graceful Shutdown ────────────────────────────────────────
async function gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n[Shutdown] ${signal} received. Graceful shutdown 시작...`);

    // 0) 퀘스트 스케줄러 + 틱 매니저 정지
    stopQuestResetScheduler();
    console.log('[Shutdown] Quest reset scheduler stopped');
    tickManager.stop();
    console.log('[Shutdown] Tick manager stopped');

    // 0.5) 레이드 매니저 정리
    raidManager.shutdown();
    console.log('[Shutdown] Raid manager stopped');

    // 1) 매칭 시스템 정지
    stopMatchmaker();
    console.log('[Shutdown] Matchmaker stopped');

    // 2) APM 타이머 정리
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
