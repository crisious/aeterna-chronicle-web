/**
 * pvpRoutes.ts — PvP REST API 라우트
 *
 * - POST   /api/pvp/queue          매칭 큐 등록
 * - DELETE /api/pvp/queue          매칭 취소
 * - GET    /api/pvp/match/:id      매치 정보
 * - GET    /api/pvp/rankings       시즌 랭킹 (페이지네이션)
 * - GET    /api/pvp/ratings/:userId 개인 레이팅
 */
import { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { enqueue, dequeue, isInQueue, getCurrentSeason } from '../pvp/matchmaker';
import { getSeasonInfo, previewSeasonReward, claimSeasonReward, SEASON_TIER_REWARDS } from '../pvp/pvpSeasonReward';
import { normalizeForPvp, RawStats } from '../pvp/pvpNormalizer';

/** 큐 등록 요청 바디 */
interface QueueBody {
  userId: string;
  characterId: string;
  socketId: string;
  arenaType?: string;  // ranked | casual | tournament
}

/** 랭킹 쿼리 파라미터 */
interface RankingsQuery {
  season?: string;
  page?: string;
  limit?: string;
}

export async function registerPvpRoutes(app: FastifyInstance): Promise<void> {

  // ─── POST /api/pvp/queue — 매칭 큐 등록 ───────────────────
  app.post<{ Body: QueueBody }>('/api/pvp/queue', async (request, reply) => {
    const { userId, characterId, socketId, arenaType = 'ranked' } = request.body;

    if (!userId || !characterId || !socketId) {
      return reply.status(400).send({ error: 'userId, characterId, socketId 필수' });
    }

    if (isInQueue(userId)) {
      return reply.status(409).send({ error: '이미 매칭 큐에 등록되어 있습니다' });
    }

    // 현재 시즌 레이팅 조회 (없으면 기본 1000)
    const season = getCurrentSeason();
    const ratingRecord = await prisma.pvpRating.findUnique({
      where: { userId_season: { userId, season } },
    });
    const rating = ratingRecord?.rating ?? 1000;

    await enqueue({
      userId,
      characterId,
      socketId,
      rating,
      arenaType,
      enqueuedAt: Date.now(),
    });

    return reply.status(200).send({ status: 'queued', rating, arenaType });
  });

  // ─── DELETE /api/pvp/queue — 매칭 취소 ────────────────────
  app.delete<{ Body: { userId: string } }>('/api/pvp/queue', async (request, reply) => {
    const { userId } = request.body;

    if (!userId) {
      return reply.status(400).send({ error: 'userId 필수' });
    }

    const removed = await dequeue(userId);

    if (!removed) {
      return reply.status(404).send({ error: '큐에서 해당 유저를 찾을 수 없습니다' });
    }

    return reply.status(200).send({ status: 'dequeued' });
  });

  // ─── GET /api/pvp/match/:id — 매치 정보 ──────────────────
  app.get<{ Params: { id: string } }>('/api/pvp/match/:id', async (request, reply) => {
    const { id } = request.params;

    const match = await prisma.pvpMatch.findUnique({ where: { id } });

    if (!match) {
      return reply.status(404).send({ error: '매치를 찾을 수 없습니다' });
    }

    return reply.status(200).send(match);
  });

  // ─── GET /api/pvp/rankings — 시즌 랭킹 ───────────────────
  app.get<{ Querystring: RankingsQuery }>('/api/pvp/rankings', async (request, reply) => {
    const season = parseInt(request.query.season ?? String(getCurrentSeason()), 10);
    const page = Math.max(1, parseInt(request.query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const [rankings, total] = await Promise.all([
      prisma.pvpRating.findMany({
        where: { season },
        orderBy: { rating: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pvpRating.count({ where: { season } }),
    ]);

    return reply.status(200).send({
      season,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      rankings,
    });
  });

  // ─── GET /api/pvp/ratings/:userId — 개인 레이팅 ──────────
  app.get<{ Params: { userId: string }; Querystring: { season?: string } }>(
    '/api/pvp/ratings/:userId',
    async (request, reply) => {
      const { userId } = request.params;
      const season = parseInt(request.query.season ?? String(getCurrentSeason()), 10);

      const rating = await prisma.pvpRating.findUnique({
        where: { userId_season: { userId, season } },
      });

      if (!rating) {
        // 레이팅 레코드가 없으면 기본값 반환
        return reply.status(200).send({
          userId,
          season,
          rating: 1000,
          tier: 'bronze',
          wins: 0,
          losses: 0,
          streak: 0,
          peakRating: 1000,
        });
      }

      return reply.status(200).send(rating);
    },
  );

  // ═══════════════════════════════════════════════════════════
  // P6-08: PvP 시즌 & 정규화 라우트
  // ═══════════════════════════════════════════════════════════

  // ─── GET /api/pvp/season — 현재 시즌 정보 ─────────────────
  app.get('/api/pvp/season', async (_request, reply) => {
    const info = await getSeasonInfo();
    return reply.status(200).send(info);
  });

  // ─── GET /api/pvp/season/rewards — 시즌 보상 등급표 ───────
  app.get('/api/pvp/season/rewards', async (_request, reply) => {
    return reply.status(200).send({
      season: getCurrentSeason(),
      tiers: SEASON_TIER_REWARDS,
    });
  });

  // ─── GET /api/pvp/season/preview/:userId — 개인 보상 미리보기
  app.get<{ Params: { userId: string } }>(
    '/api/pvp/season/preview/:userId',
    async (request, reply) => {
      const preview = await previewSeasonReward(request.params.userId);
      return reply.status(200).send(preview);
    },
  );

  // ─── POST /api/pvp/season/claim — 시즌 보상 수령 ─────────
  app.post<{ Body: { userId: string; season?: number } }>(
    '/api/pvp/season/claim',
    async (request, reply) => {
      const { userId, season } = request.body;
      if (!userId) {
        return reply.status(400).send({ error: 'userId 필수' });
      }

      const result = await claimSeasonReward(userId, season);
      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }
      return reply.status(200).send(result);
    },
  );

  // ─── POST /api/pvp/normalize — PvP 스탯 정규화 (디버그용) ─
  app.post<{ Body: RawStats }>(
    '/api/pvp/normalize',
    async (request, reply) => {
      const raw = request.body;
      if (!raw || raw.gearScore == null) {
        return reply.status(400).send({ error: '스탯 데이터 필수' });
      }
      const normalized = normalizeForPvp(raw);
      return reply.status(200).send({ raw, normalized });
    },
  );
}
