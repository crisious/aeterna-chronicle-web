/**
 * endlessDungeonRoutes.ts — 무한 던전(시간의 탑) REST API (P11-04)
 *
 * GET  /api/endless-dungeon/leaderboard   — 리더보드 조회
 * GET  /api/endless-dungeon/progress      — 내 진행 상태
 * POST /api/endless-dungeon/enter         — 입장
 * POST /api/endless-dungeon/complete-floor — 층 클리어
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import {
  canEnterEndlessDungeon,
  getPlayerProgress,
  generateFloorConfig,
  getWeekId,
  EndlessDungeonLeaderboard,
  getFloorRewards,
} from '../dungeon/endlessDungeonManager';

// ─── 타입 정의 ──────────────────────────────────────────────────

interface ProgressQuery {
  playerId: string;
  weekId?: string;
}

interface EnterBody {
  playerId: string;
}

interface CompleteFloorBody {
  playerId: string;
  floor: number;
  clearTime: number; // 초
}

interface LeaderboardQuery {
  weekId?: string;
  limit?: string;
}

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function endlessDungeonRoutes(fastify: FastifyInstance): Promise<void> {
  const leaderboard = new EndlessDungeonLeaderboard();

  /**
   * GET /api/endless-dungeon/leaderboard — 리더보드 조회
   * ?weekId=2026-W11&limit=50
   */
  fastify.get('/api/endless-dungeon/leaderboard', async (
    request: FastifyRequest<{ Querystring: LeaderboardQuery }>,
    _reply: FastifyReply,
  ) => {
    const weekId = request.query.weekId ?? getWeekId();
    const limit = Math.min(Number(request.query.limit) || 50, 100);

    const entries = await leaderboard.getTop(weekId, limit);
    return { weekId, entries };
  });

  /**
   * GET /api/endless-dungeon/progress — 내 진행 상태
   * ?playerId=xxx&weekId=2026-W11
   */
  fastify.get('/api/endless-dungeon/progress', async (
    request: FastifyRequest<{ Querystring: ProgressQuery }>,
    reply: FastifyReply,
  ) => {
    const { playerId, weekId } = request.query;
    if (!playerId) {
      return reply.status(400).send({ error: 'playerId는 필수입니다.' });
    }

    const progress = await getPlayerProgress(playerId, weekId);
    return progress;
  });

  /**
   * POST /api/endless-dungeon/enter — 입장
   */
  fastify.post('/api/endless-dungeon/enter', async (
    request: FastifyRequest<{ Body: EnterBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { playerId } = request.body;
      if (!playerId) {
        return reply.status(400).send({ error: 'playerId는 필수입니다.' });
      }

      const check = await canEnterEndlessDungeon(playerId);
      if (!check.allowed) {
        return reply.status(403).send({ error: check.reason });
      }

      // 1층 설정 생성
      const floorConfig = generateFloorConfig(1);
      const weekId = getWeekId();

      return reply.status(200).send({
        weekId,
        floor: 1,
        config: floorConfig,
        message: '시간의 탑에 입장했습니다.',
      });
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  /**
   * POST /api/endless-dungeon/complete-floor — 층 클리어
   */
  fastify.post('/api/endless-dungeon/complete-floor', async (
    request: FastifyRequest<{ Body: CompleteFloorBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { playerId, floor, clearTime } = request.body;
      if (!playerId || !floor) {
        return reply.status(400).send({ error: 'playerId, floor는 필수입니다.' });
      }

      const floorConfig = generateFloorConfig(floor);
      const rewards = getFloorRewards(floor, floorConfig);
      const weekId = getWeekId();

      // 리더보드 업데이트
      await leaderboard.submit({
        playerId,
        playerName: '', // 실제 구현 시 유저 이름 조회
        highestFloor: floor,
        clearTime,
        weekId,
        timestamp: new Date(),
      });

      // 다음 층 설정
      const nextFloor = generateFloorConfig(floor + 1);

      return reply.status(200).send({
        cleared: true,
        floor,
        rewards,
        nextFloor: {
          floor: floor + 1,
          config: nextFloor,
        },
      });
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });
}
