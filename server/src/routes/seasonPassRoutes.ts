/**
 * P6-01 시즌 패스 라우트 (엔진 연동 업데이트)
 * - GET  /api/season/current             — 현재 활성 시즌
 * - GET  /api/season/:userId/progress    — 유저 진행도
 * - POST /api/season/claim/:level        — 보상 수령
 * - POST /api/season/purchase            — 프리미엄 패스 구매
 * - POST /api/season/xp                  — 경험치 추가
 *
 * 기존 /api/season-pass/* 엔드포인트도 하위 호환 유지
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { requireAdmin } from '../admin/authMiddleware';
import {
  getCurrentSeason,
  addSeasonXp,
  claimReward,
  purchasePremiumPass,
  XP_SOURCES,
  type XpSource,
} from '../seasonpass/seasonPassEngine';

// ─── 타입 정의 ──────────────────────────────────────────────────

interface LevelParams {
  level: string;
}

// userId 는 더 이상 클라이언트에서 받지 않는다(actor = request.authUserId).
interface ClaimBody {
  level: number;
  type: 'free' | 'premium';
}

// 프리미엄 패스 구매 바디 — actor = request.authUserId 이므로 페이로드 없음.
type PurchaseBody = Record<string, never>;

interface XpBody {
  source: string;
  multiplier?: number;
}

interface AddExpBody {
  amount: number;
}

/** 시즌 패스 보상 엔트리 (JSON 필드 내부 구조) */
interface RewardEntry {
  level: number;
  reward: string | { type: string; name: string; amount?: number };
}

/** 레벨업에 필요한 경험치 (레벨 × 100) — 하위 호환 */
function expForLevel(level: number): number {
  return level * 100;
}

// ─── 시즌 패스 라우트 ────────────────────────────────────────────

export async function seasonPassRoutes(fastify: FastifyInstance): Promise<void> {

  // ═══════════════════════════════════════════════════════════════
  //  신규 엔드포인트 (P6-01 엔진 연동)
  // ═══════════════════════════════════════════════════════════════

  // ── GET /api/season/current — 현재 활성 시즌 ──────────────────
  fastify.get('/api/season/current', async (_request, reply: FastifyReply) => {
    const season = await getCurrentSeason();
    if (!season) {
      return reply.status(404).send({ error: '현재 활성 시즌이 없습니다.' });
    }
    return reply.send(season);
  });

  // ── GET /api/season/:userId/progress — 유저 진행도 ────────────
  // 경로의 :userId 는 신뢰하지 않는다 — 인증된 actor(request.authUserId)의 진행도만 조회.
  fastify.get('/api/season/:userId/progress', async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const season = await getCurrentSeason();
    if (!season) {
      return reply.status(404).send({ error: '현재 활성 시즌이 없습니다.' });
    }

    let progress = await prisma.seasonPassProgress.findUnique({
      where: { userId_seasonPassId: { userId, seasonPassId: season.id } },
      include: { seasonPass: true },
    });

    if (!progress) {
      progress = await prisma.seasonPassProgress.create({
        data: { userId, seasonPassId: season.id },
        include: { seasonPass: true },
      });
    }

    return reply.send(progress);
  });

  // ── POST /api/season/claim/:level — 보상 수령 ────────────────
  fastify.post('/api/season/claim/:level', async (
    request: FastifyRequest<{ Params: LevelParams; Body: { type: 'free' | 'premium' } }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const level = parseInt(request.params.level, 10);
    const { type } = request.body;

    if (!type || isNaN(level)) {
      return reply.status(400).send({ error: 'type, level은 필수입니다.' });
    }

    try {
      const result = await claimReward(userId, level, type);
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : '보상 수령 실패';
      return reply.status(400).send({ error: message });
    }
  });

  // ── POST /api/season/purchase — 프리미엄 패스 구매 ────────────
  fastify.post('/api/season/purchase', async (
    request: FastifyRequest<{ Body: PurchaseBody }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    try {
      const result = await purchasePremiumPass(userId);
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : '구매 실패';
      return reply.status(400).send({ error: message });
    }
  });

  // ── POST /api/season/xp — 경험치 추가 (소스 기반) ────────────
  fastify.post('/api/season/xp', async (
    request: FastifyRequest<{ Body: XpBody }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { source, multiplier } = request.body;

    if (!source) {
      return reply.status(400).send({ error: 'source는 필수입니다.' });
    }

    if (!(source in XP_SOURCES)) {
      return reply.status(400).send({
        error: `유효하지 않은 XP 소스: ${source}`,
        validSources: Object.keys(XP_SOURCES),
      });
    }

    try {
      const result = await addSeasonXp(userId, source as XpSource, multiplier);
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'XP 추가 실패';
      return reply.status(400).send({ error: message });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  //  하위 호환 엔드포인트 (기존 /api/season-pass/*)
  // ═══════════════════════════════════════════════════════════════

  // ── GET /api/season-pass/current ──────────────────────────────
  fastify.get('/api/season-pass/current', async (_request, reply: FastifyReply) => {
    const now = new Date();
    const current = await prisma.seasonPass.findFirst({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { season: 'desc' },
    });
    if (!current) return reply.status(404).send({ error: '현재 활성 시즌 패스가 없습니다.' });
    return reply.send(current);
  });

  // ── GET /api/season-pass/progress/:userId ─────────────────────
  // 경로의 :userId 는 신뢰하지 않는다 — 인증된 actor(request.authUserId)의 진행도만 조회.
  fastify.get('/api/season-pass/progress/:userId', async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const now = new Date();
    const currentSeason = await prisma.seasonPass.findFirst({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { season: 'desc' },
    });
    if (!currentSeason) return reply.status(404).send({ error: '현재 활성 시즌 패스가 없습니다.' });

    let progress = await prisma.seasonPassProgress.findUnique({
      where: { userId_seasonPassId: { userId, seasonPassId: currentSeason.id } },
      include: { seasonPass: true },
    });
    if (!progress) {
      progress = await prisma.seasonPassProgress.create({
        data: { userId, seasonPassId: currentSeason.id },
        include: { seasonPass: true },
      });
    }
    return reply.send(progress);
  });

  // ── POST /api/season-pass/claim ───────────────────────────────
  fastify.post('/api/season-pass/claim', async (
    request: FastifyRequest<{ Body: ClaimBody }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { level, type } = request.body;
    if (level === undefined || !type) {
      return reply.status(400).send({ error: 'level, type은 필수입니다.' });
    }

    try {
      const result = await claimReward(userId, level, type);
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : '보상 수령 실패';
      return reply.status(400).send({ error: message });
    }
  });

  // ── POST /api/season-pass/upgrade ─────────────────────────────
  fastify.post('/api/season-pass/upgrade', async (
    request: FastifyRequest<{ Body: PurchaseBody }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    try {
      const result = await purchasePremiumPass(userId);
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : '업그레이드 실패';
      return reply.status(400).send({ error: message });
    }
  });

  // ── POST /api/season-pass/add-exp ─────────────────────────────
  // 보안: 클라가 임의 amount 로 시즌 XP 를 적립하면 자유트랙 보상(골드/크리스탈)을 무한
  // 과지급받을 수 있다. 정당한 XP 적립은 source 기반 POST /api/season-pass/xp(서버가 금액 결정)
  // 로만 발생하며, 이 임의-amount 엔드포인트는 admin/디버그 전용으로 게이트한다(클라 미사용).
  fastify.post('/api/season-pass/add-exp', { preHandler: requireAdmin('admin') as any }, async (
    request: FastifyRequest<{ Body: AddExpBody }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { amount } = request.body;
    if (!amount || amount <= 0) {
      return reply.status(400).send({ error: '양수 amount는 필수입니다.' });
    }

    const now = new Date();
    const currentSeason = await prisma.seasonPass.findFirst({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { season: 'desc' },
    });
    if (!currentSeason) return reply.status(404).send({ error: '현재 활성 시즌 패스가 없습니다.' });

    let progress = await prisma.seasonPassProgress.findUnique({
      where: { userId_seasonPassId: { userId, seasonPassId: currentSeason.id } },
    });
    if (!progress) {
      progress = await prisma.seasonPassProgress.create({
        data: { userId, seasonPassId: currentSeason.id },
      });
    }

    let totalExp = progress.exp + amount;
    let currentLevel = progress.level;
    const freeRewards = currentSeason.freeRewards as unknown as RewardEntry[];
    const maxLevel = freeRewards.length > 0
      ? Math.max(...freeRewards.map((r) => r.level))
      : 100;

    while (currentLevel < maxLevel) {
      const needed = expForLevel(currentLevel + 1);
      if (totalExp >= needed) {
        totalExp -= needed;
        currentLevel++;
      } else {
        break;
      }
    }

    const updated = await prisma.seasonPassProgress.update({
      where: { userId_seasonPassId: { userId, seasonPassId: currentSeason.id } },
      data: { exp: totalExp, level: currentLevel },
      include: { seasonPass: true },
    });

    return reply.send({
      levelUp: currentLevel > progress.level,
      previousLevel: progress.level,
      progress: updated,
    });
  });
}
