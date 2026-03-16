/**
 * P4-09: 인벤토리/장비 매니저
 *
 * 아이템 추가/제거/이동/분할/합치기, 장착/해제 (슬롯 검증),
 * 인벤토리 용량 제한, 랜덤 옵션 생성
 */

import { prisma } from '../db';
import { economySimulator, type GoldSourceEvent } from '../economy/economySimulator';
import { calculateSellPrice } from '../economy/balanceTable';

// ─── 상수 ───────────────────────────────────────────────────────

/** 기본 인벤토리 용량 */
export const DEFAULT_INVENTORY_CAPACITY = 50;

/** 유효한 장비 슬롯 목록 */
export const VALID_EQUIP_SLOTS = [
  'head', 'body', 'weapon', 'shield',
  'ring1', 'ring2', 'necklace', 'earring',
  'gloves', 'boots',
] as const;

export type EquipSlotName = typeof VALID_EQUIP_SLOTS[number];

/** 아이템 타입 → 장착 가능 슬롯 매핑 */
const TYPE_TO_EQUIP_SLOTS: Record<string, EquipSlotName[]> = {
  weapon:    ['weapon'],
  armor:     ['head', 'body', 'gloves', 'boots'],
  accessory: ['ring1', 'ring2', 'necklace', 'earring'],
  shield:    ['shield'],
};

/** 등급별 랜덤 옵션 수 범위 [min, max] */
const GRADE_OPTION_RANGE: Record<string, [number, number]> = {
  common:    [0, 1],
  uncommon:  [1, 1],
  rare:      [1, 2],
  epic:      [2, 3],
  legendary: [3, 4],
};

/** 랜덤 옵션 후보 스탯 */
const OPTION_STATS = [
  'attack', 'defense', 'hp', 'mp',
  'critRate', 'critDamage', 'speed',
  'evasion', 'accuracy', 'elementalDamage',
];

// ─── 타입 ───────────────────────────────────────────────────────

export interface RandomOption {
  stat: string;
  value: number;
}

export interface AddItemResult {
  success: boolean;
  slotId?: string;
  message: string;
}

export interface EquipResult {
  success: boolean;
  message: string;
  unequippedSlotId?: string; // 기존 장착 해제된 슬롯
}

// ─── 인벤토리 매니저 ────────────────────────────────────────────

export class InventoryManager {

  // ── 아이템 추가 ────────────────────────────────────────────

  /**
   * 아이템을 인벤토리에 추가
   * - 스택 가능 아이템은 기존 슬롯에 수량 합산
   * - 용량 초과 시 실패 반환
   * - 장비류는 등급별 랜덤 옵션 자동 생성
   */
  async addItem(
    userId: string,
    itemCode: string,
    quantity: number = 1,
    capacity: number = DEFAULT_INVENTORY_CAPACITY,
  ): Promise<AddItemResult> {
    // 아이템 마스터 데이터 조회
    const item = await prisma.item.findUnique({ where: { code: itemCode } });
    if (!item) {
      return { success: false, message: `아이템 코드 '${itemCode}' 를 찾을 수 없음` };
    }

    // 스택 가능 아이템: 기존 슬롯 합산 시도
    if (item.stackable) {
      const existing = await prisma.inventorySlot.findFirst({
        where: { userId, itemId: item.id, isEquipped: false },
      });
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (newQty > item.maxStack) {
          return { success: false, message: `최대 스택(${item.maxStack}) 초과` };
        }
        await prisma.inventorySlot.update({
          where: { id: existing.id },
          data: { quantity: newQty },
        });
        return { success: true, slotId: existing.id, message: `수량 갱신: ${newQty}` };
      }
    }

    // 용량 검사
    const currentSlots = await prisma.inventorySlot.count({ where: { userId } });
    if (currentSlots >= capacity) {
      return { success: false, message: `인벤토리 용량 초과 (${currentSlots}/${capacity})` };
    }

    // 랜덤 옵션 생성 (장비류만)
    const options = this.isEquippable(item.type)
      ? this.generateRandomOptions(item.grade)
      : undefined;

    const slot = await prisma.inventorySlot.create({
      data: {
        userId,
        itemId: item.id,
        quantity,
        options: options ? JSON.parse(JSON.stringify(options)) : undefined,
      },
    });

    return { success: true, slotId: slot.id, message: '아이템 추가 완료' };
  }

  // ── 아이템 제거 ────────────────────────────────────────────

  /** 인벤토리 슬롯 제거 (버리기) */
  async removeItem(slotId: string): Promise<{ success: boolean; message: string }> {
    const slot = await prisma.inventorySlot.findUnique({ where: { id: slotId } });
    if (!slot) return { success: false, message: '슬롯을 찾을 수 없음' };
    if (slot.isEquipped) return { success: false, message: '장착 중인 아이템은 버릴 수 없음' };

    await prisma.inventorySlot.delete({ where: { id: slotId } });
    return { success: true, message: '아이템 제거 완료' };
  }

  // ── 수량 분할 ──────────────────────────────────────────────

  /** 스택 아이템 분할: 원래 슬롯에서 splitQty만큼 새 슬롯으로 분리 */
  async splitStack(
    slotId: string,
    splitQty: number,
    capacity: number = DEFAULT_INVENTORY_CAPACITY,
  ): Promise<{ success: boolean; newSlotId?: string; message: string }> {
    const slot = await prisma.inventorySlot.findUnique({ where: { id: slotId } });
    if (!slot) return { success: false, message: '슬롯을 찾을 수 없음' };
    if (splitQty <= 0 || splitQty >= slot.quantity) {
      return { success: false, message: '분할 수량이 유효하지 않음' };
    }

    const currentSlots = await prisma.inventorySlot.count({ where: { userId: slot.userId } });
    if (currentSlots >= capacity) {
      return { success: false, message: '인벤토리 용량 초과' };
    }

    const [, newSlot] = await prisma.$transaction([
      prisma.inventorySlot.update({
        where: { id: slotId },
        data: { quantity: slot.quantity - splitQty },
      }),
      prisma.inventorySlot.create({
        data: {
          userId: slot.userId,
          itemId: slot.itemId,
          quantity: splitQty,
          enhancement: slot.enhancement,
          options: slot.options as object | undefined,
        },
      }),
    ]);

    return { success: true, newSlotId: newSlot.id, message: `${splitQty}개 분할 완료` };
  }

  // ── 수량 합치기 ────────────────────────────────────────────

  /** 동일 아이템 슬롯 합치기 */
  async mergeStacks(
    sourceSlotId: string,
    targetSlotId: string,
  ): Promise<{ success: boolean; message: string }> {
    const [source, target] = await Promise.all([
      prisma.inventorySlot.findUnique({ where: { id: sourceSlotId } }),
      prisma.inventorySlot.findUnique({ where: { id: targetSlotId } }),
    ]);
    if (!source || !target) return { success: false, message: '슬롯을 찾을 수 없음' };
    if (source.itemId !== target.itemId) return { success: false, message: '동일 아이템이 아님' };

    const item = await prisma.item.findUnique({ where: { id: source.itemId } });
    if (!item?.stackable) return { success: false, message: '스택 불가 아이템' };

    const totalQty = source.quantity + target.quantity;
    if (totalQty > item.maxStack) {
      return { success: false, message: `최대 스택(${item.maxStack}) 초과` };
    }

    await prisma.$transaction([
      prisma.inventorySlot.update({
        where: { id: targetSlotId },
        data: { quantity: totalQty },
      }),
      prisma.inventorySlot.delete({ where: { id: sourceSlotId } }),
    ]);

    return { success: true, message: `합치기 완료 (수량: ${totalQty})` };
  }

  // ── 장착 ───────────────────────────────────────────────────

  /** 아이템 장착 — 슬롯 검증 + 기존 장착 해제 */
  async equip(
    slotId: string,
    equipSlot: string,
  ): Promise<EquipResult> {
    const slot = await prisma.inventorySlot.findUnique({ where: { id: slotId } });
    if (!slot) return { success: false, message: '슬롯을 찾을 수 없음' };
    if (slot.isEquipped) return { success: false, message: '이미 장착 중' };

    const item = await prisma.item.findUnique({ where: { id: slot.itemId } });
    if (!item) return { success: false, message: '아이템 데이터 없음' };

    // 장착 슬롯 유효성 검증
    if (!VALID_EQUIP_SLOTS.includes(equipSlot as EquipSlotName)) {
      return { success: false, message: `유효하지 않은 장비 슬롯: ${equipSlot}` };
    }

    const allowedSlots = TYPE_TO_EQUIP_SLOTS[item.type];
    if (!allowedSlots) {
      return { success: false, message: `장착 불가 아이템 타입: ${item.type}` };
    }

    // ring1/ring2 → 'ring'으로 정규화하여 비교, earring도 동일
    const normalizedSlot = equipSlot.replace(/[12]$/, '');
    const normalizedAllowed = allowedSlots.map(s => s.replace(/[12]$/, ''));
    if (!normalizedAllowed.includes(normalizedSlot as EquipSlotName)) {
      return { success: false, message: `이 아이템은 '${equipSlot}' 슬롯에 장착 불가` };
    }

    // 기존 장착 해제
    let unequippedSlotId: string | undefined;
    const existing = await prisma.inventorySlot.findFirst({
      where: { userId: slot.userId, equipSlot, isEquipped: true },
    });
    if (existing) {
      await prisma.inventorySlot.update({
        where: { id: existing.id },
        data: { isEquipped: false, equipSlot: null },
      });
      unequippedSlotId = existing.id;
    }

    // 장착 처리
    await prisma.inventorySlot.update({
      where: { id: slotId },
      data: { isEquipped: true, equipSlot },
    });

    return { success: true, message: '장착 완료', unequippedSlotId };
  }

  // ── 장착 해제 ──────────────────────────────────────────────

  async unequip(slotId: string): Promise<{ success: boolean; message: string }> {
    const slot = await prisma.inventorySlot.findUnique({ where: { id: slotId } });
    if (!slot) return { success: false, message: '슬롯을 찾을 수 없음' };
    if (!slot.isEquipped) return { success: false, message: '장착 중이 아님' };

    await prisma.inventorySlot.update({
      where: { id: slotId },
      data: { isEquipped: false, equipSlot: null },
    });

    return { success: true, message: '장착 해제 완료' };
  }

  // ── 아이템 판매 ────────────────────────────────────────────

  /** NPC에게 아이템 판매 (매입가 = 상점가 × 30%) */
  async sellItem(
    slotId: string,
    quantity: number = 1,
  ): Promise<{ success: boolean; goldEarned: number; message: string }> {
    const slot = await prisma.inventorySlot.findUnique({ where: { id: slotId } });
    if (!slot) return { success: false, goldEarned: 0, message: '슬롯을 찾을 수 없음' };
    if (slot.isEquipped) return { success: false, goldEarned: 0, message: '장착 중인 아이템은 판매 불가' };

    const item = await prisma.item.findUnique({ where: { id: slot.itemId } });
    if (!item) return { success: false, goldEarned: 0, message: '아이템 데이터 없음' };
    if (!item.tradeable) return { success: false, goldEarned: 0, message: '거래 불가 아이템' };

    if (quantity > slot.quantity) {
      return { success: false, goldEarned: 0, message: '보유 수량 부족' };
    }

    const sellPricePerUnit = item.sellPrice > 0 ? item.sellPrice : calculateSellPrice(item.price);
    const totalGold = sellPricePerUnit * quantity;

    if (quantity >= slot.quantity) {
      await prisma.inventorySlot.delete({ where: { id: slotId } });
    } else {
      await prisma.inventorySlot.update({
        where: { id: slotId },
        data: { quantity: slot.quantity - quantity },
      });
    }

    // 경제 시뮬레이터에 소스 이벤트 기록
    const sourceEvent: GoldSourceEvent = {
      type: 'item_sell',
      userId: slot.userId,
      amount: totalGold,
      timestamp: new Date(),
      detail: `${item.name} ×${quantity} 판매`,
    };
    economySimulator.recordSource(sourceEvent);

    return { success: true, goldEarned: totalGold, message: `${totalGold}G 획득` };
  }

  // ── 소모품 사용 ────────────────────────────────────────────

  /** 소모품 사용 (수량 1 차감, 효과는 반환값으로 전달) */
  async useItem(
    slotId: string,
  ): Promise<{ success: boolean; effect?: object; message: string }> {
    const slot = await prisma.inventorySlot.findUnique({ where: { id: slotId } });
    if (!slot) return { success: false, message: '슬롯을 찾을 수 없음' };

    const item = await prisma.item.findUnique({ where: { id: slot.itemId } });
    if (!item) return { success: false, message: '아이템 데이터 없음' };
    if (item.type !== 'consumable') return { success: false, message: '소모품이 아님' };

    // 수량 차감
    if (slot.quantity <= 1) {
      await prisma.inventorySlot.delete({ where: { id: slotId } });
    } else {
      await prisma.inventorySlot.update({
        where: { id: slotId },
        data: { quantity: slot.quantity - 1 },
      });
    }

    return {
      success: true,
      effect: item.stats as object ?? {},
      message: `${item.name} 사용 완료`,
    };
  }

  // ── 인벤토리 조회 ──────────────────────────────────────────

  /** 유저 전체 인벤토리 조회 (아이템 마스터 데이터 포함) */
  async getInventory(userId: string) {
    const slots = await prisma.inventorySlot.findMany({
      where: { userId },
      orderBy: { obtainedAt: 'desc' },
    });

    // 아이템 ID 모아서 한 번에 조회
    const itemIds = [...new Set(slots.map(s => s.itemId))];
    const items = await prisma.item.findMany({
      where: { id: { in: itemIds } },
    });
    const itemMap = new Map(items.map(i => [i.id, i]));

    return slots.map(slot => ({
      ...slot,
      item: itemMap.get(slot.itemId) ?? null,
    }));
  }

  // ── 랜덤 옵션 생성 ────────────────────────────────────────

  /** 등급에 따른 랜덤 옵션 생성 */
  generateRandomOptions(grade: string): RandomOption[] {
    const range = GRADE_OPTION_RANGE[grade] ?? [0, 0];
    const count = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));

    if (count === 0) return [];

    // 중복 없이 스탯 선택
    const shuffled = [...OPTION_STATS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    // 등급별 값 범위 스케일링
    const gradeScale: Record<string, number> = {
      common: 1, uncommon: 1.5, rare: 2, epic: 3, legendary: 5,
    };
    const scale = gradeScale[grade] ?? 1;

    return selected.map(stat => ({
      stat,
      value: Math.round((5 + Math.random() * 15) * scale),
    }));
  }

  // ── 유틸 ───────────────────────────────────────────────────

  /** 장착 가능 아이템 타입 여부 */
  private isEquippable(type: string): boolean {
    return ['weapon', 'armor', 'accessory', 'shield'].includes(type);
  }
}

// ─── 싱글톤 ─────────────────────────────────────────────────────
export const inventoryManager = new InventoryManager();
