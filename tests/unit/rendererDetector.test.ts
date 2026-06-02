import { describe, expect, test } from 'vitest';

import { decideRenderer } from '../../client/src/utils/RendererDetector';

/**
 * 회귀 가드 — Safari/WebKit 를 WebGL 가용 여부와 무관하게 Canvas 로 강제하던 버그.
 *
 * 증상: Safari 사용자가 "예기치 않은 오류 — Cannot read properties of null (reading 'drawImage')".
 * 원인: detectAndApply 가 engine==='webkit'||isIOSSafari 이면 무조건 Canvas 2D 렌더러로 강제 →
 *      그러나 Canvas 폴백 렌더러에 null 컨텍스트 drawImage 크래시가 있어 WebGL 멀쩡한 Safari 도 크래시.
 * 수정: WebGL 이 실제 가용하면(version>0) 엔진 무관하게 WebGL 사용. version 0 또는 override 일 때만 Canvas.
 */
describe('RendererDetector.decideRenderer — Safari WebGL 강제-canvas 회귀', () => {
  test('WebGL 가용(2) 시 WebGL — Safari/WebKit 포함 Canvas 로 강제하지 않는다', () => {
    expect(decideRenderer(2, null)).toBe('webgl');
  });

  test('WebGL1 가용 시에도 WebGL', () => {
    expect(decideRenderer(1, null)).toBe('webgl');
  });

  test('WebGL 부재(0) 시 Canvas 폴백', () => {
    expect(decideRenderer(0, null)).toBe('canvas');
  });

  test('URL override 가 자동 판정보다 우선', () => {
    expect(decideRenderer(2, 'canvas')).toBe('canvas'); // 강제 canvas
    expect(decideRenderer(0, 'webgl')).toBe('webgl');   // 강제 webgl
  });
});
