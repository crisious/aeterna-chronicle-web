/**
 * BattleCommandMenu.ts — FF6 레퍼런스 커맨드 메뉴 (Phaser)
 *
 * 책임:
 * - ATB ready 시 열리는 커맨드 창 (공격/스킬/아이템/방어/열/도주).
 * - 커서 이동(↑↓) + Enter 확정, ESC 닫기.
 * - 스킬/아이템 서브메뉴 + 타겟 커서.
 * - 메뉴 상태/타겟 선택 상태를 WaitMode 컨트롤러에 콜백으로 알림.
 *
 * 계섬월 Build — stub 제거, 키보드 입력/그래픽 실구현.
 * 타겟 풀(적·아군 리스트)은 setTargets()로 외부에서 주입.
 */

import type Phaser from 'phaser';
import type { ATBCommandInput } from '../../../shared/types/atb';

export type CommandRootOption = 'attack' | 'skill' | 'item' | 'defend' | 'row' | 'flee';

export interface BattleCommandMenuOptions {
  scene: Phaser.Scene;
  anchor: { x: number; y: number };
  combatId: string;
  /** 현재 클라 tick 조회 — 서버 동기화용. */
  getClientTick: () => number;
  /** 메뉴 열림/닫힘 콜백 — WaitMode 동기화용. */
  onMenuStateChange: (open: boolean) => void;
  /** 타겟 선택 시작/종료 콜백 — WaitMode 동기화용. */
  onTargetSelectChange: (selecting: boolean) => void;
  /** 커맨드 확정 시 서버로 송신. */
  onSubmit: (cmd: ATBCommandInput) => void;
}

interface SubMenuItem {
  id: string;
  label: string;
  disabled?: boolean;
}

interface Target {
  id: string;
  label: string;
  x: number;
  y: number;
  isAlly: boolean;
}

type MenuPhase = 'closed' | 'root' | 'sub' | 'target';

const ROOT_OPTIONS: Array<{ key: CommandRootOption; label: string }> = [
  { key: 'attack', label: '공격' },
  { key: 'skill',  label: '스킬' },
  { key: 'item',   label: '아이템' },
  { key: 'defend', label: '방어' },
  { key: 'row',    label: '열 변경' },
  { key: 'flee',   label: '도주' },
];

const MENU_WIDTH = 140;
const MENU_ROW_H = 18;
const MENU_PAD = 8;

export class BattleCommandMenu {
  private readonly opts: BattleCommandMenuOptions;
  private readonly scene: Phaser.Scene;

  private phase: MenuPhase = 'closed';
  private currentActorId: string | null = null;

  private rootIndex = 0;
  private subIndex = 0;
  private targetIndex = 0;

  private subItems: SubMenuItem[] = [];
  private targets: Target[] = [];
  /** 'skill' | 'item' — 타겟 확정 후 어떤 서브메뉴 명령이었는지. */
  private pendingKind: 'attack' | 'skill' | 'item' | null = null;
  private pendingSubId: string | null = null;

  // 그래픽.
  private panel: Phaser.GameObjects.Graphics;
  private rowTexts: Phaser.GameObjects.Text[] = [];
  private cursorArrow: Phaser.GameObjects.Text;
  private targetCursor: Phaser.GameObjects.Graphics;

  // 키 핸들.
  private keyUp?: Phaser.Input.Keyboard.Key;
  private keyDown?: Phaser.Input.Keyboard.Key;
  private keyEnter?: Phaser.Input.Keyboard.Key;
  private keyEsc?: Phaser.Input.Keyboard.Key;
  private keyLeft?: Phaser.Input.Keyboard.Key;
  private keyRight?: Phaser.Input.Keyboard.Key;

  private destroyed = false;

  constructor(opts: BattleCommandMenuOptions) {
    this.opts = opts;
    this.scene = opts.scene;

    this.panel = this.scene.add.graphics();
    this.panel.setDepth(100);
    this.panel.setVisible(false);

    this.cursorArrow = this.scene.add.text(0, 0, '▶', {
      fontSize: '12px',
      color: '#ffd700',
      fontStyle: 'bold',
    });
    this.cursorArrow.setDepth(102);
    this.cursorArrow.setVisible(false);

    this.targetCursor = this.scene.add.graphics();
    this.targetCursor.setDepth(102);
    this.targetCursor.setVisible(false);

    this._bindKeys();

    this.scene.events.once('shutdown', () => this.destroy(), this);
    this.scene.events.once('destroy', () => this.destroy(), this);
  }

  // ─── 외부 API ────────────────────────────────────────────────

  /** ATB ready 도달 시 해당 액터용 메뉴 오픈. */
  open(actorId: string): void {
    if (this.destroyed || this.phase !== 'closed') return;
    this.currentActorId = actorId;
    this.rootIndex = 0;
    this.phase = 'root';
    this._renderRoot();
    this.opts.onMenuStateChange(true);
  }

  /** ESC 혹은 행동 확정 시 클로즈. */
  close(): void {
    if (this.phase === 'closed') return;
    const wasTarget = this.phase === 'target';
    this.phase = 'closed';
    this.currentActorId = null;
    this.pendingKind = null;
    this.pendingSubId = null;
    this._hideAll();
    if (wasTarget) this.opts.onTargetSelectChange(false);
    this.opts.onMenuStateChange(false);
  }

  /** 루트 커맨드 선택 (외부 강제 트리거용). */
  selectRoot(option: CommandRootOption): void {
    const idx = ROOT_OPTIONS.findIndex(o => o.key === option);
    if (idx < 0) return;
    this.rootIndex = idx;
    this._confirmRoot();
  }

  /** 스킬/아이템 서브메뉴 리스트 주입. */
  setSubMenu(items: SubMenuItem[]): void {
    this.subItems = items;
    this.subIndex = 0;
    if (this.phase === 'sub') this._renderSub();
  }

  /** 타겟 풀 주입 — BattleScene이 유닛 생성/이동 시마다 호출. */
  setTargets(targets: Target[]): void {
    this.targets = targets;
    if (this.targetIndex >= targets.length) this.targetIndex = 0;
    if (this.phase === 'target') this._renderTargetCursor();
  }

  /** 씬 종료 시 호출. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this._unbindKeys();
    this.panel.destroy();
    this.cursorArrow.destroy();
    this.targetCursor.destroy();
    for (const t of this.rowTexts) t.destroy();
    this.rowTexts = [];
  }

  // ─── 입력 처리 ───────────────────────────────────────────────

  private _bindKeys(): void {
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    this.keyUp = kb.addKey('UP');
    this.keyDown = kb.addKey('DOWN');
    this.keyLeft = kb.addKey('LEFT');
    this.keyRight = kb.addKey('RIGHT');
    this.keyEnter = kb.addKey('ENTER');
    this.keyEsc = kb.addKey('ESC');

    this.keyUp?.on('down', () => this._onUp());
    this.keyDown?.on('down', () => this._onDown());
    this.keyLeft?.on('down', () => this._onLeft());
    this.keyRight?.on('down', () => this._onRight());
    this.keyEnter?.on('down', () => this._onConfirm());
    this.keyEsc?.on('down', () => this._onCancel());
  }

  private _unbindKeys(): void {
    for (const k of [this.keyUp, this.keyDown, this.keyLeft, this.keyRight, this.keyEnter, this.keyEsc]) {
      k?.removeAllListeners();
      k?.destroy();
    }
  }

  private _onUp(): void {
    if (this.phase === 'root') {
      this.rootIndex = (this.rootIndex - 1 + ROOT_OPTIONS.length) % ROOT_OPTIONS.length;
      this._updateCursor();
    } else if (this.phase === 'sub' && this.subItems.length > 0) {
      this.subIndex = (this.subIndex - 1 + this.subItems.length) % this.subItems.length;
      this._updateCursor();
    } else if (this.phase === 'target' && this.targets.length > 0) {
      this.targetIndex = (this.targetIndex - 1 + this.targets.length) % this.targets.length;
      this._renderTargetCursor();
    }
  }

  private _onDown(): void {
    if (this.phase === 'root') {
      this.rootIndex = (this.rootIndex + 1) % ROOT_OPTIONS.length;
      this._updateCursor();
    } else if (this.phase === 'sub' && this.subItems.length > 0) {
      this.subIndex = (this.subIndex + 1) % this.subItems.length;
      this._updateCursor();
    } else if (this.phase === 'target' && this.targets.length > 0) {
      this.targetIndex = (this.targetIndex + 1) % this.targets.length;
      this._renderTargetCursor();
    }
  }

  private _onLeft(): void {
    if (this.phase === 'target' && this.targets.length > 0) {
      this.targetIndex = (this.targetIndex - 1 + this.targets.length) % this.targets.length;
      this._renderTargetCursor();
    }
  }

  private _onRight(): void {
    if (this.phase === 'target' && this.targets.length > 0) {
      this.targetIndex = (this.targetIndex + 1) % this.targets.length;
      this._renderTargetCursor();
    }
  }

  private _onConfirm(): void {
    if (this.phase === 'root') this._confirmRoot();
    else if (this.phase === 'sub') this._confirmSub();
    else if (this.phase === 'target') this._confirmTarget();
  }

  private _onCancel(): void {
    if (this.phase === 'target') {
      this.opts.onTargetSelectChange(false);
      // 스킬/아이템이면 서브로, attack이면 루트로.
      if (this.pendingKind === 'attack') {
        this.pendingKind = null;
        this.phase = 'root';
        this._renderRoot();
      } else {
        this.phase = 'sub';
        this._renderSub();
      }
    } else if (this.phase === 'sub') {
      this.phase = 'root';
      this._renderRoot();
    } else if (this.phase === 'root') {
      this.close();
    }
  }

  // ─── 단계 전이 ───────────────────────────────────────────────

  private _confirmRoot(): void {
    const opt = ROOT_OPTIONS[this.rootIndex];
    switch (opt.key) {
      case 'attack':
        this.pendingKind = 'attack';
        this._enterTarget();
        break;
      case 'skill':
        this.pendingKind = 'skill';
        this.phase = 'sub';
        this._renderSub();
        break;
      case 'item':
        this.pendingKind = 'item';
        this.phase = 'sub';
        this._renderSub();
        break;
      case 'defend':
        this._submit({ kind: 'defend' });
        break;
      case 'row':
        // 단순화 — 토글식. 외부에서 현재 row를 모르므로 front 기본.
        this._submit({ kind: 'row', row: 'front' });
        break;
      case 'flee':
        this._submit({ kind: 'flee' });
        break;
    }
  }

  private _confirmSub(): void {
    if (this.subItems.length === 0) return;
    const item = this.subItems[this.subIndex];
    if (item.disabled) return;
    this.pendingSubId = item.id;
    this._enterTarget();
  }

  private _enterTarget(): void {
    if (this.targets.length === 0) return;
    this.phase = 'target';
    this.targetIndex = 0;
    this._hidePanel();
    this._renderTargetCursor();
    this.opts.onTargetSelectChange(true);
  }

  private _confirmTarget(): void {
    if (this.targets.length === 0) return;
    const target = this.targets[this.targetIndex];
    if (this.pendingKind === 'attack') {
      this._submit({ kind: 'attack', targetId: target.id });
    } else if (this.pendingKind === 'skill' && this.pendingSubId) {
      this._submit({ kind: 'skill', skillId: this.pendingSubId, targetId: target.id });
    } else if (this.pendingKind === 'item' && this.pendingSubId) {
      this._submit({ kind: 'item', itemId: this.pendingSubId, targetId: target.id });
    }
  }

  private _submit(command: ATBCommandInput['command']): void {
    if (!this.currentActorId) {
      this.close();
      return;
    }
    const cmd: ATBCommandInput = {
      combatId: this.opts.combatId,
      actorId: this.currentActorId,
      clientTick: this.opts.getClientTick(),
      command,
    };
    this.opts.onSubmit(cmd);
    this.close();
  }

  // ─── 렌더링 ──────────────────────────────────────────────────

  private _renderRoot(): void {
    this._drawPanel(ROOT_OPTIONS.map(o => o.label));
    this._updateCursor();
  }

  private _renderSub(): void {
    this._drawPanel(this.subItems.map(i => i.disabled ? `${i.label} (불가)` : i.label));
    this._updateCursor();
  }

  private _drawPanel(labels: string[]): void {
    for (const t of this.rowTexts) t.destroy();
    this.rowTexts = [];

    const rows = Math.max(1, labels.length);
    const width = MENU_WIDTH;
    const height = MENU_PAD * 2 + rows * MENU_ROW_H;

    const x = this.opts.anchor.x;
    const y = this.opts.anchor.y;

    this.panel.clear();
    this.panel.fillStyle(0x1a1a2e, 0.92);
    this.panel.fillRoundedRect(x, y, width, height, 4);
    this.panel.lineStyle(1, 0x89cfb0, 0.9);
    this.panel.strokeRoundedRect(x, y, width, height, 4);
    this.panel.setVisible(true);

    for (let i = 0; i < labels.length; i++) {
      const text = this.scene.add.text(
        x + MENU_PAD + 14,
        y + MENU_PAD + i * MENU_ROW_H,
        labels[i],
        { fontSize: '12px', color: '#e8e8e8' },
      );
      text.setDepth(101);
      this.rowTexts.push(text);
    }

    this.cursorArrow.setVisible(true);
    this.targetCursor.setVisible(false);
  }

  private _updateCursor(): void {
    if (this.phase !== 'root' && this.phase !== 'sub') return;
    const idx = this.phase === 'root' ? this.rootIndex : this.subIndex;
    const x = this.opts.anchor.x + 2;
    const y = this.opts.anchor.y + MENU_PAD + idx * MENU_ROW_H;
    this.cursorArrow.setPosition(x, y);
    this.cursorArrow.setVisible(true);
  }

  private _renderTargetCursor(): void {
    if (this.targets.length === 0) return;
    const t = this.targets[this.targetIndex];
    this.targetCursor.clear();
    this.targetCursor.lineStyle(2, 0xffd700, 1);
    this.targetCursor.strokeTriangle(
      t.x - 8, t.y - 40,
      t.x + 8, t.y - 40,
      t.x,      t.y - 28,
    );
    this.targetCursor.setVisible(true);
  }

  private _hidePanel(): void {
    this.panel.setVisible(false);
    this.cursorArrow.setVisible(false);
    for (const t of this.rowTexts) t.setVisible(false);
  }

  private _hideAll(): void {
    this._hidePanel();
    this.targetCursor.setVisible(false);
  }
}
