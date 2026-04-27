/**
 * UI · 인벤토리 · 세이브 테스트 harness
 *
 * 목적:
 * - Vitest(node) 환경에서 UI/인벤토리/세이브 회귀 시나리오를 재현
 * - Fastify inject 기반으로 inventory/save 계약을 함께 검증
 * - 브라우저 저장소 차단(memory fallback) / 안전지대 저장 규칙을 테스트에 고정
 */

import Fastify, { type FastifyInstance } from 'fastify';
import type { SaveData } from '../../server/src/save/saveManager';
import {
  ROUTE_PARITY_PROBES,
  UI_INVENTORY_SAVE_HOTKEYS,
  UI_INVENTORY_SAVE_SELECTORS,
  type InventoryTestItem,
  type RouteParityProbe,
  type SaveSlotSnapshot,
  type StorageMode,
  type UiAction,
  type UiExpectation,
  type UiInventorySaveScenario,
} from './uiInventorySaveContracts';

export interface UiInventorySaveHarnessSnapshot {
  storageMode: StorageMode;
  visiblePanels: string[];
  selectedItemId: string | null;
  selectedSaveSlot: number | null;
  currentToastKey: string | null;
  inventory: InventoryTestItem[];
  saveData: SaveData;
  equippedItemIds: string[];
  saveSlots: SaveSlotSnapshot[];
  routeParity: ReadonlyArray<RouteParityProbe>;
  selectorState: Record<string, boolean>;
}

export interface UiInventorySaveHarness {
  readonly name: string;
  readonly app?: FastifyInstance;

  bootstrapScenario(scenario: UiInventorySaveScenario): Promise<void>;
  executeAction(action: UiAction): Promise<void>;
  snapshot(): Promise<UiInventorySaveHarnessSnapshot>;
  assertUi(expectation: UiExpectation): Promise<void>;
  dispose(): Promise<void>;
}

export interface UiInventorySaveHarnessOptions {
  name?: string;
  exposeServerContracts?: boolean;
}

interface PersistedSlotState {
  data: SaveData;
  inventory: InventoryTestItem[];
  label: string;
  selectedItemId: string | null;
  inventoryVisible: boolean;
  toastKey: string | null;
  isAuto: boolean;
}

interface HarnessState {
  scenario: UiInventorySaveScenario | null;
  storageMode: StorageMode;
  inventory: InventoryTestItem[];
  saveData: SaveData;
  visiblePanels: Set<string>;
  selectedItemId: string | null;
  selectedSaveSlot: number | null;
  currentToastKey: string | null;
  saveSlots: SaveSlotSnapshot[];
  selectorState: Record<string, boolean>;
  persistedSlots: Map<number, PersistedSlotState>;
}

const SAFE_ZONES = new Set([
  'argentium_town',
  'silvanheim_village',
  'solaris_city',
  'britallia_outpost',
  'frostlands_camp',
  'erebos_sanctuary',
  'tutorial_area',
]);

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createEmptySaveSlots(): SaveSlotSnapshot[] {
  return [
    { slot: 0, label: '자동 저장', occupied: false, isAuto: true },
    { slot: 1, label: '빈 슬롯', occupied: false, isAuto: false },
    { slot: 2, label: '빈 슬롯', occupied: false, isAuto: false },
    { slot: 3, label: '빈 슬롯', occupied: false, isAuto: false },
  ];
}

function getEquipSlot(item: InventoryTestItem): string | null {
  if (item.equipSlot) return item.equipSlot;
  if (item.type === 'weapon') return 'weapon';
  if (item.type === 'armor') return 'body';
  if (item.type === 'accessory') return 'necklace';
  return null;
}

function syncSaveDataFromState(state: HarnessState): void {
  const nextInventory = state.inventory.map((item) => ({
    slotId: item.id,
    itemId: item.itemId,
    quantity: item.quantity,
  }));

  const nextEquipment: Record<string, string | null> = {};
  for (const item of state.inventory) {
    const equipSlot = getEquipSlot(item);
    if (item.isEquipped && equipSlot) {
      nextEquipment[equipSlot] = item.id;
    }
  }

  state.saveData = {
    ...state.saveData,
    inventory: nextInventory,
    equipment: {
      ...state.saveData.equipment,
      ...nextEquipment,
    },
  };
}

function refreshEquipmentFlags(state: HarnessState): void {
  const equippedIds = new Set(
    Object.values(state.saveData.equipment)
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  );

  for (const item of state.inventory) {
    item.isEquipped = equippedIds.has(item.id);
    item.equipSlot = item.isEquipped ? getEquipSlot(item) : null;
  }
}

function refreshSelectorState(state: HarnessState): void {
  state.selectorState = {
    [UI_INVENTORY_SAVE_SELECTORS.inventoryDialog]: state.visiblePanels.has('inventory-dialog'),
    [UI_INVENTORY_SAVE_SELECTORS.inventoryGrid]: state.visiblePanels.has('inventory-dialog'),
    [UI_INVENTORY_SAVE_SELECTORS.inventoryItemCell]: state.inventory.length > 0,
    [UI_INVENTORY_SAVE_SELECTORS.saveDialog]: state.visiblePanels.has('save-dialog'),
    [UI_INVENTORY_SAVE_SELECTORS.saveSlotButton]: state.visiblePanels.has('save-dialog'),
    [UI_INVENTORY_SAVE_SELECTORS.toast]: Boolean(state.currentToastKey),
  };
}

function buildHarness(
  defaultName: string,
  options: UiInventorySaveHarnessOptions = {},
): UiInventorySaveHarness {
  const state: HarnessState = {
    scenario: null,
    storageMode: 'localStorage',
    inventory: [],
    saveData: {
      character: {
        level: 1,
        exp: 0,
        hp: 100,
        mp: 50,
        classId: 'ether_knight',
      },
      inventory: [],
      equipment: {},
      questProgress: [],
      chapterProgress: [],
      storyFlags: {},
      location: {
        zoneId: 'tutorial_area',
        x: 0,
        y: 0,
      },
      currencies: {},
      playtime: 0,
    },
    visiblePanels: new Set<string>(),
    selectedItemId: null,
    selectedSaveSlot: null,
    currentToastKey: null,
    saveSlots: createEmptySaveSlots(),
    selectorState: {},
    persistedSlots: new Map<number, PersistedSlotState>(),
  };

  const app = Fastify({ logger: false });

  function getSelectedItem(): InventoryTestItem | null {
    if (!state.selectedItemId) return null;
    return state.inventory.find((item) => item.itemId === state.selectedItemId) ?? null;
  }

  function setToast(key: string | null): void {
    state.currentToastKey = key;
    refreshSelectorState(state);
  }

  function updateSlot(slot: number, overrides: Partial<SaveSlotSnapshot>): void {
    const target = state.saveSlots.find((entry) => entry.slot === slot);
    if (!target) return;
    Object.assign(target, overrides);
  }

  function buildSlotLabel(slot: number, isAuto: boolean): string {
    if (isAuto) {
      return state.storageMode === 'memory' ? '임시 자동 저장' : '자동 저장';
    }
    if (state.storageMode === 'memory') {
      return '임시 저장';
    }
    return `슬롯 ${slot}`;
  }

  function persistCurrentState(slot: number, isAuto: boolean): void {
    syncSaveDataFromState(state);
    state.persistedSlots.set(slot, {
      data: cloneJson(state.saveData),
      inventory: cloneJson(state.inventory),
      label: buildSlotLabel(slot, isAuto),
      selectedItemId: state.selectedItemId,
      inventoryVisible: state.visiblePanels.has('inventory-dialog'),
      toastKey: state.storageMode === 'memory'
        ? 'system.error.indexedDBBlocked'
        : (isAuto ? 'ui.settings.autoSave' : 'ui.menu.saveGame'),
      isAuto,
    });

    updateSlot(slot, {
      occupied: true,
      label: buildSlotLabel(slot, isAuto),
      isAuto,
    });
  }

  function restorePersistedState(slot: number): boolean {
    const persisted = state.persistedSlots.get(slot);
    if (!persisted) {
      setToast('system.error.loadFailure');
      return false;
    }

    state.saveData = cloneJson(persisted.data);
    state.inventory = cloneJson(persisted.inventory);
    state.selectedItemId = persisted.selectedItemId;
    state.selectedSaveSlot = slot;
    state.currentToastKey = persisted.toastKey;

    if (persisted.inventoryVisible) {
      state.visiblePanels.add('inventory-dialog');
    } else {
      state.visiblePanels.delete('inventory-dialog');
    }

    refreshEquipmentFlags(state);
    refreshSelectorState(state);
    return true;
  }

  app.get('/api/inventory', async (request, reply) => {
    if (!request.headers.authorization) {
      return reply.status(401).send({ error: '인증이 필요합니다.' });
    }

    return {
      success: true,
      data: {
        userId: state.scenario?.userId ?? 'unknown-user',
        slotCount: state.inventory.length,
        items: cloneJson(state.inventory),
      },
    };
  });

  app.post('/api/inventory/equip', async (request, reply) => {
    const body = request.body as { slotId?: string; equipSlot?: string };
    const item = state.inventory.find((entry) => entry.id === body.slotId);

    if (!item) {
      return reply.status(404).send({ success: false, message: 'slotId 없음' });
    }

    const equipSlot = body.equipSlot ?? getEquipSlot(item);
    if (!equipSlot) {
      return reply.status(400).send({ success: false, message: '장착 슬롯 없음' });
    }

    for (const entry of state.inventory) {
      if (entry.equipSlot === equipSlot) {
        entry.isEquipped = false;
        entry.equipSlot = null;
      }
    }

    item.isEquipped = true;
    item.equipSlot = equipSlot;
    state.saveData.equipment[equipSlot] = item.id;
    state.selectedItemId = item.itemId;
    syncSaveDataFromState(state);

    return {
      success: true,
      data: {
        slotId: item.id,
        equipSlot,
      },
    };
  });

  app.post('/api/inventory/use', async (request, reply) => {
    const body = request.body as { slotId?: string };
    const item = state.inventory.find((entry) => entry.id === body.slotId);

    if (!item) {
      return reply.status(404).send({ success: false, message: 'slotId 없음' });
    }
    if (item.quantity <= 0) {
      return reply.status(400).send({ success: false, message: '아이템 수량 부족' });
    }

    item.quantity -= 1;
    if (item.quantity === 0) {
      state.inventory = state.inventory.filter((entry) => entry.id !== item.id);
      if (state.selectedItemId === item.itemId) {
        state.selectedItemId = null;
      }
    }

    syncSaveDataFromState(state);
    return {
      success: true,
      data: {
        slotId: body.slotId,
        remaining: item.quantity,
      },
    };
  });

  app.post('/api/save/:slot', async (request, reply) => {
    const slot = Number((request.params as { slot: string }).slot);
    const body = request.body as { userId?: string; data?: SaveData };

    if (!body.userId || !body.data) {
      return reply.status(400).send({ error: '필수 파라미터 누락' });
    }
    if (slot < 1 || slot > 3) {
      return reply.status(400).send({ error: '수동 세이브 슬롯은 1~3만 사용 가능' });
    }
    if (!SAFE_ZONES.has(body.data.location.zoneId)) {
      return reply.status(400).send({ error: '마을/안전지대에서만 저장 가능합니다.' });
    }

    persistCurrentState(slot, false);
    return { slot, status: 'saved' };
  });

  app.post('/api/save/load/:slot', async (request, reply) => {
    const slot = Number((request.params as { slot: string }).slot);
    if (!state.persistedSlots.has(slot)) {
      return reply.status(404).send({ error: '해당 슬롯에 저장 데이터 없음' });
    }
    return {
      slot,
      data: cloneJson(state.persistedSlots.get(slot)!.data),
    };
  });

  app.post('/api/save/auto', async (request, reply) => {
    const body = request.body as { userId?: string; data?: SaveData };
    if (!body.userId || !body.data) {
      return reply.status(400).send({ error: '필수 파라미터 누락' });
    }

    persistCurrentState(0, true);
    return { slot: 0, status: 'auto_saved' };
  });

  app.get('/api/save/:userId', async () => ({
    saves: cloneJson(state.saveSlots),
  }));

  const harness: UiInventorySaveHarness = {
    name: options.name ?? defaultName,
    app,

    async bootstrapScenario(scenario: UiInventorySaveScenario): Promise<void> {
      state.scenario = cloneJson(scenario);
      state.storageMode = scenario.storageMode;
      state.inventory = cloneJson(scenario.initialInventory);
      state.saveData = cloneJson(scenario.saveData);
      state.saveData.location.zoneId = scenario.zoneId;
      state.visiblePanels.clear();
      state.selectedItemId = null;
      state.selectedSaveSlot = null;
      state.currentToastKey = null;
      state.saveSlots = createEmptySaveSlots();
      state.persistedSlots.clear();

      refreshEquipmentFlags(state);
      syncSaveDataFromState(state);
      refreshSelectorState(state);

      await app.ready();
    },

    async executeAction(action: UiAction): Promise<void> {
      if (!state.scenario) {
        throw new Error('bootstrapScenario 먼저 호출해야 합니다.');
      }

      switch (action.type) {
        case 'toggle_inventory': {
          if (action.hotkey && action.hotkey !== UI_INVENTORY_SAVE_HOTKEYS.inventory) {
            return;
          }
          if (state.visiblePanels.has('inventory-dialog')) {
            state.visiblePanels.delete('inventory-dialog');
          } else {
            state.visiblePanels.add('inventory-dialog');
          }
          refreshSelectorState(state);
          return;
        }

        case 'select_item': {
          const item = state.inventory.find((entry) => entry.itemId === action.itemId);
          if (!item) {
            throw new Error(`아이템을 찾을 수 없습니다: ${action.itemId}`);
          }
          state.selectedItemId = item.itemId;
          refreshSelectorState(state);
          return;
        }

        case 'equip_item': {
          const item = state.inventory.find((entry) => entry.itemId === (action.itemId ?? getSelectedItem()?.itemId));
          if (!item) {
            throw new Error(`장착 대상 아이템이 없습니다: ${action.itemId ?? 'selected'}`);
          }

          const response = await app.inject({
            method: 'POST',
            url: '/api/inventory/equip',
            payload: {
              slotId: item.id,
              equipSlot: getEquipSlot(item),
            },
          });

          if (response.statusCode !== 200) {
            throw new Error(`equip 실패: ${response.body}`);
          }

          setToast(null);
          return;
        }

        case 'use_item': {
          const item = state.inventory.find((entry) => entry.itemId === (action.itemId ?? getSelectedItem()?.itemId));
          if (!item) {
            throw new Error(`사용 대상 아이템이 없습니다: ${action.itemId ?? 'selected'}`);
          }

          const response = await app.inject({
            method: 'POST',
            url: '/api/inventory/use',
            payload: { slotId: item.id },
          });

          if (response.statusCode !== 200) {
            throw new Error(`use 실패: ${response.body}`);
          }

          setToast(null);
          return;
        }

        case 'manual_save': {
          if (typeof action.slot !== 'number') {
            throw new Error('manual_save 에 slot 이 필요합니다.');
          }

          state.visiblePanels.add('save-dialog');
          state.selectedSaveSlot = action.slot;
          syncSaveDataFromState(state);

          const response = await app.inject({
            method: 'POST',
            url: `/api/save/${action.slot}`,
            payload: {
              userId: state.scenario.userId,
              data: cloneJson(state.saveData),
            },
          });

          setToast(response.statusCode === 200
            ? (state.storageMode === 'memory' ? 'system.error.indexedDBBlocked' : 'ui.menu.saveGame')
            : 'system.error.saveFailure');
          refreshSelectorState(state);
          return;
        }

        case 'auto_save': {
          if (action.hotkey && action.hotkey !== UI_INVENTORY_SAVE_HOTKEYS.quickSave) {
            return;
          }

          state.selectedSaveSlot = 0;
          syncSaveDataFromState(state);

          const response = await app.inject({
            method: 'POST',
            url: '/api/save/auto',
            payload: {
              userId: state.scenario.userId,
              data: cloneJson(state.saveData),
            },
          });

          if (response.statusCode !== 200) {
            throw new Error(`auto save 실패: ${response.body}`);
          }

          setToast(state.storageMode === 'memory' ? 'system.error.indexedDBBlocked' : 'ui.settings.autoSave');
          return;
        }

        case 'load_save': {
          if (typeof action.slot !== 'number') {
            throw new Error('load_save 에 slot 이 필요합니다.');
          }

          const response = await app.inject({
            method: 'POST',
            url: `/api/save/load/${action.slot}`,
            payload: { userId: state.scenario.userId },
          });

          if (response.statusCode !== 200) {
            setToast('system.error.loadFailure');
            return;
          }

          restorePersistedState(action.slot);
          return;
        }

        case 'delete_save': {
          if (typeof action.slot !== 'number') {
            throw new Error('delete_save 에 slot 이 필요합니다.');
          }
          state.persistedSlots.delete(action.slot);
          updateSlot(action.slot, { occupied: false, label: '빈 슬롯' });
          state.selectedSaveSlot = null;
          setToast(null);
          return;
        }

        case 'filter_inventory':
        case 'sort_inventory':
          return;
      }
    },

    async snapshot(): Promise<UiInventorySaveHarnessSnapshot> {
      refreshSelectorState(state);
      return {
        storageMode: state.storageMode,
        visiblePanels: Array.from(state.visiblePanels),
        selectedItemId: state.selectedItemId,
        selectedSaveSlot: state.selectedSaveSlot,
        currentToastKey: state.currentToastKey,
        inventory: cloneJson(state.inventory),
        saveData: cloneJson(state.saveData),
        equippedItemIds: state.inventory
          .filter((item) => item.isEquipped)
          .map((item) => item.id),
        saveSlots: cloneJson(state.saveSlots),
        routeParity: options.exposeServerContracts ? ROUTE_PARITY_PROBES : [],
        selectorState: cloneJson(state.selectorState),
      };
    },

    async assertUi(expectation: UiExpectation): Promise<void> {
      const inventoryVisible = state.visiblePanels.has('inventory-dialog');

      if (inventoryVisible !== expectation.inventoryVisible) {
        throw new Error(`inventoryVisible mismatch: expected=${expectation.inventoryVisible} actual=${inventoryVisible}`);
      }
      if ((expectation.selectedItemId ?? null) !== state.selectedItemId) {
        throw new Error(`selectedItemId mismatch: expected=${expectation.selectedItemId ?? null} actual=${state.selectedItemId}`);
      }
      if ((expectation.selectedSaveSlot ?? null) !== state.selectedSaveSlot) {
        throw new Error(`selectedSaveSlot mismatch: expected=${expectation.selectedSaveSlot ?? null} actual=${state.selectedSaveSlot}`);
      }
      if (expectation.expectedToastKey && expectation.expectedToastKey !== state.currentToastKey) {
        throw new Error(`toastKey mismatch: expected=${expectation.expectedToastKey} actual=${state.currentToastKey}`);
      }
      if (expectation.expectedStorageMode !== state.storageMode) {
        throw new Error(`storageMode mismatch: expected=${expectation.expectedStorageMode} actual=${state.storageMode}`);
      }
    },

    async dispose(): Promise<void> {
      state.visiblePanels.clear();
      state.persistedSlots.clear();
      await app.close();
    },
  };

  return harness;
}

export function createUiInventorySaveIntegrationHarness(
  options: UiInventorySaveHarnessOptions = {},
): UiInventorySaveHarness {
  return buildHarness('ui-inventory-save-integration-harness', options);
}

export function createUiInventorySaveE2EHarness(
  options: UiInventorySaveHarnessOptions = {},
): UiInventorySaveHarness {
  return buildHarness('ui-inventory-save-e2e-harness', options);
}
