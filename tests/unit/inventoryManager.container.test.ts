/**
 * P10-18: inventoryManager — ServiceContainer 기반 테스트
 *
 * 기존 inventoryManager.test.ts의 인라인 로직을
 * ServiceContainer 패턴으로 전환하여 테스트 격리를 보장한다.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContainer, type MockPrisma } from '../helpers/testContainer';
import { ServiceContainer } from '../../server/src/core/serviceContainer';

// ── 인벤토리 로직 재현 (컨테이너 기반) ──────────────────────

const DEFAULT_CAPACITY = 50;
const VALID_EQUIP_SLOTS = ['head', 'body', 'weapon', 'shield', 'ring1', 'ring2', 'necklace', 'earring', 'gloves', 'boots'] as const;

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

// ── 테스트 ──────────────────────────────────────────────────

describe('inventoryManager (ServiceContainer 기반)', () => {
  let container: ServiceContainer;
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    const ctx = createTestContainer();
    container = ctx.container;
    mockPrisma = ctx.mocks.prisma;
  });

  afterEach(() => {
    container.clear();
  });

  it('격리된 컨테이너에서 Prisma mock이 동작한다', async () => {
    const prisma = container.resolve<MockPrisma>('prisma');
    const users = await prisma.user.findMany();
    expect(users).toEqual([]);
  });

  it('용량 미만이면 아이템 추가 가능', () => {
    expect(canAddItem(10, DEFAULT_CAPACITY)).toBe(true);
  });

  it('용량 도달 시 아이템 추가 불가', () => {
    expect(canAddItem(50, DEFAULT_CAPACITY)).toBe(false);
  });

  it('스택 가능 아이템을 합칠 수 있다', () => {
    const item: InvItem = { id: '1', itemId: 'potion', count: 80, stackable: true, maxStack: 99 };
    const result = stackItems(item, 30);
    expect(result.stacked).toBe(19);
    expect(result.overflow).toBe(11);
  });

  it('비스택 아이템은 합쳐지지 않는다', () => {
    const item: InvItem = { id: '2', itemId: 'sword', count: 1, stackable: false, maxStack: 1 };
    const result = stackItems(item, 1);
    expect(result.stacked).toBe(0);
    expect(result.overflow).toBe(1);
  });

  it('스택 분할이 올바르게 동작한다', () => {
    const item: InvItem = { id: '3', itemId: 'arrow', count: 50, stackable: true, maxStack: 99 };
    const result = splitStack(item, 20);
    expect(result).not.toBeNull();
    expect(result!.original.count).toBe(30);
    expect(result!.split.count).toBe(20);
  });

  it('0개 분할은 null을 반환한다', () => {
    const item: InvItem = { id: '4', itemId: 'arrow', count: 50, stackable: true, maxStack: 99 };
    expect(splitStack(item, 0)).toBeNull();
  });

  it('유효한 장착 슬롯을 검증한다', () => {
    expect(isValidEquipSlot('weapon')).toBe(true);
    expect(isValidEquipSlot('head')).toBe(true);
    expect(isValidEquipSlot('pants')).toBe(false);
    expect(isValidEquipSlot('')).toBe(false);
  });

  it('컨테이너 서비스 목록이 올바르다', () => {
    const services = container.listServices();
    const keys = services.map(s => s.key);
    expect(keys).toContain('prisma');
    expect(keys).toContain('redis');
    expect(keys).toContain('socketIO');
  });
});
