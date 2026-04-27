import { describe, expect, test } from 'vitest';

import {
  ARIA_CONTRACT_VERSION,
  getAllAriaMaps,
  type ScreenAriaMap,
} from '../../../client/src/accessibility/screen_reader/AriaLabelMap';
import { runAriaContractProbe } from '../../../scripts/a11y/probes/AriaContractChecker';

describe('AriaContractChecker', () => {
  test('현재 ARIA SSOT는 계약 위반이 없어야 한다', () => {
    const result = runAriaContractProbe(getAllAriaMaps(), ARIA_CONTRACT_VERSION);

    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  test('누락 라벨과 중복 focusOrder를 탐지해야 한다', () => {
    const brokenMap: ScreenAriaMap[] = [
      {
        screenId: 'broken',
        label_ko: '고장 화면',
        label_en: 'Broken Screen',
        focusTrap: true,
        elements: [
          { selector: '[data-aria-id="broken-dialog"]', role: 'dialog', tabindex: -1 },
          { selector: '[data-aria-id="broken-1"]', role: 'button', label: '첫 버튼', tabindex: 0, focusGroup: 'broken', focusOrder: 1 },
          { selector: '[data-aria-id="broken-2"]', role: 'button', labelFn: 'getBrokenLabel', tabindex: 0, focusGroup: 'broken', focusOrder: 1 },
        ],
      },
    ];

    const result = runAriaContractProbe(brokenMap, 'test-contract');
    const codes = result.violations.map((violation) => violation.code);

    expect(result.passed).toBe(false);
    expect(codes).toEqual(expect.arrayContaining(['ARIA_LABEL_REQUIRED', 'FOCUS_ORDER_DUPLICATE']));
  });
});
