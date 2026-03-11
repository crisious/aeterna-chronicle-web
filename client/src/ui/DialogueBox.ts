/**
 * DialogueBox.ts — NPC 대화 UI (P5-09)
 *
 * Phaser UI 컴포넌트:
 *   - NPC 초상화 + 이름 + 대화 텍스트 (타이핑 효과)
 *   - 선택지 버튼 (최대 4개)
 *   - 다음/스킵 버튼
 *   - 사운드 연동 (보이스 키)
 */

import * as Phaser from 'phaser';

// ── 타입 정의 ──────────────────────────────────────────────────

/** 대화 노드 데이터 (서버 응답 매핑) */
export interface DialogueNodeData {
  id: string;
  speaker: string;
  portrait?: string;
  text: string;
  voiceKey?: string;
  isEnd: boolean;
}

/** 선택지 데이터 */
export interface DialogueOptionData {
  id: string;
  text: string;
  disabled?: boolean;
  hint?: string;
}

/** 대화 박스 설정 */
export interface DialogueBoxConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  padding: number;
  fontSize: number;
  typingSpeed: number;       // ms per character
  bgColor: number;
  bgAlpha: number;
  textColor: string;
  nameColor: string;
  portraitSize: number;
}

/** 선택 콜백 */
export type OnChoiceCallback = (choiceId: string) => void;
/** 다음 진행 콜백 */
export type OnNextCallback = () => void;

// ── 기본 설정 ──────────────────────────────────────────────────

const DEFAULT_CONFIG: DialogueBoxConfig = {
  x: 0,
  y: 0,
  width: 800,
  height: 200,
  padding: 16,
  fontSize: 18,
  typingSpeed: 30,
  bgColor: 0x1a1a2e,
  bgAlpha: 0.92,
  textColor: '#e0e0e0',
  nameColor: '#ffd700',
  portraitSize: 100,
};

// ── 대화 박스 클래스 ────────────────────────────────────────────

export class DialogueBox {
  private scene: Phaser.Scene;
  private config: DialogueBoxConfig;
  private container: Phaser.GameObjects.Container;

  // UI 요소
  private bgRect: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private portraitImage: Phaser.GameObjects.Image | null = null;
  private choiceButtons: Phaser.GameObjects.Container[] = [];
  private nextIndicator: Phaser.GameObjects.Text;
  private skipButton: Phaser.GameObjects.Text;

  // 타이핑 효과
  private fullText: string = '';
  private typingTimer: Phaser.Time.TimerEvent | null = null;
  private charIndex: number = 0;
  private isTyping: boolean = false;

  // 콜백
  private onChoice: OnChoiceCallback | null = null;
  private onNext: OnNextCallback | null = null;

  // 상태
  private _visible: boolean = false;
  private currentVoiceKey: string | null = null;

  constructor(scene: Phaser.Scene, config?: Partial<DialogueBoxConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 화면 하단 중앙 배치
    const gameWidth = scene.scale.width;
    const gameHeight = scene.scale.height;
    this.config.x = (gameWidth - this.config.width) / 2;
    this.config.y = gameHeight - this.config.height - 20;

    this.container = scene.add.container(this.config.x, this.config.y);
    this.container.setDepth(1000);

    // 배경
    this.bgRect = scene.add.rectangle(
      this.config.width / 2,
      this.config.height / 2,
      this.config.width,
      this.config.height,
      this.config.bgColor,
      this.config.bgAlpha,
    );
    this.bgRect.setStrokeStyle(2, 0x4a4a6a);
    this.container.add(this.bgRect);

    // NPC 이름
    const textStartX = this.config.padding + this.config.portraitSize + this.config.padding;
    this.nameText = scene.add.text(textStartX, this.config.padding, '', {
      fontSize: `${this.config.fontSize + 2}px`,
      color: this.config.nameColor,
      fontStyle: 'bold',
    });
    this.container.add(this.nameText);

    // 대화 텍스트
    this.bodyText = scene.add.text(
      textStartX,
      this.config.padding + this.config.fontSize + 12,
      '',
      {
        fontSize: `${this.config.fontSize}px`,
        color: this.config.textColor,
        wordWrap: { width: this.config.width - textStartX - this.config.padding * 2 },
        lineSpacing: 4,
      },
    );
    this.container.add(this.bodyText);

    // 다음 표시기 (▼)
    this.nextIndicator = scene.add.text(
      this.config.width - this.config.padding - 20,
      this.config.height - this.config.padding - 20,
      '▼',
      { fontSize: '16px', color: '#ffd700' },
    );
    this.nextIndicator.setVisible(false);
    this.container.add(this.nextIndicator);

    // 스킵 버튼
    this.skipButton = scene.add.text(
      this.config.width - this.config.padding - 60,
      this.config.padding,
      '[스킵]',
      { fontSize: '14px', color: '#999999' },
    );
    this.skipButton.setInteractive({ useHandCursor: true });
    this.skipButton.on('pointerdown', () => this.skipTyping());
    this.container.add(this.skipButton);

    // 클릭으로 다음 진행 / 타이핑 스킵
    this.bgRect.setInteractive({ useHandCursor: true });
    this.bgRect.on('pointerdown', () => {
      if (this.isTyping) {
        this.skipTyping();
      } else if (this.choiceButtons.length === 0 && this.onNext) {
        this.onNext();
      }
    });

    // 키보드 단축키 (Enter/Space)
    scene.input.keyboard?.on('keydown-SPACE', () => {
      if (!this._visible) return;
      if (this.isTyping) {
        this.skipTyping();
      } else if (this.choiceButtons.length === 0 && this.onNext) {
        this.onNext();
      }
    });

    scene.input.keyboard?.on('keydown-ENTER', () => {
      if (!this._visible) return;
      if (this.isTyping) {
        this.skipTyping();
      } else if (this.choiceButtons.length === 0 && this.onNext) {
        this.onNext();
      }
    });

    // 숫자키로 선택지 선택 (1~4)
    for (let i = 1; i <= 4; i++) {
      scene.input.keyboard?.on(`keydown-${i}`, () => {
        if (!this._visible || this.isTyping) return;
        if (i <= this.choiceButtons.length) {
          const btn = this.choiceButtons[i - 1];
          const choiceId = btn.getData('choiceId') as string;
          if (choiceId && this.onChoice) {
            this.onChoice(choiceId);
          }
        }
      });
    }

    this.container.setVisible(false);
  }

  // ── 공개 API ──────────────────────────────────────────────

  /** 대화 노드 표시 */
  showNode(
    node: DialogueNodeData,
    options: DialogueOptionData[],
    onChoice: OnChoiceCallback,
    onNext: OnNextCallback,
  ): void {
    this._visible = true;
    this.container.setVisible(true);
    this.onChoice = onChoice;
    this.onNext = onNext;

    // 이전 선택지 정리
    this.clearChoices();

    // NPC 이름
    this.nameText.setText(node.speaker);

    // 초상화
    this.updatePortrait(node.portrait ?? null);

    // 보이스 재생
    if (node.voiceKey) {
      this.playVoice(node.voiceKey);
    }

    // 타이핑 효과로 텍스트 표시
    this.startTyping(node.text, () => {
      // 타이핑 완료 후 선택지 또는 다음 표시기 표시
      if (options.length > 0) {
        this.showChoices(options);
      } else if (!node.isEnd) {
        this.nextIndicator.setVisible(true);
        // 깜빡임 애니메이션
        this.scene.tweens.add({
          targets: this.nextIndicator,
          alpha: 0.3,
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
      }
    });
  }

  /** 대화 박스 숨기기 */
  hide(): void {
    this._visible = false;
    this.container.setVisible(false);
    this.stopTyping();
    this.clearChoices();
    this.nextIndicator.setVisible(false);
    this.stopVoice();
  }

  /** 표시 여부 */
  get visible(): boolean {
    return this._visible;
  }

  /** 리소스 정리 */
  destroy(): void {
    this.stopTyping();
    this.clearChoices();
    this.container.destroy();
  }

  // ── 내부: 타이핑 효과 ─────────────────────────────────────

  private startTyping(text: string, onComplete: () => void): void {
    this.stopTyping();
    this.fullText = text;
    this.charIndex = 0;
    this.isTyping = true;
    this.bodyText.setText('');
    this.nextIndicator.setVisible(false);

    this.typingTimer = this.scene.time.addEvent({
      delay: this.config.typingSpeed,
      callback: () => {
        this.charIndex++;
        this.bodyText.setText(this.fullText.substring(0, this.charIndex));

        if (this.charIndex >= this.fullText.length) {
          this.isTyping = false;
          this.typingTimer?.destroy();
          this.typingTimer = null;
          onComplete();
        }
      },
      repeat: this.fullText.length - 1,
    });
  }

  private skipTyping(): void {
    if (!this.isTyping) return;
    this.stopTyping();
    this.bodyText.setText(this.fullText);
    this.isTyping = false;
  }

  private stopTyping(): void {
    if (this.typingTimer) {
      this.typingTimer.destroy();
      this.typingTimer = null;
    }
  }

  // ── 내부: 선택지 ─────────────────────────────────────────

  private showChoices(options: DialogueOptionData[]): void {
    this.clearChoices();

    const startY = this.config.height + 8;
    const btnWidth = this.config.width - this.config.padding * 2;
    const btnHeight = 36;
    const gap = 6;

    for (let i = 0; i < Math.min(options.length, 4); i++) {
      const opt = options[i];
      const y = startY + i * (btnHeight + gap);

      const btnContainer = this.scene.add.container(this.config.padding, y);

      // 버튼 배경
      const bg = this.scene.add.rectangle(btnWidth / 2, btnHeight / 2, btnWidth, btnHeight, 0x2a2a4a, 0.9);
      bg.setStrokeStyle(1, opt.disabled ? 0x555555 : 0x6a6aaa);
      btnContainer.add(bg);

      // 번호 + 텍스트
      const label = `${i + 1}. ${opt.text}${opt.hint ? ` (${opt.hint})` : ''}`;
      const text = this.scene.add.text(12, btnHeight / 2, label, {
        fontSize: '15px',
        color: opt.disabled ? '#666666' : '#e0e0e0',
      });
      text.setOrigin(0, 0.5);
      btnContainer.add(text);

      if (!opt.disabled) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => bg.setFillStyle(0x3a3a6a, 0.95));
        bg.on('pointerout', () => bg.setFillStyle(0x2a2a4a, 0.9));
        bg.on('pointerdown', () => {
          if (this.onChoice) {
            this.onChoice(opt.id);
          }
        });
      }

      btnContainer.setData('choiceId', opt.id);
      this.container.add(btnContainer);
      this.choiceButtons.push(btnContainer);
    }
  }

  private clearChoices(): void {
    for (const btn of this.choiceButtons) {
      btn.destroy();
    }
    this.choiceButtons = [];
  }

  // ── 내부: 초상화 ─────────────────────────────────────────

  private updatePortrait(key: string | null): void {
    if (this.portraitImage) {
      this.portraitImage.destroy();
      this.portraitImage = null;
    }

    if (key && this.scene.textures.exists(key)) {
      this.portraitImage = this.scene.add.image(
        this.config.padding + this.config.portraitSize / 2,
        this.config.height / 2,
        key,
      );
      this.portraitImage.setDisplaySize(this.config.portraitSize, this.config.portraitSize);
      this.container.add(this.portraitImage);
    }
  }

  // ── 내부: 사운드 ─────────────────────────────────────────

  private playVoice(key: string): void {
    this.stopVoice();
    this.currentVoiceKey = key;
    if (this.scene.sound.get(key) || this.scene.cache.audio.exists(key)) {
      this.scene.sound.play(key, { volume: 0.8 });
    }
  }

  private stopVoice(): void {
    if (this.currentVoiceKey) {
      const sound = this.scene.sound.get(this.currentVoiceKey);
      if (sound?.isPlaying) {
        sound.stop();
      }
      this.currentVoiceKey = null;
    }
  }
}
