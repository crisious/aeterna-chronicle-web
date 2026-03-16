/**
 * saveRoutes.ts — 세이브/체크포인트 REST API (P6-11)
 *
 * 엔드포인트:
 *   GET    /api/save/:userId          — 전체 슬롯 조회
 *   POST   /api/save/:slot            — 수동 세이브
 *   POST   /api/save/load/:slot       — 세이브 로드
 *   DELETE /api/save/:slot            — 슬롯 삭제
 *   POST   /api/save/auto             — 자동 세이브 (서버 내부 트리거)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getAllSaves,
  manualSave,
  loadSave,
  deleteSave,
  autoSave,
  SaveData,
} from '../save/saveManager';

// ── 요청 타입 ───────────────────────────────────────────────────

interface UserIdParams { userId: string; }
interface SlotParams { slot: string; }

interface ManualSaveBody {
  userId: string;
  data: SaveData;
  label?: string;
}

interface LoadBody {
  userId: string;
}

interface AutoSaveBody {
  userId: string;
  data: SaveData;
}

interface DeleteBody {
  userId: string;
}

// ── 라우트 등록 ─────────────────────────────────────────────────

export async function saveRoutes(fastify: FastifyInstance): Promise<void> {

  /** GET /api/save/:userId — 전체 슬롯 목록 */
  fastify.get('/api/save/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.params;
    const slots = await getAllSaves(userId);
    return reply.send({ saves: slots });
  });

  /** POST /api/save/:slot — 수동 세이브 */
  fastify.post('/api/save/:slot', async (
    request: FastifyRequest<{ Params: SlotParams; Body: ManualSaveBody }>,
    reply: FastifyReply,
  ) => {
    const slot = parseInt(request.params.slot, 10);
    const { userId, data, label } = request.body;

    if (!userId || !data) {
      return reply.status(400).send({ error: '필수 파라미터 누락' });
    }

    const result = await manualSave(userId, slot, data, label);
    if (!result.success) {
      return reply.status(400).send({ error: result.reason });
    }
    return reply.send({ slot, status: 'saved' });
  });

  /** POST /api/save/load/:slot — 세이브 로드 */
  fastify.post('/api/save/load/:slot', async (
    request: FastifyRequest<{ Params: SlotParams; Body: LoadBody }>,
    reply: FastifyReply,
  ) => {
    const slot = parseInt(request.params.slot, 10);
    const { userId } = request.body;

    if (!userId) {
      return reply.status(400).send({ error: 'userId 필수' });
    }

    const data = await loadSave(userId, slot);
    if (!data) {
      return reply.status(404).send({ error: '해당 슬롯에 저장 데이터 없음' });
    }
    return reply.send({ slot, data });
  });

  /** DELETE /api/save/:slot — 슬롯 삭제 */
  fastify.delete('/api/save/:slot', async (
    request: FastifyRequest<{ Params: SlotParams; Body: DeleteBody }>,
    reply: FastifyReply,
  ) => {
    const slot = parseInt(request.params.slot, 10);
    const { userId } = request.body;

    if (!userId) {
      return reply.status(400).send({ error: 'userId 필수' });
    }

    const result = await deleteSave(userId, slot);
    if (!result.success) {
      return reply.status(400).send({ error: result.reason });
    }
    return reply.send({ slot, status: 'deleted' });
  });

  /** POST /api/save/auto — 자동 세이브 (내부 트리거) */
  fastify.post('/api/save/auto', async (
    request: FastifyRequest<{ Body: AutoSaveBody }>,
    reply: FastifyReply,
  ) => {
    const { userId, data } = request.body;
    if (!userId || !data) {
      return reply.status(400).send({ error: '필수 파라미터 누락' });
    }

    await autoSave(userId, data);
    return reply.send({ slot: 0, status: 'auto_saved' });
  });
}
