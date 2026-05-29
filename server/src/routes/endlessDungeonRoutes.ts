/**
 * endlessDungeonRoutes.ts — 무한 던전(시간의 탑) REST API (P11-04)
 *
 * GET  /api/endless-dungeon/leaderboard   — 리더보드 조회
 * GET  /api/endless-dungeon/progress      — 내 진행 상태
 * POST /api/endless-dungeon/enter         — 입장
 * POST /api/endless-dungeon/complete-floor — 층 클리어
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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
  // SECURITY-IDOR: playerId 는 더 이상 actor 로 신뢰하지 않음(request.authUserId 사용). 호환용으로만 허용.
  playerId?: string;
  weekId?: string;
}

interface EnterBody {
  // SECURITY-IDOR: playerId 는 더 이상 actor 로 신뢰하지 않음(request.authUserId 사용). 호환용으로만 허용.
  playerId?: string;
}

interface CompleteFloorBody {
  // SECURITY-IDOR: playerId 는 더 이상 actor 로 신뢰하지 않음(request.authUserId 사용). 호환용으로만 허용.
  playerId?: string;
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

    const entries = await (leaderboard as any).getTop(weekId, limit);
    return { weekId, entries };
  });

  /**
   * GET /api/endless-dungeon/progress — 내 진행 상태
   * ?weekId=2026-W11 (actor 는 인증된 request.authUserId)
   */
  fastify.get('/api/endless-dungeon/progress', async (
    request: FastifyRequest<{ Querystring: ProgressQuery }>,
    reply: FastifyReply,
  ) => {
    // SECURITY-IDOR: query 의 playerId 를 신뢰하지 않고 인증된 행위자(request.authUserId)만 조회한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { weekId } = request.query;

    const progress = await getPlayerProgress(userId, weekId);
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
      // SECURITY-IDOR: body 의 playerId 를 신뢰하지 않고 인증된 행위자(request.authUserId)로 입장한다.
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

      const check = await canEnterEndlessDungeon(userId);
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
      // SECURITY-IDOR: body 의 playerId 를 신뢰하지 않고 인증된 행위자(request.authUserId)로 기록을 제출한다.
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
      const { floor, clearTime } = request.body;
      if (!floor) {
        return reply.status(400).send({ error: 'floor는 필수입니다.' });
      }

      const floorConfig = generateFloorConfig(floor);
      const rewards = getFloorRewards(floor, floorConfig);
      const weekId = getWeekId();

      // 리더보드 업데이트
      await (leaderboard as any).submit({
        playerId: userId,
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
