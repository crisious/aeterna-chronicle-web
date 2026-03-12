/**
 * featureRegistry.ts — 선언형 기능 매니페스트 기반 라우트/소켓 자동 등록
 * P10-01: server.ts 부트스트랩 분해
 */
import type { FastifyInstance } from 'fastify';
import type { Server as SocketServer } from 'socket.io';

// ─── 라우트 임포트 ──────────────────────────────────────────
import { guildRoutes } from '../routes/guildRoutes';
import { registerPvpRoutes } from '../routes/pvpRoutes';
import { endingRoutes } from '../routes/endingRoutes';
import { shopRoutes } from '../routes/shopRoutes';
import { seasonPassRoutes } from '../routes/seasonPassRoutes';
import { achievementRoutes } from '../routes/achievementRoutes';
import { raidRoutes } from '../routes/raidRoutes';
import { classRoutes } from '../routes/classRoutes';
import { npcRoutes } from '../routes/npcRoutes';
import { craftRoutes } from '../routes/craftRoutes';
import { petRoutes } from '../routes/petRoutes';
import { questRoutes } from '../routes/questRoutes';
import { socialRoutes } from '../routes/socialRoutes';
import { economyRoutes } from '../routes/economyRoutes';
import { inventoryRoutes } from '../routes/inventoryRoutes';
import { eventRoutes } from '../routes/eventRoutes';
import { currencyRoutes } from '../routes/currencyRoutes';
import { adminRoutes, setAdminSocketIo } from '../routes/adminRoutes';
import { authRoutes } from '../routes/authRoutes';
import { tutorialRoutes } from '../routes/tutorialRoutes';
import { dungeonRoutes } from '../routes/dungeonRoutes';
import { worldRoutes } from '../routes/worldRoutes';
import { skillRoutes } from '../routes/skillRoutes';
import { codexRoutes } from '../routes/codexRoutes';
import { dialogueRoutes } from '../routes/dialogueRoutes';
import { notificationRoutes } from '../routes/notificationRoutes';
import { auctionRoutes } from '../routes/auctionRoutes';
import { rankingRoutes } from '../routes/rankingRoutes';
import { monsterRoutes } from '../routes/monsterRoutes';
import { errorRoutes } from '../routes/errorRoutes';
import { paymentRoutes } from '../routes/paymentRoutes';
import { cosmeticRoutes } from '../routes/cosmeticRoutes';
import { combatRoutes } from '../routes/combatRoutes';
import { matchmakingRoutes } from '../routes/matchmakingRoutes';
import { storyRoutes } from '../routes/storyRoutes';
import { saveRoutes } from '../routes/saveRoutes';
import { reportRoutes } from '../routes/reportRoutes';
import { analyticsRoutes } from '../routes/analyticsRoutes';
import { opsRoutes } from '../routes/opsRoutes';
import { betaRoutes } from '../routes/betaRoutes';

// ─── 소켓 핸들러 임포트 ─────────────────────────────────────
import { setupSocketHandlers } from '../socket/socketHandler';
import { setupPvpSocketHandlers } from '../socket/pvpSocketHandler';
import { setupGuildSocketHandlers } from '../socket/guildSocketHandler';
import { setupGuildWarSocketHandlers } from '../socket/guildWarSocketHandler';
import { setupAchievementSocketHandlers } from '../socket/achievementSocketHandler';
import { setupRaidSocketHandlers } from '../socket/raidSocketHandler';
import { setupPetSocketHandlers } from '../socket/petSocketHandler';
import { setupSocialSocketHandlers, bindSocialIO } from '../socket/socialSocketHandler';
import { setupChatSocketHandlers } from '../socket/chatSocketHandler';
import { setupDungeonSocketHandlers } from '../socket/dungeonSocketHandler';
import { setupWorldSocketHandlers } from '../socket/worldSocketHandler';
import { setupNotificationSocketHandlers } from '../socket/notificationSocketHandler';
import { setupAuctionSocketHandlers } from '../socket/auctionSocketHandler';
import { setupMatchmakingSocketHandlers } from '../socket/matchmakingSocketHandler';

// ─── 기타 초기화 ────────────────────────────────────────────
import { dialogueLoader } from '../dialogue/dialogueLoader';
import { auctionManager } from '../auction/auctionManager';
import { startMatchmaker } from '../pvp/matchmaker';
import { startMatchmaking } from '../matchmaking/matchmakingQueue';
import { getMetricsSummary } from '../apm';

/**
 * 선언형 라우트 매니페스트 — Fastify 플러그인 배열
 * 각 항목은 { plugin, name, options? } 구조
 */
interface RouteEntry {
  plugin: Parameters<FastifyInstance['register']>[0];
  name: string;
  options?: Record<string, unknown>;
}

const ROUTE_MANIFEST: RouteEntry[] = [
  { plugin: guildRoutes, name: 'Guild' },
  { plugin: endingRoutes, name: 'Ending' },
  { plugin: shopRoutes, name: 'Shop' },
  { plugin: seasonPassRoutes, name: 'Season Pass' },
  { plugin: achievementRoutes, name: 'Achievement' },
  { plugin: raidRoutes, name: 'Raid' },
  { plugin: classRoutes, name: 'Class advancement' },
  { plugin: npcRoutes, name: 'NPC' },
  { plugin: craftRoutes, name: 'Craft' },
  { plugin: petRoutes, name: 'Pet' },
  { plugin: questRoutes, name: 'Quest' },
  { plugin: socialRoutes, name: 'Social' },
  { plugin: economyRoutes, name: 'Economy' },
  { plugin: inventoryRoutes, name: 'Inventory' },
  { plugin: eventRoutes, name: 'Event' },
  { plugin: currencyRoutes, name: 'Currency' },
  // P10-02: admin routes 는 /api prefix로 등록하여 /api/admin/* 경로 통일
  { plugin: adminRoutes, name: 'Admin', options: { prefix: '/api' } },
  { plugin: authRoutes, name: 'Auth' },
  { plugin: tutorialRoutes, name: 'Tutorial' },
  { plugin: dungeonRoutes, name: 'Dungeon' },
  { plugin: worldRoutes, name: 'World' },
  { plugin: skillRoutes, name: 'Skill' },
  { plugin: codexRoutes, name: 'Codex' },
  { plugin: dialogueRoutes, name: 'Dialogue' },
  { plugin: notificationRoutes, name: 'Notification' },
  { plugin: auctionRoutes, name: 'Auction' },
  { plugin: rankingRoutes, name: 'Ranking' },
  { plugin: monsterRoutes, name: 'Monster' },
  { plugin: errorRoutes, name: 'Error collection' },
  { plugin: paymentRoutes, name: 'Payment' },
  { plugin: cosmeticRoutes, name: 'Cosmetic' },
  { plugin: combatRoutes, name: 'Combat' },
  { plugin: matchmakingRoutes, name: 'Matchmaking' },
  { plugin: storyRoutes, name: 'Story' },
  { plugin: saveRoutes, name: 'Save' },
  { plugin: reportRoutes, name: 'Report' },
  { plugin: analyticsRoutes, name: 'Analytics' },
  { plugin: opsRoutes, name: 'Ops alert' },
  { plugin: betaRoutes, name: 'Beta' },
];

/**
 * 모든 REST 라우트를 선언형 매니페스트 기반으로 등록
 */
export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // 헬스 체크 (인라인 — 프레임워크 의존 없음)
  fastify.get('/api/health', async (request, _reply) => {
    const query = request.query as Record<string, string>;
    const base = { status: 'ok', game: 'Aeterna Chronicle', phase: 1 };
    if (query.metrics === 'true') {
      return { ...base, apm: getMetricsSummary() };
    }
    return base;
  });

  // PvP는 함수 기반 등록 (registerPvpRoutes)
  await registerPvpRoutes(fastify);
  fastify.log.info('PvP API routes registered');

  // 매니페스트 기반 등록
  for (const entry of ROUTE_MANIFEST) {
    await fastify.register(entry.plugin as any, entry.options);
    fastify.log.info(`${entry.name} routes registered`);
  }
}

/**
 * 모든 Socket.io 핸들러 등록 + 실시간 서비스 시작
 */
export async function registerSocketHandlers(io: SocketServer, fastify: FastifyInstance): Promise<void> {
  // P10-04: admin socket 실연결
  setAdminSocketIo(io);
  fastify.log.info('Admin Socket.io instance bound (P10-04)');

  // 코어 소켓 핸들러 (Protobuf 코덱 로딩 포함)
  await setupSocketHandlers(io);
  fastify.log.info('Socket Server attached');

  // PvP
  setupPvpSocketHandlers(io);
  startMatchmaker(io);
  fastify.log.info('PvP matchmaker started');

  // 길드
  setupGuildSocketHandlers(io);
  setupGuildWarSocketHandlers(io);
  fastify.log.info('Guild + Guild War socket handlers attached');

  // 전투/업적/레이드
  setupAchievementSocketHandlers(io);
  setupRaidSocketHandlers(io);
  fastify.log.info('Achievement + Raid socket handlers attached');

  // 펫/소셜/채팅
  setupPetSocketHandlers(io);
  setupSocialSocketHandlers(io);
  bindSocialIO(io);
  setupChatSocketHandlers(io);
  fastify.log.info('Pet + Social + Chat socket handlers attached');

  // 던전/월드/알림
  setupDungeonSocketHandlers(io);
  setupWorldSocketHandlers(io);
  setupNotificationSocketHandlers(io);
  fastify.log.info('Dungeon + World + Notification socket handlers attached');

  // 매칭/경매
  setupMatchmakingSocketHandlers(io);
  startMatchmaking(io);
  setupAuctionSocketHandlers(io);
  auctionManager.startExpireTimer();
  fastify.log.info('Matchmaking + Auction socket handlers attached');

  // 대화 트리 로딩
  try {
    const dialogueCount = await dialogueLoader.loadAll();
    fastify.log.info(`Dialogue trees loaded: ${dialogueCount} NPCs`);
  } catch (dialogueErr) {
    fastify.log.warn(`Dialogue tree loading failed (non-critical): ${dialogueErr}`);
  }
}
