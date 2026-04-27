/**
 * UI · 인벤토리 · 세이브 E2E 회귀 테스트 골격
 *
 * 목표:
 * - 브라우저/스토리지/핫키 회귀 포인트를 먼저 고정
 * - 실제 브라우저 harness 는 development 단계에서 연결
 */

import { loadJsonFixture } from '../helpers/loadFixture';
import {
  UI_INVENTORY_SAVE_SELECTORS,
  type UiInventorySaveScenarioCatalog,
} from '../helpers/uiInventorySaveContracts';
import { createUiInventorySaveScenarioSet } from '../helpers/uiInventorySaveFixtures';
import { createUiInventorySaveE2EHarness } from '../helpers/uiInventorySaveHarness';

describe('UI + Inventory + Save E2E 자원', () => {
  test('fixture 와 factory 가 integration/e2e surface 를 함께 준비한다', () => {
    const catalog = loadJsonFixture<UiInventorySaveScenarioCatalog>('ui-inventory-save.scenarios.json');
    const generated = createUiInventorySaveScenarioSet();
    const surfaces = new Set([
      ...catalog.scenarios.map((scenario) => scenario.surface),
      ...generated.map((scenario) => scenario.surface),
    ]);

    expect(surfaces.has('integration')).toBe(true);
    expect(surfaces.has('e2e')).toBe(true);
  });

  test('inventory dialog selector 와 save dialog selector 가 비어 있지 않다', () => {
    expect(UI_INVENTORY_SAVE_SELECTORS.inventoryDialog.length).toBeGreaterThan(0);
    expect(UI_INVENTORY_SAVE_SELECTORS.saveDialog.length).toBeGreaterThan(0);
  });
});

describe('UI + Inventory + Save E2E TODO', () => {
  test('inventory dialog selector 가 실제 HUD 열림 상태와 연결된다', async () => {
    const scenario = createUiInventorySaveScenarioSet()[0];
    const harness = createUiInventorySaveE2EHarness();

    await harness.bootstrapScenario(scenario);
    await harness.executeAction({ type: 'toggle_inventory', hotkey: 'KeyI' });

    const snapshot = await harness.snapshot();

    expect(snapshot.visiblePanels).toContain('inventory-dialog');
    expect(snapshot.selectorState[UI_INVENTORY_SAVE_SELECTORS.inventoryDialog]).toBe(true);
    expect(snapshot.selectorState[UI_INVENTORY_SAVE_SELECTORS.saveDialog]).toBe(false);

    await harness.dispose();
  });

  test('수동 저장 성공 후 save dialog slot 1 상태가 occupied 로 전환된다', async () => {
    const scenario = createUiInventorySaveScenarioSet()[0];
    const harness = createUiInventorySaveE2EHarness();

    await harness.bootstrapScenario(scenario);
    await harness.executeAction({ type: 'toggle_inventory', hotkey: 'KeyI' });
    await harness.executeAction({ type: 'manual_save', slot: 1 });

    const snapshot = await harness.snapshot();
    const slot1 = snapshot.saveSlots.find((slot) => slot.slot === 1);

    expect(snapshot.visiblePanels).toContain('save-dialog');
    expect(snapshot.selectorState[UI_INVENTORY_SAVE_SELECTORS.saveDialog]).toBe(true);
    expect(slot1?.occupied).toBe(true);
    expect(snapshot.currentToastKey).toBe('ui.menu.saveGame');

    await harness.dispose();
  });

  test('load 이후 selected item / equipped slot / toast 상태가 일관되게 복구된다', async () => {
    const scenario = createUiInventorySaveScenarioSet()[0];
    const harness = createUiInventorySaveE2EHarness();

    await harness.bootstrapScenario(scenario);
    await harness.executeAction({ type: 'toggle_inventory', hotkey: 'KeyI' });
    await harness.executeAction({ type: 'select_item', itemId: 'WP-001-ironSword' });
    await harness.executeAction({ type: 'equip_item', itemId: 'WP-001-ironSword' });
    await harness.executeAction({ type: 'manual_save', slot: 1 });
    await harness.executeAction({ type: 'select_item', itemId: 'CS-001-smallPotion' });
    await harness.executeAction({ type: 'use_item', itemId: 'CS-001-smallPotion' });
    await harness.executeAction({ type: 'load_save', slot: 1 });

    const snapshot = await harness.snapshot();
    const potion = snapshot.inventory.find((item) => item.itemId === 'CS-001-smallPotion');

    expect(snapshot.selectedItemId).toBe('WP-001-ironSword');
    expect(snapshot.equippedItemIds).toContain('slot-weapon-001');
    expect(snapshot.currentToastKey).toBe('ui.menu.saveGame');
    expect(potion?.quantity).toBe(3);

    await harness.dispose();
  });

  test('브라우저 storage fallback(memory) 에서도 quick save 가 예외 없이 유지된다', async () => {
    const scenario = createUiInventorySaveScenarioSet()[2];
    const harness = createUiInventorySaveE2EHarness();

    await harness.bootstrapScenario(scenario);
    await harness.executeAction({ type: 'auto_save', hotkey: 'F5' });
    await harness.executeAction({ type: 'load_save', slot: 0 });

    const snapshot = await harness.snapshot();
    const slot0 = snapshot.saveSlots.find((slot) => slot.slot === 0);

    expect(snapshot.storageMode).toBe('memory');
    expect(slot0?.occupied).toBe(true);
    expect(snapshot.currentToastKey).toBe('system.error.indexedDBBlocked');

    await harness.dispose();
  });
});
