import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────

interface UserIdParams {
  userId: string;
}

interface ClaimBody {
  userId: string;
  level: number;
  type: 'free' | 'premium';
}

interface UpgradeBody {
  userId: string;
}

interface AddExpBody {
  userId: string;
  amount: number;
}

/** 시즌 패스 보상 엔트리 (JSON 필드 내부 구조) */
interface RewardEntry {
  level: number;
  reward: string;
}

// ─── 상수 ───────────────────────────────────────────────────

/** 레벨업에 필요한 경험치 (레벨 × 100) */
function expForLevel(level: number): number {
  return level * 100;
}

// ─── 시즌 패스 라우트 ────────────────────────────────────────

export async function seasonPassRoutes(fastify: FastifyInstance): Promise<void> {

  // ── GET /api/season-pass/current — 현재 활성 시즌 패스 ─────
  fastify.get('/api/season-pass/current', async (_request, reply: FastifyReply) => {
    const now = new Date();
    const current = await prisma.seasonPass.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { season: 'desc' },
    });

    if (!current) {
      return reply.status(404).send({ error: '현재 활성 시즌 패스가 없습니다.' });
    }
    return reply.send(current);
  });

  // ── GET /api/season-pass/progress/:userId — 유저 진행도 ────
  fastify.get('/api/season-pass/progress/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply
  ) => {
    const { userId } = request.params;
    const now = new Date();

    // 현재 활성 시즌 조회
    const currentSeason = await prisma.seasonPass.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { season: 'desc' },
    });

    if (!currentSeason) {
      return reply.status(404).send({ error: '현재 활성 시즌 패스가 없습니다.' });
    }

    // 진행도 조회 (없으면 자동 생성)
    let progress = await prisma.seasonPassProgress.findUnique({
      where: {
        userId_seasonPassId: { userId, seasonPassId: currentSeason.id },
      },
      include: { seasonPass: true },
    });

    if (!progress) {
      progress = await prisma.seasonPassProgress.create({
        data: {
          userId,
          seasonPassId: currentSeason.id,
        },
        include: { seasonPass: true },
      });
    }

    return reply.send(progress);
  });

  // ── POST /api/season-pass/claim — 보상 수령 ───────────────
  fastify.post('/api/season-pass/claim', async (
    request: FastifyRequest<{ Body: ClaimBody }>,
    reply: FastifyReply
  ) => {
    const { userId, level, type } = request.body;

    if (!userId || level === undefined || !type) {
      return reply.status(400).send({ error: 'userId, level, type은 필수입니다.' });
    }

    const now = new Date();
    const currentSeason = await prisma.seasonPass.findFirst({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { season: 'desc' },
    });

    if (!currentSeason) {
      return reply.status(404).send({ error: '현재 활성 시즌 패스가 없습니다.' });
    }

    const progress = await prisma.seasonPassProgress.findUnique({
      where: { userId_seasonPassId: { userId, seasonPassId: currentSeason.id } },
    });

    if (!progress) {
      return reply.status(404).send({ error: '시즌 패스 진행 기록이 없습니다.' });
    }

    // 레벨 도달 여부 확인
    if (progress.level < level) {
      return reply.status(400).send({ error: `아직 레벨 ${level}에 도달하지 못했습니다.` });
    }

    // 프리미엄 보상은 프리미엄 구매 필수
    if (type === 'premium' && !progress.isPremium) {
      return reply.status(403).send({ error: '프리미엄 패스를 구매해야 보상을 받을 수 있습니다.' });
    }

    // 이미 수령 여부 확인
    const claimedList = (type === 'free' ? progress.claimedFree : progress.claimedPremium) as number[];
    if (claimedList.includes(level)) {
      return reply.status(400).send({ error: `레벨 ${level} ${type} 보상은 이미 수령했습니다.` });
    }

    // 보상 존재 여부 확인
    const rewardList = (type === 'free' ? currentSeason.freeRewards : currentSeason.premiumRewards) as RewardEntry[];
    const reward = rewardList.find((r) => r.level === level);
    if (!reward) {
      return reply.status(404).send({ error: `레벨 ${level}에 해당하는 ${type} 보상이 없습니다.` });
    }

    // 수령 기록 업데이트
    const newClaimed = [...claimedList, level];
    const updateData = type === 'free'
      ? { claimedFree: newClaimed }
      : { claimedPremium: newClaimed };

    const updated = await prisma.seasonPassProgress.update({
      where: { userId_seasonPassId: { userId, seasonPassId: currentSeason.id } },
      data: updateData,
      include: { seasonPass: true },
    });

    return reply.send({ reward: reward.reward, progress: updated });
  });

  // ── POST /api/season-pass/upgrade — 프리미엄 업그레이드 ────
  fastify.post('/api/season-pass/upgrade', async (
    request: FastifyRequest<{ Body: UpgradeBody }>,
    reply: FastifyReply
  ) => {
    const { userId } = request.body;

    if (!userId) {
      return reply.status(400).send({ error: 'userId는 필수입니다.' });
    }

    const now = new Date();
    const currentSeason = await prisma.seasonPass.findFirst({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { season: 'desc' },
    });

    if (!currentSeason) {
      return reply.status(404).send({ error: '현재 활성 시즌 패스가 없습니다.' });
    }

    // 진행도 조회 또는 생성
    let progress = await prisma.seasonPassProgress.findUnique({
      where: { userId_seasonPassId: { userId, seasonPassId: currentSeason.id } },
    });

    if (!progress) {
      progress = await prisma.seasonPassProgress.create({
        data: { userId, seasonPassId: currentSeason.id, isPremium: true },
        include: { seasonPass: true },
      });
      return reply.send(progress);
    }

    if (progress.isPremium) {
      return reply.status(400).send({ error: '이미 프리미엄 패스를 보유하고 있습니다.' });
    }

    // TODO: 프리미엄 구매 비용 차감 (화폐 시스템 연동 후 추가)

    const updated = await prisma.seasonPassProgress.update({
      where: { userId_seasonPassId: { userId, seasonPassId: currentSeason.id } },
      data: { isPremium: true },
      include: { seasonPass: true },
    });

    return reply.send(updated);
  });

  // ── POST /api/season-pass/add-exp — 경험치 추가 ───────────
  fastify.post('/api/season-pass/add-exp', async (
    request: FastifyRequest<{ Body: AddExpBody }>,
    reply: FastifyReply
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

    if (!currentSeason) {
      return reply.status(404).send({ error: '현재 활성 시즌 패스가 없습니다.' });
    }

    // 진행도 조회 또는 생성
    let progress = await prisma.seasonPassProgress.findUnique({
      where: { userId_seasonPassId: { userId, seasonPassId: currentSeason.id } },
    });

    if (!progress) {
      progress = await prisma.seasonPassProgress.create({
        data: { userId, seasonPassId: currentSeason.id },
      });
    }

    // 경험치 누적 + 레벨업 계산
    let totalExp = progress.exp + amount;
    let currentLevel = progress.level;

    // 최대 레벨 산정 (보상 리스트 길이 기반)
    const freeRewards = currentSeason.freeRewards as RewardEntry[];
    const maxLevel = freeRewards.length > 0
      ? Math.max(...freeRewards.map((r) => r.level))
      : 100; // 기본 최대 레벨

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
