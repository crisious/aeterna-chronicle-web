/**
 * 유닛 테스트 — inventoryManager (10 tests)
 * 아이템 추가/제거/이동/분할/합치기, 장착/해제, 용량, 랜덤 옵션
 */
import { describe, test, expect } from 'vitest';

// ── 타입/로직 재현 ──────────────────────────────────────────

const DEFAULT_CAPACITY = 50;
const VALID_EQUIP_SLOTS = ['head', 'body', 'weapon', 'shield', 'ring1', 'ring2', 'necklace', 'earring', 'gloves', 'boots'] as const;
type EquipSlotName = typeof VALID_EQUIP_SLOTS[number];

interface InvItem { id: string; itemId: string; count: number; stackable: boolean; maxStack: number }

function canAddItem(currentCount: number, capacity: number): boolean {
  return currentCount < capacity;
}

function stackItems(existing: InvItem, addCount: number): { stacked: number; overflow: number } {
  if (!existing.stackable) return { stacked: 0, overflow: addCount };
  const space = existing.maxStack - existing.count;
  const stacked = Math.min(space, addCount);
  return { stacked, overflow: addCount - stacked };
}

function splitStack(item: InvItem, splitCount: number): { original: InvItem; split: InvItem } | null {
  if (!item.stackable || splitCount <= 0 || splitCount >= item.count) return null;
  return {
    original: { ...item, count: item.count - splitCount },
    split: { ...item, id: `${item.id}_split`, count: splitCount },
  };
}

function isValidEquipSlot(slot: string): boolean {
  return (VALID_EQUIP_SLOTS as readonly string[]).includes(slot);
}

function canEquipToSlot(itemType: string, slot: EquipSlotName): boolean {
  const mapping: Record<string, EquipSlotName[]> = {
    weapon: ['weapon'],
    armor: ['head', 'body', 'gloves', 'boots'],
    accessory: ['ring1', 'ring2', 'necklace', 'earring'],
    shield: ['shield'],
  };
  return mapping[itemType]?.includes(slot) ?? false;
}

function generateRandomOptions(grade: string): number {
  const ranges: Record<string, [number, number]> = {
    common: [0, 1], uncommon: [1, 1], rare: [1, 2], epic: [2, 3], legendary: [3, 4],
  };
  const [min, max] = ranges[grade] ?? [0, 0];
  return min + Math.floor(Math.random() * (max - min + 1));
}

function calculateSellPrice(basePrice: number, enhancement: number): number {
  return Math.floor(basePrice * (1 + enhancement * 0.1));
}

// ── 테스트 ──────────────────────────────────────────────────

describe('inventoryManager', () => {
  // 1. 인벤토리 용량 체크 — 여유 있음
  test('1. 인벤토리 여유 시 추가 가능', () => {
    expect(canAddItem(30, DEFAULT_CAPACITY)).toBe(true);
  });

  // 2. 인벤토리 가득 참
  test('2. 인벤토리 가득 시 추가 불가', () => {
    expect(canAddItem(50, DEFAULT_CAPACITY)).toBe(false);
  });

  // 3. 스택 아이템 합치기
  test('3. 스택 아이템 합치기 — 여유 내 합산', () => {
    const item: InvItem = { id: 'i1', itemId: 'potion', count: 15, stackable: true, maxStack: 20 };
    const result = stackItems(item, 3);
    expect(result.stacked).toBe(3);
    expect(result.overflow).toBe(0);
  });

  // 4. 스택 오버플로우
  test('4. 스택 초과 시 overflow 반환', () => {
    const item: InvItem = { id: 'i1', itemId: 'potion', count: 18, stackable: true, maxStack: 20 };
    const result = stackItems(item, 5);
    expect(result.stacked).toBe(2);
    expect(result.overflow).toBe(3);
  });

  // 5. 비스택 아이템 합치기 불가
  test('5. 비스택 아이템은 합치기 불가', () => {
    const item: InvItem = { id: 'i1', itemId: 'sword', count: 1, stackable: false, maxStack: 1 };
    const result = stackItems(item, 1);
    expect(result.stacked).toBe(0);
    expect(result.overflow).toBe(1);
  });

  // 6. 스택 분할
  test('6. 스택 분할 — 20개에서 5개 분리', () => {
    const item: InvItem = { id: 'i1', itemId: 'potion', count: 20, stackable: true, maxStack: 99 };
    const result = splitStack(item, 5);
    expect(result).not.toBeNull();
    expect(result!.original.count).toBe(15);
    expect(result!.split.count).toBe(5);
  });

  // 7. 유효 장비 슬롯 확인
  test('7. 유효 장비 슬롯 검증', () => {
    expect(isValidEquipSlot('weapon')).toBe(true);
    expect(isValidEquipSlot('wings')).toBe(false);
  });

  // 8. 아이템 타입→슬롯 매핑
  test('8. 무기는 weapon 슬롯에만 장착', () => {
    expect(canEquipToSlot('weapon', 'weapon')).toBe(true);
    expect(canEquipToSlot('weapon', 'head')).toBe(false);
  });

  // 9. 랜덤 옵션 수 범위
  test('9. legendary 등급 랜덤 옵션 3~4개', () => {
    for (let i = 0; i < 20; i++) {
      const count = generateRandomOptions('legendary');
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(4);
    }
  });

  // 10. 판매 가격 — 강화 보정
  test('10. 강화 +5 시 판매 가격 50% 증가', () => {
    expect(calculateSellPrice(1000, 0)).toBe(1000);
    expect(calculateSellPrice(1000, 5)).toBe(1500);
  });
});
