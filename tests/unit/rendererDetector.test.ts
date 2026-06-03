import { describe, expect, test } from 'vitest';

import { decideRenderer, choosePhaserRenderer } from '../../client/src/utils/RendererDetector';

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

/**
 * 회귀 가드 — detectWebGL false-negative 가 Phaser.CANVAS 를 강제해 크래시.
 *
 * 증상: 기본 로드 시 "예기치 않은 오류 — Cannot read properties of null (reading 'drawImage')"
 *      (씬: unknown). 그러나 ?renderer=webgl 로 강제하면 정상.
 * 원인: detectWebGL 의 throwaway-canvas probe 가 일부 브라우저에서 WebGL 을 false-negative(0)
 *      로 보고 → main.ts 가 Phaser.CANVAS 를 강제 → Canvas 모드가 2D 캔버스를 대량 생성해
 *      Safari 2D 캔버스 메모리 한도 초과 → getContext('2d') null → CanvasTexture.draw 의
 *      this.context.drawImage 크래시.
 * 수정: 명시적 ?renderer=canvas 가 아니면 항상 Phaser.AUTO('auto') 에 위임 → 실제 게임
 *      캔버스 기준으로 WebGL 을 직접 검사(probe false-negative 회피).
 */
describe('choosePhaserRenderer — detectWebGL false-negative 회귀 가드', () => {
  test('override 없음(null) → auto (Phaser.AUTO 에 위임, Canvas 강제 안 함)', () => {
    expect(choosePhaserRenderer(null)).toBe('auto');
  });

  test('override=webgl → auto', () => {
    expect(choosePhaserRenderer('webgl')).toBe('auto');
  });

  test('명시적 override=canvas 일 때만 canvas-forced', () => {
    expect(choosePhaserRenderer('canvas')).toBe('canvas-forced');
  });
});
