import { describe, expect, test } from 'vitest';

import { runStaticAccessibilityAudit } from '../../../scripts/a11y/audit';

describe('static accessibility audit', () => {
  test('정적 접근성 감사는 핵심 probe 4종을 수집하고 현재 SSOT를 통과시켜야 한다', async () => {
    const summary = await runStaticAccessibilityAudit({ writeFiles: false });

    expect(summary.failedProbes).toBe(0);
    expect(summary.contractVersion).toBeDefined();
    expect(summary.probes.map((probe) => probe.id).sort()).toEqual([
      'colorblind',
      'contrast',
      'keyboard',
      'screen-reader',
    ]);
    expect(summary.targetScenes).toEqual(expect.arrayContaining([
      'main_menu',
      'battle',
      'inventory',
      'dialogue',
      'settings',
    ]));
    expect(summary.supportedLocales).toEqual(['ko', 'en', 'ja']);
    expect(summary.colorBlindModes).toEqual(expect.arrayContaining([
      'protanopia',
      'deuteranopia',
      'tritanopia',
      'achromatopsia',
    ]));
  });
});
