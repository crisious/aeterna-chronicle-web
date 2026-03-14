/**
 * runtimeServices.ts — Redis, Prisma, tick, scheduler, APM 초기화
 * P10-01: server.ts 부트스트랩 분해
 */
import type { FastifyInstance } from 'fastify';
import type { Server as SocketServer } from 'socket.io';

import { redisClient } from '../redis';
import { initApm } from '../apm';
import { tickManager } from '../tick/tickManager';
import { spawnManager } from '../monster/spawnManager';
import { statusEffectManager } from '../combat/statusEffectManager';
import { tickAllNpcs } from '../npc/behaviorTree';
import { getCharacterMaxHp } from '../combat/hpResolver';
import { startQuestResetScheduler } from '../quest/questEngine';
import { syncEventStatus } from '../event/eventEngine';
import { expireOverdueSanctions } from '../report/reportManager';
import { purgeExpiredMails } from '../social/mailSystem';
import { rateLimitMiddleware } from '../security/rateLimiter';
import { inputValidatorMiddleware } from '../security/inputValidator';
import { registerErrorHandler } from '../error/errorHandler';
import { opsAlertManager } from '../ops/opsAlertManager';

/**
 * 글로벌 미들웨어/훅 등록 (보안, 에러 핸들러, APM 메트릭)
 */
export async function registerMiddleware(fastify: FastifyInstance): Promise<void> {
  await registerErrorHandler(fastify);
  fastify.log.info('Global error handler registered');

  fastify.addHook('preHandler', rateLimitMiddleware);
  fastify.addHook('preHandler', inputValidatorMiddleware);
  fastify.log.info('Global security middleware registered (rate limiter + input validator)');

  fastify.addHook('onResponse', (req, reply, done) => {
    const latency = reply.elapsedTime ?? 0;
    const isError = reply.statusCode >= 500;
    opsAlertManager.recordRequest(latency, isError);
    done();
  });
}

/**
 * APM + Redis 초기화
 */
export async function initInfraServices(fastify: FastifyInstance, io: SocketServer): Promise<void> {
  // APM (graceful — 실패해도 서버 가동)
  try {
    await initApm(fastify, io);
    fastify.log.info('APM monitoring initialized');
  } catch (err) {
    fastify.log.warn({ err }, 'APM init skipped (non-critical)');
  }

  // Redis (graceful degradation)
  try {
    await redisClient.connect();
    fastify.log.info('Connected to Redis In-Memory Store');
  } catch (redisErr) {
    fastify.log.warn(`Redis connection failed, continuing without Redis: ${redisErr}`);
  }
}

/**
 * 틱 매니저 초기화 (physics/network/logic)
 */
export function initTickManager(io: SocketServer, fastify: FastifyInstance): void {
  // 물리 틱 (20Hz)
  tickManager.on('physics', (_deltaMs) => {
    // Reserved: 서버 권위적 물리 시뮬레이션 (Phase 8+)
  });

  // 네트워크 틱 (10Hz)
  tickManager.on('network', (_deltaMs) => {
    const rooms = io.sockets.adapter.rooms;
    for (const [roomName] of rooms) {
      if (!roomName.startsWith('zone:')) continue;
      const zoneCode = roomName.slice(5);
      const worldState = {
        zone: zoneCode,
        timestamp: Date.now(),
        spawns: spawnManager.getActiveSpawns(zoneCode),
        activeEffects: statusEffectManager.getActiveEffectsSummary(),
      };
      io.to(roomName).emit('world:state', worldState);
    }
  });

  // 로직 틱 (2Hz)
  tickManager.on('logic', (deltaMs) => {
    tickAllNpcs(deltaMs);
    spawnManager.tick(deltaMs, (_zoneId: string) => []);
    statusEffectManager.tick(
      deltaMs / 1000,
      (targetId: string) => getCharacterMaxHp(targetId),
    );
  });

  tickManager.start();
  fastify.log.info('Tick manager started (physics:20Hz, network:10Hz, logic:2Hz)');
}

/**
 * 몬스터 스폰 매니저 초기화
 */
export async function initSpawnManager(fastify: FastifyInstance): Promise<void> {
  try {
    await spawnManager.initialize();
    fastify.log.info('Monster spawn manager initialized');
  } catch (spawnErr) {
    fastify.log.warn(`Spawn manager init failed (DB may not have monster data): ${spawnErr}`);
  }
}

/**
 * 스케줄러/타이머 시작 (퀘스트 리셋, 이벤트 동기화, 제재 만료, 우편 정리)
 * 반환: cleanup에 필요한 interval ID 배열
 */
export function startSchedulers(fastify: FastifyInstance): NodeJS.Timeout[] {
  const intervals: NodeJS.Timeout[] = [];

  // 퀘스트 리셋 스케줄러
  startQuestResetScheduler();
  fastify.log.info('Quest reset scheduler started');

  // 이벤트 상태 동기화 (5분)
  intervals.push(setInterval(async () => {
    try {
      const result = await syncEventStatus();
      if (result.activated > 0 || result.deactivated > 0) {
        fastify.log.info(`[Event] 활성화 ${result.activated}건, 비활성화 ${result.deactivated}건`);
      }
    } catch (err) {
      fastify.log.error(`[Event] 상태 동기화 실패: ${err}`);
    }
  }, 5 * 60 * 1000));

  // 만료 제재 자동 해제 (5분)
  intervals.push(setInterval(async () => {
    try {
      const count = await expireOverdueSanctions();
      if (count > 0) fastify.log.info(`[Sanction] 만료 제재 ${count}건 해제`);
    } catch (err) {
      fastify.log.error(`[Sanction] 만료 제재 해제 실패: ${err}`);
    }
  }, 5 * 60 * 1000));

  // 만료 우편 정리 (1시간)
  intervals.push(setInterval(async () => {
    try {
      const count = await purgeExpiredMails();
      if (count > 0) fastify.log.info(`[Mail] 만료 우편 ${count}건 삭제`);
    } catch (err) {
      fastify.log.error(`[Mail] 만료 우편 정리 실패: ${err}`);
    }
  }, 60 * 60 * 1000));

  return intervals;
}
