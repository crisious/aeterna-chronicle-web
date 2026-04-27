import { describe, expect, test } from 'vitest';

import {
  createA11yProbeBridgeFromAriaMaps,
  createA11yProbeSceneRegistration,
} from '../../../client/src/accessibility/A11yProbeBridge';
import {
  ARIA_CONTRACT_VERSION,
  getAriaMap,
  getAllAriaMaps,
} from '../../../client/src/accessibility/screen_reader/AriaLabelMap';

describe('A11yProbeBridge', () => {
  test('focus trap 화면은 dialog 기준 루트와 라이브 리전을 등록해야 한다', () => {
    const inventoryMap = getAriaMap('inventory');
    expect(inventoryMap).toBeDefined();

    const registration = createA11yProbeSceneRegistration(inventoryMap!);

    expect(registration.sceneId).toBe('inventory');
    expect(registration.rootSelector).toBe('[data-aria-id="inventory-dialog"]');
    expect(registration.focusTrapSelector).toBe('[data-aria-id="inventory-dialog"]');
    expect(registration.registeredSelectors).toContain('[data-aria-id="inv-close"]');
    expect(registration.liveRegions).toEqual([
      {
        selector: '[data-aria-id="inv-detail"]',
        politeness: 'polite',
        purpose: '아이템 상세 정보',
      },
    ]);
  });

  test('전체 ARIA SSOT로 브리지를 생성하면 씬 목록과 live region 기능을 노출해야 한다', async () => {
    const bridge = createA11yProbeBridgeFromAriaMaps(getAllAriaMaps(), ARIA_CONTRACT_VERSION);
    const sceneIds = bridge.listScenes();

    expect(sceneIds).toEqual(expect.arrayContaining(['battle', 'dialogue', 'settings']));
    expect(bridge.version).toBe(ARIA_CONTRACT_VERSION);
    expect(bridge.capabilities).toEqual(expect.arrayContaining(['scene-manifest', 'aria-contract', 'focus-order', 'live-region']));

    const battle = bridge.getScene('battle');
    expect(battle?.liveRegions).toEqual(expect.arrayContaining([
      {
        selector: '[data-aria-id="combat-log"]',
        politeness: 'assertive',
        purpose: '전투 기록',
      },
      {
        selector: '[data-aria-id="target-info"]',
        politeness: 'polite',
        purpose: 'getTargetLabel',
      },
    ]));

    const snapshot = await bridge.snapshot('dialogue');
    expect(snapshot.sceneId).toBe('dialogue');
    expect(snapshot.registeredSelectors).toContain('[data-aria-id="dialogue-next"]');
    expect(snapshot.liveRegions).toEqual([
      {
        selector: '[data-aria-id="dialogue-text"]',
        politeness: 'polite',
        purpose: '대사',
      },
    ]);
  });
});
