/**
 * UI · 인벤토리 · 세이브 테스트 fixture 팩토리
 *
 * 실제 구현 전 단계에서:
 * - 시나리오 기본값
 * - fixture 생성기
 * - regression tag 집합
 * 을 안정적으로 제공한다.
 */

import type { SaveData } from '../../server/src/save/saveManager';
import {
  UI_INVENTORY_SAVE_HOTKEYS,
  type DeepPartial,
  type InventoryTestItem,
  type SaveSlotSnapshot,
  type UiInventorySaveScenario,
} from './uiInventorySaveContracts';

// ── 기본 fixture ───────────────────────────────────────────────

export function createInventoryTestItem(overrides: DeepPartial<InventoryTestItem> = {}): InventoryTestItem {
  return {
    id: 'slot-weapon-001',
    itemId: 'WP-001-ironSword',
    name: '철검',
    type: 'weapon',
    quantity: 1,
    rarity: 'common',
    stats: { attack: 5 },
    equipSlot: null,
    stackable: false,
    maxStack: 1,
    isEquipped: false,
    ...overrides,
  };
}

export function createSaveDataFixture(overrides: DeepPartial<SaveData> = {}): SaveData {
  const base: SaveData = {
    character: {
      level: 15,
      exp: 3200,
      hp: 180,
      mp: 90,
      classId: 'memory_weaver',
      stats: {
        attack: 24,
        defense: 17,
        critRate: 8,
      },
    },
    inventory: [
      {
        slotId: 'slot-weapon-001',
        itemId: 'WP-001-ironSword',
        quantity: 1,
      },
    ],
    equipment: {
      weapon: 'slot-weapon-001',
      body: null,
    },
    questProgress: [
      { questId: 'q-main-003', status: 'active', progress: [2, 5] },
    ],
    chapterProgress: [
      { chapter: 2, status: 'completed' },
      { chapter: 3, status: 'in_progress' },
    ],
    storyFlags: {
      rescuedArchivist: true,
      metStorageKeeper: true,
    },
    location: {
      zoneId: 'argentium_town',
      x: 128,
      y: 256,
    },
    currencies: {
      gold: 5800,
      etherShard: 12,
    },
    playtime: 5400,
  };

  return {
    ...base,
    ...overrides,
    character: {
      ...base.character,
      ...overrides.character,
      stats: {
        ...base.character.stats,
        ...overrides.character?.stats,
      },
    },
    equipment: {
      ...base.equipment,
      ...overrides.equipment,
    },
    location: {
      ...base.location,
      ...overrides.location,
    },
    currencies: {
      ...base.currencies,
      ...overrides.currencies,
    },
    storyFlags: {
      ...base.storyFlags,
      ...overrides.storyFlags,
    },
    inventory: overrides.inventory ? [...overrides.inventory] : base.inventory,
    questProgress: overrides.questProgress ? [...overrides.questProgress] : base.questProgress,
    chapterProgress: overrides.chapterProgress ? [...overrides.chapterProgress] : base.chapterProgress,
  };
}

export function createSaveSlotSnapshots(): SaveSlotSnapshot[] {
  return [
    { slot: 0, label: '자동 저장', occupied: true, isAuto: true },
    { slot: 1, label: '챕터3 진입 전', occupied: true, isAuto: false },
    { slot: 2, label: '빈 슬롯', occupied: false, isAuto: false },
    { slot: 3, label: '빈 슬롯', occupied: false, isAuto: false },
  ];
}

export function createUiInventorySaveScenario(
  overrides: DeepPartial<UiInventorySaveScenario> = {},
): UiInventorySaveScenario {
  return {
    id: 'ui-inventory-save-safe-zone-roundtrip',
    title: '안전지대 수동 저장 후 인벤토리 상태 보존',
    surface: 'integration',
    tags: ['ui', 'inventory', 'save', 'regression', 'cbt'],
    userId: 'test-user-1',
    characterId: 'char-memory-weaver-01',
    zoneId: 'argentium_town',
    storageMode: 'localStorage',
    initialInventory: [
      createInventoryTestItem(),
      createInventoryTestItem({
        id: 'slot-consume-001',
        itemId: 'CS-001-smallPotion',
        name: '소형 포션',
        type: 'consumable',
        quantity: 3,
        stackable: true,
        maxStack: 20,
      }),
    ],
    saveData: createSaveDataFixture(),
    actions: [
      { type: 'toggle_inventory', hotkey: UI_INVENTORY_SAVE_HOTKEYS.inventory },
      { type: 'select_item', itemId: 'WP-001-ironSword' },
      { type: 'equip_item', itemId: 'WP-001-ironSword' },
      { type: 'manual_save', slot: 1 },
      { type: 'load_save', slot: 1 },
    ],
    expectedUi: {
      inventoryVisible: true,
      selectedItemId: 'WP-001-ironSword',
      selectedSaveSlot: 1,
      expectedToastKey: 'ui.menu.saveGame',
      expectedStorageMode: 'localStorage',
    },
    expectedSlots: createSaveSlotSnapshots(),
    ...overrides,
  };
}

export function createUiInventorySaveScenarioSet(): UiInventorySaveScenario[] {
  return [
    createUiInventorySaveScenario(),
    createUiInventorySaveScenario({
      id: 'ui-inventory-auto-save-after-quest',
      title: '퀘스트 완료 직후 자동 저장이 인벤토리 소비를 반영',
      actions: [
        { type: 'toggle_inventory', hotkey: UI_INVENTORY_SAVE_HOTKEYS.inventory },
        { type: 'select_item', itemId: 'CS-001-smallPotion' },
        { type: 'use_item', itemId: 'CS-001-smallPotion' },
        { type: 'auto_save' },
      ],
      expectedUi: {
        inventoryVisible: true,
        selectedItemId: 'CS-001-smallPotion',
        selectedSaveSlot: 0,
        expectedToastKey: 'ui.settings.autoSave',
        expectedStorageMode: 'localStorage',
      },
    }),
    createUiInventorySaveScenario({
      id: 'ui-inventory-save-safari-private-fallback',
      title: 'Safari Private 대응: 저장소 차단 시 memory fallback 유지',
      surface: 'e2e',
      storageMode: 'memory',
      actions: [
        { type: 'toggle_inventory', hotkey: UI_INVENTORY_SAVE_HOTKEYS.inventory },
        { type: 'manual_save', slot: 1 },
      ],
      expectedUi: {
        inventoryVisible: true,
        selectedItemId: null,
        selectedSaveSlot: 1,
        expectedToastKey: 'system.error.indexedDBBlocked',
        expectedStorageMode: 'memory',
      },
    }),
  ];
}
