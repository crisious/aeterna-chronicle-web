/**
 * routeManifest — 서버 라우트 매니페스트 (P10-14)
 *
 * 40개 라우트를 배열로 선언하고 자동 등록 함수를 제공한다.
 * 수동 `app.register(xxxRoutes)` 40줄 → 매니페스트 1줄 반복으로 축소.
 *
 * 사용 예:
 * ```ts
 * import { registerAllRoutes } from './routes/routeManifest';
 * await registerAllRoutes(fastify);
 * ```
 *
 * 기능 토글(P10-11)과 연동하여 비활성 기능의 라우트를 자동 스킵한다.
 */

import { FastifyInstance } from 'fastify';
import { FeatureKey, featureFlags } from '../core/featureFlags';

// ── 타입 정의 ─────────────────────────────────────────────────

export interface RouteEntry {
  /** 라우트 이름 (로그 표시용) */
  name: string;
  /** 라우트 플러그인 — Fastify register 호환 */
  plugin: (fastify: FastifyInstance, opts?: unknown) => Promise<void>;
  /** register 방식: 'register' = fastify.register(), 'direct' = plugin(fastify) */
  style: 'register' | 'direct';
  /** 연관 기능 키 (featureFlags와 연동, 없으면 항상 등록) */
  feature?: FeatureKey;
}

export interface RouteRegistrationResult {
  registered: string[];
  skipped: string[];
}

// ── 라우트 매니페스트 ─────────────────────────────────────────

/** 라우트 임포트 — lazy import로 순환 참조 방지 */
const lazyImport = <T>(importFn: () => Promise<T>, key: keyof T) =>
  async (fastify: FastifyInstance) => {
    const mod = await importFn();
    const plugin = mod[key];
    if (typeof plugin === 'function') {
      await (plugin as (f: FastifyInstance) => Promise<void>)(fastify);
    }
  };

/**
 * 전체 라우트 매니페스트
 *
 * 등록 순서 = 배열 순서 (의존성이 있으면 순서 조정)
 */
export const ROUTE_MANIFEST: RouteEntry[] = [
  // ── 인증/관리 (항상 활성) ──
  { name: 'auth',          plugin: reg(() => import('./authRoutes'),          'authRoutes'),          style: 'register' },
  { name: 'admin',         plugin: reg(() => import('./adminRoutes'),         'adminRoutes'),         style: 'register' },
  { name: 'character',     plugin: reg(() => import('./characterRoutes'),     'characterRoutes'),     style: 'register' },
  { name: 'error',         plugin: reg(() => import('./errorRoutes'),         'errorRoutes'),         style: 'register' },

  // ── 핵심 게임플레이 (항상 활성) ──
  { name: 'guild',         plugin: reg(() => import('./guildRoutes'),         'guildRoutes'),         style: 'register' },
  { name: 'quest',         plugin: reg(() => import('./questRoutes'),         'questRoutes'),         style: 'register' },
  { name: 'inventory',     plugin: reg(() => import('./inventoryRoutes'),     'inventoryRoutes'),     style: 'register' },
  { name: 'currency',      plugin: reg(() => import('./currencyRoutes'),      'currencyRoutes'),      style: 'register' },
  { name: 'economy',       plugin: reg(() => import('./economyRoutes'),       'economyRoutes'),       style: 'register' },
  { name: 'skill',         plugin: reg(() => import('./skillRoutes'),         'skillRoutes'),         style: 'register' },
  { name: 'class',         plugin: reg(() => import('./classRoutes'),         'classRoutes'),         style: 'register' },
  { name: 'monster',       plugin: reg(() => import('./monsterRoutes'),       'monsterRoutes'),       style: 'register' },
  { name: 'combat',        plugin: reg(() => import('./combatRoutes'),        'combatRoutes'),        style: 'register' },
  { name: 'dungeon',       plugin: reg(() => import('./dungeonRoutes'),       'dungeonRoutes'),       style: 'register' },
  { name: 'world',         plugin: reg(() => import('./worldRoutes'),         'worldRoutes'),         style: 'register' },
  { name: 'ending',        plugin: reg(() => import('./endingRoutes'),        'endingRoutes'),        style: 'register' },
  { name: 'save',          plugin: reg(() => import('./saveRoutes'),          'saveRoutes'),          style: 'register' },
  { name: 'npc',           plugin: reg(() => import('./npcRoutes'),           'npcRoutes'),           style: 'register' },
  { name: 'dialogue',      plugin: reg(() => import('./dialogueRoutes'),      'dialogueRoutes'),      style: 'register' },
  { name: 'event',         plugin: reg(() => import('./eventRoutes'),         'eventRoutes'),         style: 'register' },

  // ── 기능 토글 연동 ──
  { name: 'pvp',           plugin: dir(() => import('./pvpRoutes'),           'registerPvpRoutes'),   style: 'direct',   feature: 'pvp' },
  { name: 'shop',          plugin: reg(() => import('./shopRoutes'),          'shopRoutes'),          style: 'register' },
  { name: 'seasonPass',    plugin: reg(() => import('./seasonPassRoutes'),    'seasonPassRoutes'),    style: 'register', feature: 'season_pass' },
  { name: 'achievement',   plugin: reg(() => import('./achievementRoutes'),   'achievementRoutes'),   style: 'register' },
  { name: 'raid',          plugin: reg(() => import('./raidRoutes'),          'raidRoutes'),          style: 'register', feature: 'raid' },
  { name: 'craft',         plugin: reg(() => import('./craftRoutes'),         'craftRoutes'),         style: 'register', feature: 'craft' },
  { name: 'pet',           plugin: reg(() => import('./petRoutes'),           'petRoutes'),           style: 'register', feature: 'pet' },
  { name: 'social',        plugin: reg(() => import('./socialRoutes'),        'socialRoutes'),        style: 'register', feature: 'social' },
  { name: 'notification',  plugin: reg(() => import('./notificationRoutes'),  'notificationRoutes'),  style: 'register', feature: 'notification' },
  { name: 'auction',       plugin: reg(() => import('./auctionRoutes'),       'auctionRoutes'),       style: 'register', feature: 'auction' },
  { name: 'ranking',       plugin: reg(() => import('./rankingRoutes'),       'rankingRoutes'),       style: 'register', feature: 'ranking' },
  { name: 'codex',         plugin: reg(() => import('./codexRoutes'),         'codexRoutes'),         style: 'register', feature: 'codex' },
  { name: 'cosmetic',      plugin: reg(() => import('./cosmeticRoutes'),      'cosmeticRoutes'),      style: 'register', feature: 'cosmetic_shop' },
  { name: 'payment',       plugin: reg(() => import('./paymentRoutes'),       'paymentRoutes'),       style: 'register', feature: 'payment' },
  { name: 'matchmaking',   plugin: reg(() => import('./matchmakingRoutes'),   'matchmakingRoutes'),   style: 'register', feature: 'matchmaking' },
  { name: 'tutorial',      plugin: reg(() => import('./tutorialRoutes'),      'tutorialRoutes'),      style: 'register', feature: 'tutorial' },
  { name: 'story',         plugin: reg(() => import('./storyRoutes'),         'storyRoutes'),         style: 'register', feature: 'story' },
  { name: 'report',        plugin: reg(() => import('./reportRoutes'),        'reportRoutes'),        style: 'register' },
  { name: 'analytics',     plugin: reg(() => import('./analyticsRoutes'),     'analyticsRoutes'),     style: 'register', feature: 'analytics' },
  { name: 'ops',           plugin: reg(() => import('./opsRoutes'),           'opsRoutes'),           style: 'register' },
  { name: 'beta',          plugin: reg(() => import('./betaRoutes'),          'betaRoutes'),          style: 'register', feature: 'beta' },

  // ── P11 엔드게임 컨텐츠 ──
  { name: 'endlessDungeon',  plugin: reg(() => import('./endlessDungeonRoutes'),  'endlessDungeonRoutes'),  style: 'register', feature: 'endless_dungeon' },
  { name: 'worldBoss',       plugin: reg(() => import('./worldBossRoutes'),       'worldBossRoutes'),       style: 'register', feature: 'world_boss' },
  { name: 'transcendence',   plugin: reg(() => import('./transcendenceRoutes'),   'transcendenceRoutes'),   style: 'register', feature: 'transcendence' },

  // ── P12 커뮤니티 확장 ──
  { name: 'community',       plugin: reg(() => import('./shareRoutes'),           'communityRoutes'),       style: 'register', feature: 'social' },

  // ── P27 멀티플레이어 소셜 ──
  { name: 'party',            plugin: reg(() => import('./partyRoutes'),           'partyRoutes'),           style: 'register', feature: 'social' },
  { name: 'trade',            plugin: reg(() => import('./tradeRoutes'),           'tradeRoutes'),           style: 'register', feature: 'social' },
];

// ── 자동 등록 함수 ────────────────────────────────────────────

/**
 * 매니페스트에 등록된 모든 라우트를 자동 등록한다.
 * 기능 토글이 비활성인 라우트는 스킵한다.
 */
export async function registerAllRoutes(
  fastify: FastifyInstance,
  manifest: RouteEntry[] = ROUTE_MANIFEST,
): Promise<RouteRegistrationResult> {
  const result: RouteRegistrationResult = { registered: [], skipped: [] };

  for (const entry of manifest) {
    // 기능 토글 체크
    if (entry.feature && featureFlags.isDisabled(entry.feature)) {
      fastify.log.info(`[RouteManifest] '${entry.name}' 스킵 (feature '${entry.feature}' 비활성)`);
      result.skipped.push(entry.name);
      continue;
    }

    try {
      if (entry.style === 'register') {
        await fastify.register(entry.plugin as any);
      } else {
        // direct 호출
        await entry.plugin(fastify);
      }
      fastify.log.info(`[RouteManifest] '${entry.name}' 라우트 등록 완료`);
      result.registered.push(entry.name);
    } catch (err) {
      fastify.log.error(`[RouteManifest] '${entry.name}' 라우트 등록 실패: ${err}`);
      throw err;
    }
  }

  fastify.log.info(
    `[RouteManifest] 등록 완료: ${result.registered.length}개 등록, ${result.skipped.length}개 스킵`,
  );
  return result;
}

// ── 헬퍼 (lazy import 래퍼) ───────────────────────────────────

/** register 스타일: fastify.register() 호환 플러그인 래퍼 */
function reg<M>(importFn: () => Promise<M>, exportName: string) {
  return async (fastify: FastifyInstance) => {
    const mod = await importFn() as Record<string, unknown>;
    const plugin = mod[exportName];
    if (typeof plugin === 'function') {
      await fastify.register(plugin as any);
    } else {
      throw new Error(`[RouteManifest] '${exportName}' is not a function`);
    }
  };
}

/** direct 스타일: (fastify) => void 직접 호출 래퍼 */
function dir<M>(importFn: () => Promise<M>, exportName: string) {
  return async (fastify: FastifyInstance) => {
    const mod = await importFn() as Record<string, unknown>;
    const fn = mod[exportName];
    if (typeof fn === 'function') {
      await (fn as (f: FastifyInstance) => Promise<void>)(fastify);
    } else {
      throw new Error(`[RouteManifest] '${exportName}' is not a function`);
    }
  };
}
