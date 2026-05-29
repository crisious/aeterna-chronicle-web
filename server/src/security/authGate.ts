/**
 * authGate.ts — 전역 인증 게이트 (deny-by-default)  [SECURITY-IDOR]
 *
 * 배경: 서버에 전역 인증 훅이 없어(runtimeServices 는 rateLimiter/inputValidator 만 등록),
 * 다수 라우트가 무인증으로 body/params 의 식별자(userId/senderId 등)를 신뢰하는 IDOR 표면이 존재했다.
 *
 * 이 게이트는 PUBLIC_ROUTES 화이트리스트에 없는 모든 라우트에 대해 유효한 JWT(플레이어 또는 어드민)를
 * 요구하고, 검증된 userId 를 request.authUserId 에 주입한다.
 * - 인증(authentication): 이 게이트가 담당. 토큰 없으면 401.
 * - 인가/소유권(authorization): 각 라우트 핸들러가 request.authUserId 를 기준으로 수행(2차).
 * - 어드민 역할 검증: 기존 requireAdmin preHandler 가 계속 담당(별도 JWT_ADMIN_SECRET).
 *
 * deny-by-default: 화이트리스트 미등록 신규 라우트는 자동으로 인증이 요구된다(회귀 방지).
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from './jwtManager';

declare module 'fastify' {
  interface FastifyRequest {
    /** 전역 authGate 가 주입한, 검증된 토큰의 userId (공개 라우트면 undefined) */
    authUserId?: string;
  }
}

const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET;

/**
 * 공개 라우트 화이트리스트 — `METHOD /등록된/라우트/패턴`.
 * 패턴은 Fastify 등록 URL(파라미터는 `:name` 형태)과 정확히 일치해야 한다.
 * 여기에 없는 모든 라우트는 deny-by-default 로 유효 토큰을 요구한다.
 *
 * ⚠️ 머지 전 QA 필수: 클라이언트가 비로그인 상태로 호출하는 엔드포인트가 누락되면 401 이 발생한다.
 */
export const PUBLIC_ROUTES: ReadonlySet<string> = new Set<string>([
  // ── 헬스/인증/텔레메트리 ──
  'GET /api/health',
  'POST /api/auth/register',
  'POST /api/auth/login',
  'POST /api/auth/refresh',
  'POST /api/auth/logout',
  'POST /api/errors',
  // Stripe 웹훅 — 서명 검증으로 보호되는 공개 엔드포인트
  'POST /api/stripe/webhook',

  // ── 정적/전역 카탈로그 (GET) ──
  'GET /api/achievements',
  'GET /api/titles',
  'GET /api/auction',
  'GET /api/auction/:listingId',
  'GET /api/class/tree',
  'GET /api/cosmetics',
  'GET /api/cosmetics/featured',
  'GET /api/craft/recipes',
  'GET /api/craft/recipes/:id',
  'GET /api/economy/report',
  'GET /api/economy/inflation',
  'GET /api/economy/balance-check',
  'GET /api/economy/enhancement-table',
  'GET /api/economy/grade-prices',
  'GET /api/economy/level-curves',
  'GET /api/economy/monster-drops',
  'GET /api/dungeons',
  'GET /api/dungeons/:code',
  'GET /api/events',
  'GET /api/monsters',
  'GET /api/monsters/:id',
  'GET /api/monsters/zone/:zoneId',
  'GET /api/npcs',
  'GET /api/npcs/:id',
  'GET /api/pets/skills',
  'GET /api/pets/species',
  'GET /api/payment/products',
  'GET /api/quests',
  'GET /api/raids/bosses',
  'GET /api/ranking/:category',
  'GET /api/ranking/:category/around',
  'GET /api/shop/items',
  'GET /api/shop/items/:id',
  'GET /api/season/current',
  'GET /api/season-pass/current',
  'GET /api/skills/tree/:class',
  'GET /api/world/zones',
  'GET /api/world/zones/:code',
  'GET /api/world/zones/:code/encounter',
  'GET /api/world-boss/current',
  'GET /api/world-boss/rewards',
  'GET /api/transcendence/info/:itemId',

  // ── 공유 링크 / OG (공개) ──
  'GET /api/share/:code',
  'GET /s/:code',

  // ── 커뮤니티 이벤트 공개 목록 ──
  'GET /api/community-events/active',
  'GET /api/community-events/multipliers',

  // ── 전투 카탈로그 (정적) ──
  'GET /combat/effect-defs',
  'GET /combat/combos',
  'GET /combat/combos/:classId',
  'GET /combat/active',
]);

/** 매칭된 라우트의 등록 URL 패턴 추출 (Fastify v4.10+: routeOptions.url, fallback routerPath) */
export function getRouteUrl(request: FastifyRequest): string | undefined {
  const routeOptions = (request as unknown as { routeOptions?: { url?: string } }).routeOptions;
  if (routeOptions?.url) {
    return routeOptions.url;
  }
  return (request as unknown as { routerPath?: string }).routerPath;
}

/** 라우트가 공개 화이트리스트에 있는지 */
export function isPublicRoute(method: string, url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  return PUBLIC_ROUTES.has(`${method} ${url}`);
}

/**
 * 토큰을 플레이어 시크릿으로 검증하고, 실패 시 어드민 시크릿으로 검증해 userId 반환. 실패 시 null.
 * 어드민 토큰도 "인증됨"으로 통과시키되, 역할(권한) 검증은 requireAdmin 이 2차로 수행한다.
 */
async function resolveUserId(token: string): Promise<string | null> {
  try {
    const payload = await verifyAccessToken(token);
    return payload.userId;
  } catch {
    if (JWT_ADMIN_SECRET) {
      try {
        const decoded = jwt.verify(token, JWT_ADMIN_SECRET) as { userId?: string };
        if (decoded?.userId) {
          return decoded.userId;
        }
      } catch {
        /* 어드민 검증도 실패 → 아래에서 null */
      }
    }
    return null;
  }
}

/**
 * 전역 인증 게이트 preHandler.
 * - CORS preflight(OPTIONS)/HEAD 는 통과
 * - 공개 라우트는 통과
 * - 그 외에는 유효 토큰을 요구하고 request.authUserId 를 주입(없으면 401)
 */
export async function authGate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (request.method === 'OPTIONS' || request.method === 'HEAD') {
    return;
  }

  const url = getRouteUrl(request);
  // 매칭 라우트가 없으면(예: 404) Fastify 기본 처리에 위임
  if (!url) {
    return;
  }

  if (isPublicRoute(request.method, url)) {
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    reply.status(401).send({ error: '인증 토큰이 필요합니다.' });
    return;
  }

  const userId = await resolveUserId(authHeader.slice(7));
  if (!userId) {
    reply.status(401).send({ error: '유효하지 않은 토큰입니다.' });
    return;
  }

  request.authUserId = userId;
}

/**
 * 라우트 핸들러에서 인증된 userId 를 안전하게 얻는 헬퍼.
 * 전역 authGate 통과 후에는 항상 값이 존재하지만(공개 라우트 제외), 방어적으로 null 가능성을 표현한다.
 */
export function getAuthUserId(request: FastifyRequest): string | null {
  return request.authUserId ?? null;
}
