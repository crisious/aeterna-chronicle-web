/**
 * KeyboardFocusRing — Phaser 씬/패널의 이산 포커스 목록을 키보드로 순회·활성화하는 컨트롤러.
 *
 * 마우스 제거·전키보드 UI(목표) 의 재사용 기반. MainMenu 등이 씬마다 ad-hoc 으로 짜던
 * "하이라이트 인덱스 + keydown-UP/DOWN/ENTER" 패턴을 일반화한다. 이동 로직은 순수
 * focusRingNav 에 위임(테스트됨)하고, 여기선 입력 바인딩·시각 하이라이트·정리만.
 *
 * 적용 범위: 메뉴/패널/그리드 같은 **이산 포커스 목록**. 자유 이동 씬(GameScene WASD)의
 * 화살표와 충돌하므로, 그런 씬에선 *상호작용 메뉴*가 열릴 때만 링을 만든다.
 */
import * as Phaser from 'phaser';

import { computeNextFocusIndex, type FocusDirection, type FocusNavOptions } from './focusRingNav';

/** 포커스 링의 단일 항목. */
export interface FocusRingItem {
  /** 포커스 하이라이트 경계 계산용 게임오브젝트(getBounds 보유: Text/Rectangle/Sprite/Container 등). */
  target: Phaser.GameObjects.GameObject & { getBounds(): Phaser.Geom.Rectangle };
  /** Enter/Space 또는 activateCurrent() 시 호출. */
  activate: () => void;
  /** 스크린리더 announce / 디버그용 라벨. */
  label?: string;
}

export interface KeyboardFocusRingOptions extends FocusNavOptions {
  /** 내장 포커스 하이라이트 사각형을 그릴지. 기본 true. 씬이 자체 하이라이트를 쓰면 false + onFocus. */
  highlight?: boolean;
  /** 하이라이트 외곽선 색. 기본 0xffcc44. */
  highlightColor?: number;
  /** 하이라이트 depth. 기본 9999(최상단). */
  depth?: number;
  /** 포커스 변경 시 콜백(씬 자체 하이라이트·사운드 등). */
  onFocus?: (item: FocusRingItem, index: number) => void;
  /** 라벨 announce 콜백(AccessibilityManager.announce 등). */
  announce?: (label: string) => void;
  /**
   * Enter/Space 를 링이 직접 activateCurrent 로 바인딩할지. 기본 true.
   * false 면 소비자가 자체 핸들러에서 activateCurrent() 를 호출한다(예: 대화 — 타이핑 중엔
   * Enter 가 스킵, 선택지에선 선택이라 상태 분기가 필요한 경우 더블파이어 방지용).
   */
  bindActivate?: boolean;
}

type KeyHandler = (event: KeyboardEvent) => void;

export class KeyboardFocusRing {
  private items: FocusRingItem[] = [];
  private index = -1;
  private highlightRect?: Phaser.GameObjects.Rectangle;
  private readonly handlers: Array<[string, KeyHandler]> = [];
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly opts: KeyboardFocusRingOptions = {},
  ) {
    this.bindKeys();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);
  }

  /** 포커스 항목 교체. focusFirst 면 첫 항목에 포커스. */
  setItems(items: FocusRingItem[], focusFirst = true): void {
    this.items = items;
    this.index = -1;
    if (focusFirst && items.length) this.focus(0);
    else this.updateHighlight();
  }

  get currentIndex(): number {
    return this.index;
  }

  get current(): FocusRingItem | undefined {
    return this.items[this.index];
  }

  /** 특정 인덱스에 포커스. */
  focus(i: number): void {
    if (i < 0 || i >= this.items.length) return;
    this.index = i;
    this.updateHighlight();
    const item = this.items[i];
    this.opts.onFocus?.(item, i);
    if (item.label && this.opts.announce) this.opts.announce(item.label);
  }

  /** 방향 이동(순수 nav 위임). */
  move(dir: FocusDirection): void {
    if (!this.items.length) return;
    this.focus(computeNextFocusIndex(this.index, this.items.length, dir, this.opts));
  }

  /** 현재 항목 활성화. */
  activateCurrent(): void {
    this.items[this.index]?.activate();
  }

  private bindKeys(): void {
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    // TAB 이 캔버스 밖으로 포커스 빠져나가지 않게 캡처.
    kb.addCapture('TAB');
    const on = (ev: string, fn: KeyHandler): void => {
      kb.on(ev, fn);
      this.handlers.push([ev, fn]);
    };
    on('keydown-UP', () => this.move('up'));
    on('keydown-DOWN', () => this.move('down'));
    on('keydown-LEFT', () => this.move('left'));
    on('keydown-RIGHT', () => this.move('right'));
    on('keydown-TAB', (e) => {
      e.preventDefault?.();
      this.move(e.shiftKey ? 'prev' : 'next');
    });
    if (this.opts.bindActivate !== false) {
      on('keydown-ENTER', () => this.activateCurrent());
      on('keydown-SPACE', () => this.activateCurrent());
    }
  }

  private updateHighlight(): void {
    if (this.opts.highlight === false) return;
    const item = this.items[this.index];
    if (!item) {
      this.highlightRect?.setVisible(false);
      return;
    }
    const b = item.target.getBounds();
    if (!this.highlightRect) {
      this.highlightRect = this.scene.add
        .rectangle(0, 0, 10, 10, 0x000000, 0)
        .setStrokeStyle(2, this.opts.highlightColor ?? 0xffcc44)
        .setOrigin(0)
        .setDepth(this.opts.depth ?? 9999);
    }
    const pad = 4;
    this.highlightRect
      .setPosition(b.x - pad, b.y - pad)
      .setSize(b.width + pad * 2, b.height + pad * 2)
      .setVisible(true);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    // 패널 open/close 로 링을 반복 생성·파괴해도 once 리스너가 쌓이지 않게 제거.
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.scene.events.off(Phaser.Scenes.Events.DESTROY, this.destroy, this);
    const kb = this.scene.input?.keyboard;
    if (kb) {
      for (const [ev, fn] of this.handlers) kb.off(ev, fn);
    }
    this.handlers.length = 0;
    this.highlightRect?.destroy();
    this.highlightRect = undefined;
  }
}
