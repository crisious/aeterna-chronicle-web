/**
 * saveRoutes.ts — 세이브/체크포인트 REST API (P6-11)
 *
 * 엔드포인트:
 *   GET    /api/save/:userId          — 전체 슬롯 조회 (본인만)
 *   POST   /api/save/:slot            — 수동 세이브 (본인만)
 *   POST   /api/save/load/:slot       — 세이브 로드 (본인만)
 *   DELETE /api/save/:slot            — 슬롯 삭제 (본인만)
 *   POST   /api/save/auto             — 자동 세이브 (본인만)
 *
 * SECURITY-IDOR: 세이브는 항상 인증된 사용자(request.authUserId) 본인 것만 접근한다.
 * 기존에는 params/body 의 userId 를 신뢰해 임의 유저 세이브 열람/덮어쓰기/삭제가 가능했다.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type {
  SaveData} from '../save/saveManager';
import {
  getAllSaves,
  manualSave,
  loadSave,
  deleteSave,
  autoSave
} from '../save/saveManager';

// ── 요청 타입 ───────────────────────────────────────────────────

interface UserIdParams { userId: string; }
interface SlotParams { slot: string; }

interface ManualSaveBody {
  data: SaveData;
  label?: string;
}

interface AutoSaveBody {
  data: SaveData;
}

// ── 라우트 등록 ─────────────────────────────────────────────────

export async function saveRoutes(fastify: FastifyInstance): Promise<void> {

  /** GET /api/save/:userId — 전체 슬롯 목록 (본인만) */
  fastify.get('/api/save/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const slots = await getAllSaves(userId);
    return reply.send({ saves: slots });
  });

  /** POST /api/save/:slot — 수동 세이브 (본인만) */
  fastify.post('/api/save/:slot', async (
    request: FastifyRequest<{ Params: SlotParams; Body: ManualSaveBody }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const slot = parseInt(request.params.slot, 10);
    const { data, label } = request.body;

    if (!data) {
      return reply.status(400).send({ error: '필수 파라미터 누락' });
    }

    const result = await manualSave(userId, slot, data, label);
    if (!result.success) {
      return reply.status(400).send({ error: result.reason });
    }
    return reply.send({ slot, status: 'saved' });
  });

  /** POST /api/save/load/:slot — 세이브 로드 (본인만) */
  fastify.post('/api/save/load/:slot', async (
    request: FastifyRequest<{ Params: SlotParams }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const slot = parseInt(request.params.slot, 10);

    const data = await loadSave(userId, slot);
    if (!data) {
      return reply.status(404).send({ error: '해당 슬롯에 저장 데이터 없음' });
    }
    return reply.send({ slot, data });
  });

  /** DELETE /api/save/:slot — 슬롯 삭제 (본인만) */
  fastify.delete('/api/save/:slot', async (
    request: FastifyRequest<{ Params: SlotParams }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const slot = parseInt(request.params.slot, 10);

    const result = await deleteSave(userId, slot);
    if (!result.success) {
      return reply.status(400).send({ error: result.reason });
    }
    return reply.send({ slot, status: 'deleted' });
  });

  /** POST /api/save/auto — 자동 세이브 (본인만) */
  fastify.post('/api/save/auto', async (
    request: FastifyRequest<{ Body: AutoSaveBody }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { data } = request.body;
    if (!data) {
      return reply.status(400).send({ error: '필수 파라미터 누락' });
    }

    await autoSave(userId, data);
    return reply.send({ slot: 0, status: 'auto_saved' });
  });
}
