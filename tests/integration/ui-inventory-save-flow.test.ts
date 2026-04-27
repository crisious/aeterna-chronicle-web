/**
 * UI · 인벤토리 · 세이브 통합 테스트 골격
 *
 * 현재 단계:
 * - fixture / scenario / contract SSOT 검증
 * - 실제 harness 연결 전 todo 목록 확보
 */

import { loadJsonFixture } from '../helpers/loadFixture';
import {
  ROUTE_PARITY_PROBES,
  UI_INVENTORY_SAVE_HOTKEYS,
  type UiInventorySaveScenarioCatalog,
} from '../helpers/uiInventorySaveContracts';
import { createUiInventorySaveScenarioSet } from '../helpers/uiInventorySaveFixtures';
import { createUiInventorySaveIntegrationHarness } from '../helpers/uiInventorySaveHarness';

describe('UI + Inventory + Save 통합 자원', () => {
  test('fixture catalog 가 정상 로드되고 scenario id 가 중복되지 않는다', () => {
    const catalog = loadJsonFixture<UiInventorySaveScenarioCatalog>('ui-inventory-save.scenarios.json');
    const ids = catalog.scenarios.map((scenario) => scenario.id);

    expect(catalog._meta.version).toBe('1.0.0');
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('scenario factory 는 inventory 열기와 quick save 입력 계약을 유지한다', () => {
    const scenarios = createUiInventorySaveScenarioSet();
    const actionHotkeys = scenarios
      .flatMap((scenario) => scenario.actions)
      .map((action) => action.hotkey)
      .filter((hotkey): hotkey is string => Boolean(hotkey));

    expect(actionHotkeys).toContain(UI_INVENTORY_SAVE_HOTKEYS.inventory);
    expect(UI_INVENTORY_SAVE_HOTKEYS.quickSave).toBe('F5');
  });

  test('inventory route parity probe 는 client/server 경로 불일치를 기록한다', () => {
    const inventoryProbe = ROUTE_PARITY_PROBES.find((probe) => probe.domain === 'inventory');

    expect(inventoryProbe?.currentClient?.path).toBe('/api/inventory/:characterId');
    expect(inventoryProbe?.currentServer.path).toBe('/api/inventory');
    expect(inventoryProbe?.plannedTestContract.path).toBe('/api/inventory');
  });
});

describe('UI + Inventory + Save 통합 시나리오 TODO', () => {
  test('HUD 단축키(KeyI) → InventoryUI open → 아이템 선택 → 장착 반영', async () => {
    const scenario = createUiInventorySaveScenarioSet()[0];
    const harness = createUiInventorySaveIntegrationHarness({ exposeServerContracts: true });

    await harness.bootstrapScenario(scenario);
    await harness.executeAction({ type: 'toggle_inventory', hotkey: UI_INVENTORY_SAVE_HOTKEYS.inventory });
    await harness.executeAction({ type: 'select_item', itemId: 'WP-001-ironSword' });
    await harness.executeAction({ type: 'equip_item', itemId: 'WP-001-ironSword' });

    const snapshot = await harness.snapshot();

    expect(snapshot.visiblePanels).toContain('inventory-dialog');
    expect(snapshot.selectedItemId).toBe('WP-001-ironSword');
    expect(snapshot.equippedItemIds).toContain('slot-weapon-001');

    await harness.dispose();
  });

  test('소모 아이템 사용 → 인벤토리 수량 감소 → autoSave payload 에 동일 스냅샷 반영', async () => {
    const scenario = createUiInventorySaveScenarioSet()[1];
    const harness = createUiInventorySaveIntegrationHarness();

    await harness.bootstrapScenario(scenario);
    await harness.executeAction({ type: 'toggle_inventory', hotkey: UI_INVENTORY_SAVE_HOTKEYS.inventory });
    await harness.executeAction({ type: 'select_item', itemId: 'CS-001-smallPotion' });
    await harness.executeAction({ type: 'use_item', itemId: 'CS-001-smallPotion' });
    await harness.executeAction({ type: 'auto_save', hotkey: UI_INVENTORY_SAVE_HOTKEYS.quickSave });
    await harness.executeAction({ type: 'load_save', slot: 0 });

    const snapshot = await harness.snapshot();
    const potion = snapshot.inventory.find((item) => item.itemId === 'CS-001-smallPotion');

    expect(potion?.quantity).toBe(2);
    expect(snapshot.selectedSaveSlot).toBe(0);
    expect(snapshot.currentToastKey).toBe('ui.settings.autoSave');

    await harness.dispose();
  });

  test('수동 저장(slot=1) → loadSave round-trip → 장착 슬롯/위치/퀘스트 진행도 복원', async () => {
    const scenario = createUiInventorySaveScenarioSet()[0];
    const harness = createUiInventorySaveIntegrationHarness();

    await harness.bootstrapScenario(scenario);
    await harness.executeAction({ type: 'toggle_inventory', hotkey: UI_INVENTORY_SAVE_HOTKEYS.inventory });
    await harness.executeAction({ type: 'select_item', itemId: 'WP-001-ironSword' });
    await harness.executeAction({ type: 'equip_item', itemId: 'WP-001-ironSword' });
    await harness.executeAction({ type: 'manual_save', slot: 1 });
    await harness.executeAction({ type: 'select_item', itemId: 'CS-001-smallPotion' });
    await harness.executeAction({ type: 'use_item', itemId: 'CS-001-smallPotion' });
    await harness.executeAction({ type: 'load_save', slot: 1 });

    const snapshot = await harness.snapshot();
    const potion = snapshot.inventory.find((item) => item.itemId === 'CS-001-smallPotion');

    expect(snapshot.selectedSaveSlot).toBe(1);
    expect(snapshot.equippedItemIds).toContain('slot-weapon-001');
    expect(snapshot.saveData.location.zoneId).toBe('argentium_town');
    expect(snapshot.saveData.questProgress).toEqual([{ questId: 'q-main-003', status: 'active', progress: [2, 5] }]);
    expect(potion?.quantity).toBe(3);

    await harness.dispose();
  });

  test('안전지대 외 수동 저장 차단 → 에러 토스트/i18n 키 검증', async () => {
    const [scenario] = createUiInventorySaveScenarioSet();
    const harness = createUiInventorySaveIntegrationHarness();

    await harness.bootstrapScenario({
      ...scenario,
      zoneId: 'oblivion_frontline',
      saveData: {
        ...scenario.saveData,
        location: {
          ...scenario.saveData.location,
          zoneId: 'oblivion_frontline',
        },
      },
    });
    await harness.executeAction({ type: 'manual_save', slot: 1 });

    const snapshot = await harness.snapshot();
    const slot1 = snapshot.saveSlots.find((slot) => slot.slot === 1);

    expect(slot1?.occupied).toBe(false);
    expect(snapshot.currentToastKey).toBe('system.error.saveFailure');

    await harness.dispose();
  });

  test('inventory route parity probe 는 실제 서버 계약과 현재 client 경로 차이를 드러낸다', async () => {
    const [scenario] = createUiInventorySaveScenarioSet();
    const harness = createUiInventorySaveIntegrationHarness({ exposeServerContracts: true });

    await harness.bootstrapScenario(scenario);

    const wrongPath = await harness.app!.inject({
      method: 'GET',
      url: `/api/inventory/${scenario.characterId}`,
      headers: { authorization: `Bearer ${scenario.userId}` },
    });
    const correctPath = await harness.app!.inject({
      method: 'GET',
      url: '/api/inventory',
      headers: { authorization: `Bearer ${scenario.userId}` },
    });

    expect(wrongPath.statusCode).toBe(404);
    expect(correctPath.statusCode).toBe(200);
    expect(ROUTE_PARITY_PROBES.find((probe) => probe.domain === 'inventory')?.currentServer.path).toBe('/api/inventory');

    await harness.dispose();
  });
});
