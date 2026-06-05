import { describe, expect, test } from 'vitest';

import { AccessibilityManager } from '../../client/src/accessibility/AccessibilityManager';

/**
 * 유닛 테스트 — AccessibilityManager.keyboardOnlyMode (전키보드 UI P6 컷오버 토글).
 * 켜면 게임 캔버스 포인터(마우스·터치)를 비활성화하는 토글. 여기선 상태 머신을 검증
 * (캔버스 적용은 gameCanvas.style.pointerEvents 한 줄 — DOM 필요해 통합 검증 영역).
 */
describe('AccessibilityManager — keyboardOnlyMode 토글', () => {
  test('기본값은 false (미사용자 회귀 0 — 마우스 살아있음)', () => {
    const am = new AccessibilityManager();
    expect(am.getSettings().keyboardOnlyMode).toBe(false);
  });

  test('setKeyboardOnlyMode 가 상태를 토글하고 getSettings 에 반영', () => {
    const am = new AccessibilityManager();
    am.setKeyboardOnlyMode(true);
    expect(am.getSettings().keyboardOnlyMode).toBe(true);
    am.setKeyboardOnlyMode(false);
    expect(am.getSettings().keyboardOnlyMode).toBe(false);
  });
});
