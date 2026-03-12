/**
 * shutdownManager.ts — Graceful shutdown 로직
 * P10-01: server.ts 부트스트랩 분해
 */
import type { FastifyInstance } from 'fastify';

import { redisClient, redisConnected } from '../redis';
import { prisma } from '../db';
import { stopPruneTimer } from '../telemetry/dialogueTelemetryServer';
import { shutdownApm } from '../apm';
import { stopMatchmaker } from '../pvp/matchmaker';
import { stopMatchmaking } from '../matchmaking/matchmakingQueue';
import { stopQuestResetScheduler } from '../quest/questEngine';
import { tickManager } from '../tick/tickManager';
import { raidManager } from '../raid/raidManager';
import { spawnManager } from '../monster/spawnManager';
import { dungeonManager } from '../dungeon/dungeonManager';
import { auctionManager } from '../auction/auctionManager';
import { shutdownGuildWar } from '../guild/guildWarEngine';
import { resetAllDr } from '../pvp/pvpNormalizer';

/**
 * graceful shutdown 핸들러 등록
 * @param fastify Fastify 인스턴스
 * @param schedulerIntervals startSchedulers()가 반환한 interval ID들
 */
export function registerShutdownHandlers(
  fastify: FastifyInstance,
  schedulerIntervals: NodeJS.Timeout[],
): void {
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[Shutdown] ${signal} received. Graceful shutdown 시작...`);

    // 스케줄러/타이머 정지
    stopQuestResetScheduler();
    console.log('[Shutdown] Quest reset scheduler stopped');
    tickManager.stop();
    console.log('[Shutdown] Tick manager stopped');

    // 매니저 정리
    raidManager.shutdown();
    console.log('[Shutdown] Raid manager stopped');
    spawnManager.shutdown();
    console.log('[Shutdown] Monster spawn manager stopped');
    dungeonManager.shutdown();
    console.log('[Shutdown] Dungeon manager stopped');
    auctionManager.stopExpireTimer();
    console.log('[Shutdown] Auction expire timer stopped');
    shutdownGuildWar();
    console.log('[Shutdown] Guild war engine stopped');
    resetAllDr();
    console.log('[Shutdown] PvP diminishing returns cleared');

    // 매칭 시스템 정지
    stopMatchmaker();
    console.log('[Shutdown] PvP Matchmaker stopped');
    stopMatchmaking();
    console.log('[Shutdown] Party matchmaking queue stopped');

    // APM + 텔레메트리
    await shutdownApm();
    console.log('[Shutdown] APM shutdown completed');
    stopPruneTimer();
    console.log('[Shutdown] Telemetry prune timer stopped');

    // 스케줄러 interval 정리
    for (const interval of schedulerIntervals) {
      clearInterval(interval);
    }
    console.log('[Shutdown] Scheduler intervals cleared');

    // Fastify 종료
    try {
      await fastify.close();
      console.log('[Shutdown] Fastify server closed');
    } catch (err) {
      console.error('[Shutdown] Fastify close error:', err);
    }

    // Redis
    if (redisConnected) {
      try {
        await redisClient.quit();
        console.log('[Shutdown] Redis disconnected');
      } catch (err) {
        console.error('[Shutdown] Redis quit error:', err);
      }
    }

    // Prisma
    try {
      await prisma.$disconnect();
      console.log('[Shutdown] Prisma disconnected');
    } catch (err) {
      console.error('[Shutdown] Prisma disconnect error:', err);
    }

    console.log('[Shutdown] Graceful shutdown 완료');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
