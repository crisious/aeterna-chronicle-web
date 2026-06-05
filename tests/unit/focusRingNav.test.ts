import { describe, expect, test } from 'vitest';

import { computeNextFocusIndex } from '../../client/src/accessibility/focusRingNav';

/**
 * 유닛 테스트 — focusRingNav. 키보드 포커스 링 이동 계산(선형/그리드/wrap/ragged).
 * KeyboardFocusRing(Phaser 컨트롤러)의 이동 핵심이므로 회귀를 박제한다.
 */
describe('computeNextFocusIndex — 경계', () => {
  test('count<=0 이면 -1', () => {
    expect(computeNextFocusIndex(0, 0, 'next')).toBe(-1);
    expect(computeNextFocusIndex(2, -1, 'down')).toBe(-1);
  });

  test('current 가 범위 밖(-1 포함)이면 0 에서 시작', () => {
    expect(computeNextFocusIndex(-1, 4, 'next')).toBe(1); // 0 기준 +1
    expect(computeNextFocusIndex(99, 4, 'prev')).toBe(3); // 0 기준 -1 wrap
  });
});

describe('computeNextFocusIndex — 선형(columns=1)', () => {
  test('next/down/right = +1, prev/up/left = -1', () => {
    for (const d of ['next', 'down', 'right'] as const) {
      expect(computeNextFocusIndex(1, 5, d)).toBe(2);
    }
    for (const d of ['prev', 'up', 'left'] as const) {
      expect(computeNextFocusIndex(1, 5, d)).toBe(0);
    }
  });

  test('wrap: 끝에서 반대편으로 순환', () => {
    expect(computeNextFocusIndex(4, 5, 'next')).toBe(0);
    expect(computeNextFocusIndex(0, 5, 'prev')).toBe(4);
  });

  test('wrap=false: 끝에서 clamp', () => {
    expect(computeNextFocusIndex(4, 5, 'next', { wrap: false })).toBe(4);
    expect(computeNextFocusIndex(0, 5, 'prev', { wrap: false })).toBe(0);
  });
});

describe('computeNextFocusIndex — 그리드(columns=3)', () => {
  // 인덱스 레이아웃 (count=8, columns=3):
  //  0 1 2
  //  3 4 5
  //  6 7   (ragged 마지막 행)
  const grid = { columns: 3 };

  test('left/right = ±1 선형 순회', () => {
    expect(computeNextFocusIndex(4, 8, 'right', grid)).toBe(5);
    expect(computeNextFocusIndex(4, 8, 'left', grid)).toBe(3);
  });

  test('up/down = ±columns 행 이동', () => {
    expect(computeNextFocusIndex(1, 8, 'down', grid)).toBe(4);
    expect(computeNextFocusIndex(4, 8, 'up', grid)).toBe(1);
  });

  test('down: 마지막 행 아래로 → 같은 열 맨 위로 wrap', () => {
    expect(computeNextFocusIndex(6, 8, 'down', grid)).toBe(0); // 열 0
    expect(computeNextFocusIndex(7, 8, 'down', grid)).toBe(1); // 열 1
  });

  test('up: 첫 행 위로 → 같은 열 맨 아래(ragged 대응)로 wrap', () => {
    expect(computeNextFocusIndex(0, 8, 'up', grid)).toBe(6); // 열 0 의 맨 아래 = 6
    expect(computeNextFocusIndex(1, 8, 'up', grid)).toBe(7); // 열 1 의 맨 아래 = 7
    expect(computeNextFocusIndex(2, 8, 'up', grid)).toBe(5); // 열 2 의 맨 아래 = 5(6행엔 열2 없음)
  });

  test('down wrap=false: 마지막 행에서 제자리', () => {
    expect(computeNextFocusIndex(6, 8, 'down', { columns: 3, wrap: false })).toBe(6);
  });
});
