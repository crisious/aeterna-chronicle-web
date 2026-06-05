import { afterEach, describe, expect, test } from 'vitest';

import {
  pushUiModal,
  popUiModal,
  isUiModalOpen,
  uiModalDepth,
  resetUiModalLock,
} from '../../client/src/accessibility/uiModalLock';

/**
 * 유닛 테스트 — uiModalLock. 모달 패널 열림 동안 하부 씬 이동을 정지시키는 공유 카운터.
 * 전역 상태라 매 테스트 후 reset.
 */
describe('uiModalLock', () => {
  afterEach(() => resetUiModalLock());

  test('초기엔 닫힘', () => {
    expect(isUiModalOpen()).toBe(false);
    expect(uiModalDepth()).toBe(0);
  });

  test('push 하면 열림, pop 하면 닫힘', () => {
    pushUiModal();
    expect(isUiModalOpen()).toBe(true);
    popUiModal();
    expect(isUiModalOpen()).toBe(false);
  });

  test('중첩 모달은 카운팅 — 안쪽 하나 닫혀도 바깥이 열려있으면 열림 유지', () => {
    pushUiModal();
    pushUiModal();
    expect(uiModalDepth()).toBe(2);
    popUiModal();
    expect(isUiModalOpen()).toBe(true); // 아직 1개 열림
    popUiModal();
    expect(isUiModalOpen()).toBe(false);
  });

  test('pop 이 0 미만으로 내려가지 않는다(불균형 호출 방어)', () => {
    popUiModal();
    popUiModal();
    expect(uiModalDepth()).toBe(0);
    expect(isUiModalOpen()).toBe(false);
  });

  test('reset 은 깊이를 0으로 강제(soft-lock 방지)', () => {
    pushUiModal();
    pushUiModal();
    resetUiModalLock();
    expect(uiModalDepth()).toBe(0);
    expect(isUiModalOpen()).toBe(false);
  });
});
