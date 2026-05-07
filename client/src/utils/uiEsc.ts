/**
 * uiEsc.ts — UI 패널 ESC 닫기 헬퍼 (FINDING-A4 ext23)
 *
 * WCAG 2.1.1 Keyboard: 모든 모달/오버레이 UI 패널은 ESC 로 닫혀야 한다.
 * 기존 ext16-19, ext22 가 inline 구현했던 동일 패턴을 추출한 공통 helper.
 *
 * 사용법:
 *   private _escUnbind: (() => void) | null = null;
 *   open() {
 *     ...
 *     this._escUnbind = bindEscClose(this.scene, () => this.close());
 *   }
 *   close() {
 *     ...
 *     this._escUnbind?.();
 *     this._escUnbind = null;
 *   }
 *
 * 중복 register 방지: bindEscClose 호출 시 이전 bind 가 있으면 unbind 후 재등록.
 */

import * as Phaser from 'phaser';

/**
 * scene.input.keyboard 에 ESC 핸들러 register, unbind 함수 반환.
 *
 * @param scene Phaser scene
 * @param onEsc ESC 누름 시 실행
 * @returns unbind 함수 — close() 시 호출하여 cleanup
 */
export function bindEscClose(scene: Phaser.Scene, onEsc: () => void): () => void {
  const handler = () => onEsc();
  scene.input.keyboard?.on('keydown-ESC', handler);
  return () => {
    scene.input.keyboard?.off('keydown-ESC', handler);
  };
}
