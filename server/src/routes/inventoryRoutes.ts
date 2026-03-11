/**
 * P4-09: 인벤토리/장비 REST API 라우트
 *
 * GET    /api/inventory/:userId      — 인벤토리 조회
 * POST   /api/inventory/add          — 아이템 추가
 * POST   /api/inventory/equip        — 장착
 * POST   /api/inventory/unequip      — 해제
 * POST   /api/inventory/sell         — 판매
 * POST   /api/inventory/use          — 소모품 사용
 * POST   /api/inventory/split        — 스택 분할
 * POST   /api/inventory/merge        — 스택 합치기
 * DELETE /api/inventory/:slotId      — 아이템 버리기
 * POST   /api/inventory/seed         — 아이템 시드 실행 (관리자용)
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { inventoryManager } from '../inventory/inventoryManager';
import { seedItems, getItemSeedCount } from '../inventory/itemSeeds';

// ─── 타입 정의 ──────────────────────────────────────────────────

interface UserIdParams { userId: string }
interface SlotIdParams { slotId: string }

interface AddBody {
  userId: string;
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

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function inventoryRoutes(fastify: FastifyInstance): Promise<void> {

  /** GET /api/inventory/:userId — 인벤토리 조회 */
  fastify.get('/api/inventory/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
  ) => {
    const { userId } = request.params;
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

  /** POST /api/inventory/add — 아이템 추가 */
  fastify.post('/api/inventory/add', async (
    request: FastifyRequest<{ Body: AddBody }>,
  ) => {
    const { userId, itemCode, quantity } = request.body;
    if (!userId || !itemCode) {
      return { success: false, message: 'userId, itemCode 필수' };
    }
    const result = await inventoryManager.addItem(userId, itemCode, quantity ?? 1);
    return { success: result.success, data: result };
  });

  /** POST /api/inventory/equip — 장착 */
  fastify.post('/api/inventory/equip', async (
    request: FastifyRequest<{ Body: EquipBody }>,
  ) => {
    const { slotId, equipSlot } = request.body;
    if (!slotId || !equipSlot) {
      return { success: false, message: 'slotId, equipSlot 필수' };
    }
    const result = await inventoryManager.equip(slotId, equipSlot);
    return { success: result.success, data: result };
  });

  /** POST /api/inventory/unequip — 장착 해제 */
  fastify.post('/api/inventory/unequip', async (
    request: FastifyRequest<{ Body: UnequipBody }>,
  ) => {
    const { slotId } = request.body;
    if (!slotId) {
      return { success: false, message: 'slotId 필수' };
    }
    const result = await inventoryManager.unequip(slotId);
    return { success: result.success, data: result };
  });

  /** POST /api/inventory/sell — 아이템 판매 */
  fastify.post('/api/inventory/sell', async (
    request: FastifyRequest<{ Body: SellBody }>,
  ) => {
    const { slotId, quantity } = request.body;
    if (!slotId) {
      return { success: false, message: 'slotId 필수' };
    }
    const result = await inventoryManager.sellItem(slotId, quantity ?? 1);
    return { success: result.success, data: result };
  });

  /** POST /api/inventory/use — 소모품 사용 */
  fastify.post('/api/inventory/use', async (
    request: FastifyRequest<{ Body: UseBody }>,
  ) => {
    const { slotId } = request.body;
    if (!slotId) {
      return { success: false, message: 'slotId 필수' };
    }
    const result = await inventoryManager.useItem(slotId);
    return { success: result.success, data: result };
  });

  /** POST /api/inventory/split — 스택 분할 */
  fastify.post('/api/inventory/split', async (
    request: FastifyRequest<{ Body: SplitBody }>,
  ) => {
    const { slotId, quantity } = request.body;
    if (!slotId || !quantity) {
      return { success: false, message: 'slotId, quantity 필수' };
    }
    const result = await inventoryManager.splitStack(slotId, quantity);
    return { success: result.success, data: result };
  });

  /** POST /api/inventory/merge — 스택 합치기 */
  fastify.post('/api/inventory/merge', async (
    request: FastifyRequest<{ Body: MergeBody }>,
  ) => {
    const { sourceSlotId, targetSlotId } = request.body;
    if (!sourceSlotId || !targetSlotId) {
      return { success: false, message: 'sourceSlotId, targetSlotId 필수' };
    }
    const result = await inventoryManager.mergeStacks(sourceSlotId, targetSlotId);
    return { success: result.success, data: result };
  });

  /** DELETE /api/inventory/:slotId — 아이템 버리기 */
  fastify.delete('/api/inventory/:slotId', async (
    request: FastifyRequest<{ Params: SlotIdParams }>,
  ) => {
    const { slotId } = request.params;
    const result = await inventoryManager.removeItem(slotId);
    return { success: result.success, data: result };
  });

  /** POST /api/inventory/seed — 아이템 시드 실행 (관리자용) */
  fastify.post('/api/inventory/seed', async () => {
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
