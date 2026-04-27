/**
 * UI · 인벤토리 · 세이브 테스트 계약 타입 SSOT
 *
 * 목적:
 * - E2E / 통합 테스트가 같은 타입과 시나리오 구조를 공유
 * - 현재 경로/저장소/핫키/선택자 가정을 한 곳에 고정
 * - client ↔ server 계약 불일치를 명시적으로 드러냄
 */

import type { InventoryItem } from '../../client/src/network/NetworkManager';
import type { SaveData } from '../../server/src/save/saveManager';

// ── 공통 유틸 타입 ────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'DELETE';
export type StorageMode = 'indexeddb' | 'localStorage' | 'memory';
export type TestSurface = 'integration' | 'e2e';

export type DeepPartial<T> =
  T extends Array<infer U> ? Array<DeepPartial<U>> :
  T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } :
  T;

// ── 도메인 타입 ───────────────────────────────────────────────

export interface InventoryTestItem extends InventoryItem {
  equipSlot?: string | null;
  stackable?: boolean;
  maxStack?: number;
  isEquipped?: boolean;
}

export interface SaveSlotSnapshot {
  slot: number;
  label: string;
  occupied: boolean;
  isAuto: boolean;
}

export interface RouteContract {
  method: HttpMethod;
  path: string;
  source: 'client' | 'server' | 'planned';
  note: string;
}

export interface RouteParityProbe {
  domain: 'inventory' | 'save';
  currentClient?: RouteContract;
  currentServer: RouteContract;
  plannedTestContract: RouteContract;
}

export type UiActionType =
  | 'toggle_inventory'
  | 'filter_inventory'
  | 'sort_inventory'
  | 'select_item'
  | 'equip_item'
  | 'use_item'
  | 'manual_save'
  | 'auto_save'
  | 'load_save'
  | 'delete_save';

export interface UiAction {
  type: UiActionType;
  itemId?: string;
  slot?: number;
  hotkey?: string;
  filterType?: string;
  sortKey?: string;
}

export interface UiExpectation {
  inventoryVisible: boolean;
  selectedItemId?: string | null;
  selectedSaveSlot?: number | null;
  expectedToastKey?: string;
  expectedStorageMode: StorageMode;
}

export interface UiInventorySaveScenario {
  id: string;
  title: string;
  surface: TestSurface;
  tags: string[];
  userId: string;
  characterId: string;
  zoneId: string;
  storageMode: StorageMode;
  initialInventory: InventoryTestItem[];
  saveData: SaveData;
  actions: UiAction[];
  expectedUi: UiExpectation;
  expectedSlots: SaveSlotSnapshot[];
}

export interface UiInventorySaveScenarioCatalog {
  _meta: {
    version: string;
    owner: string;
    lastUpdated: string;
  };
  scenarios: UiInventorySaveScenario[];
}

export interface UiSelectorMap {
  inventoryDialog: string;
  inventoryGrid: string;
  inventoryItemCell: string;
  saveDialog: string;
  saveSlotButton: string;
  toast: string;
}

export interface UiHotkeyMap {
  inventory: string;
  quickSave: string;
}

// ── 계약 상수 ────────────────────────────────────────────────

export const UI_INVENTORY_SAVE_SELECTORS: UiSelectorMap = {
  inventoryDialog: '[data-aria-id="inventory-dialog"]',
  inventoryGrid: '[data-testid="inventory-grid"]',
  inventoryItemCell: '[data-testid="inventory-slot"]',
  saveDialog: '[data-testid="save-dialog"]',
  saveSlotButton: '[data-testid="save-slot-button"]',
  toast: '[data-testid="system-toast"]',
};

export const UI_INVENTORY_SAVE_HOTKEYS: UiHotkeyMap = {
  inventory: 'KeyI',
  quickSave: 'F5',
};

/**
 * 현재 코드 기준 경로 불일치 기록.
 * 테스트 구현 단계에서 이 표를 기준으로 계약 검증을 추가한다.
 */
export const ROUTE_PARITY_PROBES: ReadonlyArray<RouteParityProbe> = [
  {
    domain: 'inventory',
    currentClient: {
      method: 'GET',
      path: '/api/inventory/:characterId',
      source: 'client',
      note: 'NetworkManager.getInventory 가 캐릭터 ID를 경로 파라미터로 사용',
    },
    currentServer: {
      method: 'GET',
      path: '/api/inventory',
      source: 'server',
      note: 'inventoryRoutes 는 JWT 인증 기반 내 인벤토리 조회',
    },
    plannedTestContract: {
      method: 'GET',
      path: '/api/inventory',
      source: 'planned',
      note: '통합 테스트는 인증 기반 단일 계약을 기준으로 정렬',
    },
  },
  {
    domain: 'save',
    currentServer: {
      method: 'POST',
      path: '/api/save/:slot',
      source: 'server',
      note: 'manualSave 진입점',
    },
    plannedTestContract: {
      method: 'POST',
      path: '/api/save/:slot',
      source: 'planned',
      note: '세이브 슬롯 round-trip 테스트 기준 경로',
    },
  },
];
