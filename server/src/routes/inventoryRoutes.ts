/**
 * P4-09: 인벤토리/장비 REST API 라우트
 *
 * GET    /api/inventory             — 내 인벤토리 조회 (JWT)
 * GET    /api/inventory/:ownerId    — 하위 호환 조회 (본인/본인 캐릭터만)
 * POST   /api/inventory/add         — 아이템 추가
 * POST   /api/inventory/equip       — 장착
 * POST   /api/inventory/unequip     — 해제
 * POST   /api/inventory/sell        — 판매
 * POST   /api/inventory/use         — 소모품 사용
 * POST   /api/inventory/split       — 스택 분할
 * POST   /api/inventory/merge       — 스택 합치기
 * DELETE /api/inventory/:slotId     — 아이템 버리기
 * POST   /api/inventory/seed        — 아이템 시드 실행 (관리자용)
 *
 * SECURITY-IDOR: 변경 계열(equip/unequip/sell/use/split/merge/delete)은 slotId 소유권을
 * 인증된 사용자(request.authUserId) 기준으로 검증한다. 무인증/타 유저 slotId 조작 차단.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { inventoryManager } from '../inventory/inventoryManager';
import { seedItems, getItemSeedCount } from '../inventory/itemSeeds';
import { extractUserIdFromRequest } from '../security/jwtManager';
import { requireAdmin } from '../admin/authMiddleware';

// ─── 타입 정의 ──────────────────────────────────────────────────

interface OwnerIdParams { ownerId: string }
interface SlotIdParams { slotId: string }

interface AddBody {
  itemCode: string;
  quantity?: number;
}

interface EquipBody {
  slotId: string;
  equipSlot: string;
}

interface UnequipBody {
  slotId: string;
}

interface SellBody {
  slotId: string;
  quantity?: number;
}

interface UseBody {
  slotId: string;
}

interface SplitBody {
  slotId: string;
  quantity: number;
}

interface MergeBody {
  sourceSlotId: string;
  targetSlotId: string;
}

// ─── 소유권 헬퍼 ────────────────────────────────────────────────

/** slotId 가 userId 소유인지 검증 (SECURITY-IDOR) */
async function isSlotOwner(slotId: string, userId: string): Promise<boolean> {
  const slot = await prisma.inventorySlot.findUnique({
    where: { id: slotId },
    select: { userId: true },
  });
  return !!slot && slot.userId === userId;
}

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function inventoryRoutes(fastify: FastifyInstance): Promise<void> {

  /** GET /api/inventory — 내 인벤토리 조회 (JWT 인증) */
  fastify.get('/api/inventory', async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const inventory = await inventoryManager.getInventory(userId);
    return {
      success: true,
      data: {
        userId,
        slotCount: inventory.length,
        items: inventory,
      },
    };
  });

  /** GET /api/inventory/:ownerId — 하위 호환 인벤토리 조회 (userId 또는 characterId) */
  fastify.get('/api/inventory/:ownerId', async (
    request: FastifyRequest<{ Params: OwnerIdParams }>,
    reply: FastifyReply,
  ) => {
    const authUserId = await extractUserIdFromRequest(request);
    if (!authUserId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { ownerId } = request.params;
    let inventoryUserId: string | null = ownerId === authUserId ? authUserId : null;

    if (!inventoryUserId) {
      const character = await prisma.character.findFirst({
        where: { id: ownerId, userId: authUserId },
        select: { userId: true },
      });
      inventoryUserId = character?.userId ?? null;
    }

    if (!inventoryUserId) {
      return reply.status(404).send({ error: '인벤토리 소유자를 찾을 수 없습니다.' });
    }

    const inventory = await inventoryManager.getInventory(inventoryUserId);
    return {
      success: true,
      data: {
        userId: inventoryUserId,
        ownerId,
        slotCount: inventory.length,
        items: inventory,
      },
    };
  });

  /** POST /api/inventory/add — 아이템 추가 */
  fastify.post('/api/inventory/add', async (
    request: FastifyRequest<{ Body: AddBody }>,
    reply: FastifyReply,
  ) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { itemCode, quantity } = request.body;
    if (!itemCode) {
      return { success: false, message: 'itemCode 필수' };
    }
    const result = await inventoryManager.addItem(userId, itemCode, quantity ?? 1);
    return { success: result.success, data: result };
  });

  /** POST /api/inventory/equip — 장착 */
  fastify.post('/api/inventory/equip', async (
    request: FastifyRequest<{ Body: EquipBody }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ success: false, message: '인증이 필요합니다.' });
    const { slotId, equipSlot } = request.body;
    if (!slotId || !equipSlot) {
      return { success: false, message: 'slotId, equipSlot 필수' };
    }
    if (!(await isSlotOwner(slotId, userId))) {
      return reply.status(403).send({ success: false, message: '본인 아이템이 아닙니다.' });
    }
    const result = await inventoryManager.equip(slotId, equipSlot);
    return { success: result.success, data: result };
  });

  /** POST /api/inventory/unequip — 장착 해제 */
  fastify.post('/api/inventory/unequip', async (
    request: FastifyRequest<{ Body: UnequipBody }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ success: false, message: '인증이 필요합니다.' });
    const { slotId } = request.body;
    if (!slotId) {
      return { success: false, message: 'slotId 필수' };
    }
    if (!(await isSlotOwner(slotId, userId))) {
      return reply.status(403).send({ success: false, message: '본인 아이템이 아닙니다.' });
    }
    const result = await inventoryManager.unequip(slotId);
    return { success: result.success, data: result };
  });

  /** POST /api/inventory/sell — 아이템 판매 */
  fastify.post('/api/inventory/sell', async (
    request: FastifyRequest<{ Body: SellBody }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ success: false, message: '인증이 필요합니다.' });
    const { slotId, quantity } = request.body;
    if (!slotId) {
      return { success: false, message: 'slotId 필수' };
    }
    if (!(await isSlotOwner(slotId, userId))) {
      return reply.status(403).send({ success: false, message: '본인 아이템이 아닙니다.' });
    }
    const result = await inventoryManager.sellItem(slotId, quantity ?? 1);
    return { success: result.success, data: result };
  });

  /** POST /api/inventory/use — 소모품 사용 */
  fastify.post('/api/inventory/use', async (
    request: FastifyRequest<{ Body: UseBody }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ success: false, message: '인증이 필요합니다.' });
    const { slotId } = request.body;
    if (!slotId) {
      return { success: false, message: 'slotId 필수' };
    }
    if (!(await isSlotOwner(slotId, userId))) {
      return reply.status(403).send({ success: false, message: '본인 아이템이 아닙니다.' });
    }
    const result = await inventoryManager.useItem(slotId);
    return { success: result.success, data: result };
  });

  /** POST /api/inventory/split — 스택 분할 */
  fastify.post('/api/inventory/split', async (
    request: FastifyRequest<{ Body: SplitBody }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ success: false, message: '인증이 필요합니다.' });
    const { slotId, quantity } = request.body;
    if (!slotId || !quantity) {
      return { success: false, message: 'slotId, quantity 필수' };
    }
    if (!(await isSlotOwner(slotId, userId))) {
      return reply.status(403).send({ success: false, message: '본인 아이템이 아닙니다.' });
    }
    const result = await inventoryManager.splitStack(slotId, quantity);
    return { success: result.success, data: result };
  });

  /** POST /api/inventory/merge — 스택 합치기 */
  fastify.post('/api/inventory/merge', async (
    request: FastifyRequest<{ Body: MergeBody }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ success: false, message: '인증이 필요합니다.' });
    const { sourceSlotId, targetSlotId } = request.body;
    if (!sourceSlotId || !targetSlotId) {
      return { success: false, message: 'sourceSlotId, targetSlotId 필수' };
    }
    if (!(await isSlotOwner(sourceSlotId, userId)) || !(await isSlotOwner(targetSlotId, userId))) {
      return reply.status(403).send({ success: false, message: '본인 아이템이 아닙니다.' });
    }
    const result = await inventoryManager.mergeStacks(sourceSlotId, targetSlotId);
    return { success: result.success, data: result };
  });

  /** DELETE /api/inventory/:slotId — 아이템 버리기 */
  fastify.delete('/api/inventory/:slotId', async (
    request: FastifyRequest<{ Params: SlotIdParams }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ success: false, message: '인증이 필요합니다.' });
    const { slotId } = request.params;
    if (!(await isSlotOwner(slotId, userId))) {
      return reply.status(403).send({ success: false, message: '본인 아이템이 아닙니다.' });
    }
    const result = await inventoryManager.removeItem(slotId);
    return { success: result.success, data: result };
  });

  /** POST /api/inventory/seed — 아이템 시드 실행 (관리자 전용) */
  fastify.post('/api/inventory/seed', { preHandler: requireAdmin('admin') }, async () => {
    const result = await seedItems();
    return {
      success: true,
      data: {
        ...result,
        totalSeeds: getItemSeedCount(),
      },
    };
  });
}
