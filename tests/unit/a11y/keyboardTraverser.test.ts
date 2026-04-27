import { describe, expect, test } from 'vitest';

import { getAllAriaMaps, type ScreenAriaMap } from '../../../client/src/accessibility/screen_reader/AriaLabelMap';
import { runKeyboardProbe } from '../../../scripts/a11y/probes/KeyboardTraverser';

describe('KeyboardTraverser', () => {
  test('현재 화면 정의는 키보드 순회 dead-end 없이 통과해야 한다', () => {
    const result = runKeyboardProbe(getAllAriaMaps());

    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.totalFocusable).toBeGreaterThan(0);
  });

  test('비연속 focusOrder와 음수 tabindex 포커스 대상을 탐지해야 한다', () => {
    const brokenMap: ScreenAriaMap[] = [
      {
        screenId: 'broken-kbd',
        label_ko: '고장 키보드',
        label_en: 'Broken Keyboard',
        focusTrap: false,
        elements: [
          { selector: '[data-aria-id="kbd-1"]', role: 'button', label: '첫 버튼', tabindex: -1, focusGroup: 'kbd', focusOrder: 1 },
          { selector: '[data-aria-id="kbd-2"]', role: 'button', label: '둘 버튼', tabindex: 0, focusGroup: 'kbd', focusOrder: 3 },
        ],
      },
    ];

    const result = runKeyboardProbe(brokenMap);
    const codes = result.violations.map((violation) => violation.code);

    expect(result.passed).toBe(false);
    expect(codes).toEqual(expect.arrayContaining(['FOCUS_TARGET_NOT_FOCUSABLE', 'FOCUS_ORDER_GAP']));
  });
});
