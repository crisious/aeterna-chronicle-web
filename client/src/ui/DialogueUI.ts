/**
 * DialogueUI — P26-08: NPC 대화 시스템 클라이언트
 *
 * 기능:
 * - 대화 UI (초상화 + 텍스트)
 * - 선택지 표시 및 처리
 * - dialogueRoutes API 연결
 * - 퀘스트 수락 등 후속 액션 연동
 */

import * as Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export interface DialogueNode {
  nodeId: string;
  speakerName: string;
  speakerPortrait?: string;
  bodyText: string;
  choices?: DialogueChoice[];
  nextNodeId?: string; // 선택지 없을 때 자동 진행
  action?: DialogueAction;
}

export interface DialogueChoice {
  choiceId: string;
  text: string;
  nextNodeId: string;
  disabled?: boolean;
  hint?: string;
  condition?: string;
}

export interface DialogueAction {
  type: 'quest_offer' | 'quest_complete' | 'shop_open' | 'teleport' | 'custom';
  questId?: string;
  shopId?: string;
  zoneId?: string;
  customData?: unknown;
}

export type DialogueCallback = (action: DialogueAction) => void;

// ── 메인 클래스 ───────────────────────────────────────────────

export class DialogueUI {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;
  private visible = false;

  // 대화 상태
  private nodes: Map<string, DialogueNode> = new Map();
  private currentNode: DialogueNode | null = null;
  private npcId = '';
  private characterId = '';
  private onAction?: DialogueCallback;

  // UI 요소
  private panelBg!: Phaser.GameObjects.Rectangle;
  private portraitBg!: Phaser.GameObjects.Rectangle;
  private portraitText!: Phaser.GameObjects.Text;
  private speakerText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private choiceContainer!: Phaser.GameObjects.Container;
  private continueHint!: Phaser.GameObjects.Text;

  // 텍스트 타이핑 효과
  private fullBodyText = '';
  private displayedChars = 0;
  private typingTimer?: Phaser.Time.TimerEvent;
  private isTyping = false;

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;
    this.container = scene.add.container(0, 0).setDepth(850).setVisible(false);
    this._buildUI();
  }

  // ── 공개 API ──────────────────────────────────────────────

  async open(characterId: string, npcId: string, onAction?: DialogueCallback): Promise<void> {
    this.characterId = characterId;
    this.npcId = npcId;
    this.onAction = onAction;
    this.visible = true;
    this.container.setVisible(true);

    // 서버에서 대화 데이터 로드
    try {
      // 서버 엔드포인트: POST /api/dialogue/start { userId, npcId }
      const resp = await this.net.post<{ nodes?: DialogueNode[]; currentNode?: DialogueNode }>('/api/dialogue/start', { userId: characterId, npcId });
      this.nodes.clear();
      if (resp.nodes) {
        resp.nodes.forEach(n => this.nodes.set(n.nodeId, n));
        const firstNode = resp.nodes[0];
        if (firstNode) this._showNode(firstNode);
      } else if (resp.currentNode) {
        this.nodes.set(resp.currentNode.nodeId, resp.currentNode);
        this._showNode(resp.currentNode);
      }
    } catch (e) {
      console.error('[DialogueUI] load failed', e);
      this.close();
    }
  }

  close(): void {
    this.visible = false;
    this.container.setVisible(false);
    this._stopTyping();
    this.nodes.clear();
    this.currentNode = null;
  }

  isOpen(): boolean { return this.visible; }

  // ── 내부: UI 빌드 ────────────────────────────────────────

  private _buildUI(): void {
    const sw = this.scene.scale.width;
    const sh = this.scene.scale.height;
    const panelH = 200;
    const panelW = sw - 40;
    const panelX = 20;
    const panelY = sh - panelH - 20;

    // 반투명 배경 (하단 대화창)
    this.panelBg = this.scene.add.rectangle(panelX + panelW / 2, panelY + panelH / 2, panelW, panelH, 0x0a0a1e, 0.92)
      .setStrokeStyle(2, 0x4a4a6a)
      .setInteractive()
      .on('pointerdown', () => this._advance());
    this.container.add(this.panelBg);

    // 초상화 영역
    const portSize = 100;
    this.portraitBg = this.scene.add.rectangle(panelX + 20 + portSize / 2, panelY + panelH / 2, portSize, portSize, 0x1a1a2e)
      .setStrokeStyle(1, 0x3a3a5e);
    this.container.add(this.portraitBg);

    this.portraitText = this.scene.add.text(panelX + 20 + portSize / 2, panelY + panelH / 2, '🧙', {
      fontSize: '40px',
    }).setOrigin(0.5);
    this.container.add(this.portraitText);

    // 화자 이름
    const textX = panelX + 140;
    this.speakerText = this.scene.add.text(textX, panelY + 14, '', {
      fontSize: '16px', color: '#ffcc00', fontStyle: 'bold',
    });
    this.container.add(this.speakerText);

    // 대사 본문
    this.bodyText = this.scene.add.text(textX, panelY + 40, '', {
      fontSize: '13px', color: '#e0e0ff', wordWrap: { width: panelW - 170 }, lineSpacing: 6,
    });
    this.container.add(this.bodyText);

    // 선택지 컨테이너
    this.choiceContainer = this.scene.add.container(textX, panelY + 110);
    this.container.add(this.choiceContainer);

    // 계속 힌트
    this.continueHint = this.scene.add.text(panelX + panelW - 80, panelY + panelH - 24, '▶ 계속', {
      fontSize: '11px', color: '#666688',
    });
    this.container.add(this.continueHint);
  }

  // ── 내부: 노드 표시 ──────────────────────────────────────

  private _showNode(node: DialogueNode): void {
    this.currentNode = node;
    this.choiceContainer.removeAll(true);

    // 화자 정보
    this.speakerText.setText(node.speakerName);
    this.portraitText.setText(node.speakerPortrait ?? '🧙');

    // 타이핑 효과
    this.fullBodyText = node.bodyText;
    this.displayedChars = 0;
    this.bodyText.setText('');
    this._startTyping();

    // 선택지 또는 계속 힌트
    if (node.choices && node.choices.length > 0) {
      this.continueHint.setVisible(false);
    } else {
      this.continueHint.setVisible(true);
    }
  }

  // ── 내부: 타이핑 효과 ─────────────────────────────────────

  private _startTyping(): void {
    this._stopTyping();
    this.isTyping = true;
    this.typingTimer = this.scene.time.addEvent({
      delay: 30,
      repeat: this.fullBodyText.length - 1,
      callback: () => {
        this.displayedChars++;
        this.bodyText.setText(this.fullBodyText.slice(0, this.displayedChars));
        if (this.displayedChars >= this.fullBodyText.length) {
          this._onTypingComplete();
        }
      },
    });
  }

  private _stopTyping(): void {
    if (this.typingTimer) {
      this.typingTimer.destroy();
      this.typingTimer = undefined;
    }
    this.isTyping = false;
  }

  private _onTypingComplete(): void {
    this.isTyping = false;
    this.bodyText.setText(this.fullBodyText);

    // 선택지 표시
    if (this.currentNode?.choices && this.currentNode.choices.length > 0) {
      this._renderChoices(this.currentNode.choices);
    }

    // 액션 실행
    if (this.currentNode?.action) {
      this.onAction?.(this.currentNode.action);
    }
  }

  // ── 내부: 선택지 렌더 ─────────────────────────────────────

  private _renderChoices(choices: DialogueChoice[]): void {
    this.choiceContainer.removeAll(true);

    choices.forEach((choice, i) => {
      const color = choice.disabled ? '#555566' : '#aaddff';
      const btn = this.scene.add.text(0, i * 28, `▸ ${choice.text}`, {
        fontSize: '13px', color,
      });

      if (!choice.disabled) {
        btn.setInteractive({ useHandCursor: true })
          .on('pointerover', () => btn.setColor('#ffffff'))
          .on('pointerout', () => btn.setColor(color))
          .on('pointerdown', () => this._selectChoice(choice));
      }

      if (choice.hint) {
        const hint = this.scene.add.text(btn.width + 10, i * 28 + 2, `(${choice.hint})`, {
          fontSize: '10px', color: '#555566',
        });
        this.choiceContainer.add(hint);
      }

      this.choiceContainer.add(btn);
    });
  }

  // ── 내부: 선택/진행 ──────────────────────────────────────

  private _selectChoice(choice: DialogueChoice): void {
    const nextNode = this.nodes.get(choice.nextNodeId);
    if (nextNode) {
      this._showNode(nextNode);
    } else {
      this.close();
    }
  }

  private _advance(): void {
    if (this.isTyping) {
      // 타이핑 스킵
      this._stopTyping();
      this._onTypingComplete();
      return;
    }

    if (!this.currentNode) { this.close(); return; }

    // 선택지가 있으면 대기
    if (this.currentNode.choices && this.currentNode.choices.length > 0) return;

    // 다음 노드
    if (this.currentNode.nextNodeId) {
      const next = this.nodes.get(this.currentNode.nextNodeId);
      if (next) {
        this._showNode(next);
        return;
      }
    }

    // 대화 종료
    this.close();
  }

  // ── 정리 ──────────────────────────────────────────────────

  destroy(): void {
    this._stopTyping();
    this.container.destroy();
  }
}
