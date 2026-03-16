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

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import {
  getCurrentSeason,
  addSeasonXp,
  claimReward,
  purchasePremiumPass,
  XP_SOURCES,
  type XpSource,
} from '../seasonpass/seasonPassEngine';

// ─── 타입 정의 ──────────────────────────────────────────────────

interface UserIdParams {
  userId: string;
}

interface LevelParams {
  level: string;
}

interface ClaimBody {
  userId: string;
  level: number;
  type: 'free' | 'premium';
}

interface PurchaseBody {
  userId: string;
}

interface XpBody {
  userId: string;
  source: string;
  multiplier?: number;
}

interface AddExpBody {
  userId: string;
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
  fastify.get('/api/season/:userId/progress', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.params;
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
    request: FastifyRequest<{ Params: LevelParams; Body: { userId: string; type: 'free' | 'premium' } }>,
    reply: FastifyReply,
  ) => {
    const level = parseInt(request.params.level, 10);
    const { userId, type } = request.body;

    if (!userId || !type || isNaN(level)) {
      return reply.status(400).send({ error: 'userId, type, level은 필수입니다.' });
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
    const { userId } = request.body;
    if (!userId) {
      return reply.status(400).send({ error: 'userId는 필수입니다.' });
    }

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
    const { userId, source, multiplier } = request.body;

    if (!userId || !source) {
      return reply.status(400).send({ error: 'userId와 source는 필수입니다.' });
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
  fastify.get('/api/season-pass/progress/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.params;
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
    const { userId, level, type } = request.body;
    if (!userId || level === undefined || !type) {
      return reply.status(400).send({ error: 'userId, level, type은 필수입니다.' });
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
    const { userId } = request.body;
    if (!userId) return reply.status(400).send({ error: 'userId는 필수입니다.' });

    try {
      const result = await purchasePremiumPass(userId);
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : '업그레이드 실패';
      return reply.status(400).send({ error: message });
    }
  });

  // ── POST /api/season-pass/add-exp ─────────────────────────────
  fastify.post('/api/season-pass/add-exp', async (
    request: FastifyRequest<{ Body: AddExpBody }>,
    reply: FastifyReply,
  ) => {
    const { userId, amount } = request.body;
    if (!userId || !amount || amount <= 0) {
      return reply.status(400).send({ error: 'userId와 양수 amount는 필수입니다.' });
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
