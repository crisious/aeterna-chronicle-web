/**
 * CutsceneScene.ts — Phaser 컷씬 씬 (P6-10)
 *
 * 역할:
 *   - 배경 이미지 + 캐릭터 포트레이트 표시
 *   - 대화 자동 진행 (딜레이 기반)
 *   - 스킵/다음 버튼
 *   - 대화 완료 시 원래 씬으로 복귀
 */

import * as Phaser from 'phaser';

// ── 타입 정의 ──────────────────────────────────────────────────

interface CutsceneDialogue {
  speaker: string;
  portrait?: string;
  text: string;
  emotion?: string;
  delay?: number;
}

interface CutsceneConfig {
  id: string;
  title: string;
  background: string;
  bgm: string;
  characters: string[];
  dialogue: CutsceneDialogue[];
  returnScene: string;      // 컷씬 종료 후 돌아갈 씬 키
  returnData?: unknown;     // 복귀 씬에 전달할 데이터
}

// ── 컷씬 씬 ─────────────────────────────────────────────────────

export class CutsceneScene extends Phaser.Scene {
  private config!: CutsceneConfig;
  private currentIndex = 0;
  private dialogueBox!: Phaser.GameObjects.Rectangle;
  private speakerText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private skipButton!: Phaser.GameObjects.Text;
  private nextButton!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private autoTimer?: Phaser.Time.TimerEvent;
  private isAutoPlay = false;

  constructor() {
    super({ key: 'CutsceneScene' });
  }

  init(data: CutsceneConfig): void {
    this.config = data;
    this.currentIndex = 0;
    this.isAutoPlay = false;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // ── 배경 ──
    // 배경 이미지가 로드되어 있으면 사용, 아니면 검정 배경
    if (this.textures.exists(this.config.background)) {
      this.add.image(width / 2, height / 2, this.config.background)
        .setDisplaySize(width, height);
    } else {
      this.cameras.main.setBackgroundColor('#000000');
    }

    // ── 타이틀 (페이드인) ──
    this.titleText = this.add.text(width / 2, height * 0.15, this.config.title, {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: this.titleText,
      alpha: 1,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        // 2초 후 타이틀 페이드아웃
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: this.titleText,
            alpha: 0,
            duration: 500,
          });
        });
      },
    });

    // ── 대화 박스 (하단) ──
    const boxHeight = height * 0.3;
    const boxY = height - boxHeight;

    this.dialogueBox = this.add.rectangle(
      width / 2, boxY + boxHeight / 2,
      width - 40, boxHeight - 20,
      0x000000, 0.8,
    ).setStrokeStyle(2, 0x4488cc);

    // 화자 이름
    this.speakerText = this.add.text(40, boxY + 10, '', {
      fontSize: '20px',
      color: '#4488cc',
      fontStyle: 'bold',
    });

    // 대화 내용
    this.bodyText = this.add.text(40, boxY + 45, '', {
      fontSize: '18px',
      color: '#ffffff',
      wordWrap: { width: width - 100 },
      lineSpacing: 6,
    });

    // ── 버튼 ──
    // 스킵 버튼 (우상단)
    this.skipButton = this.add.text(width - 100, 20, '[ 스킵 ]', {
      fontSize: '16px',
      color: '#888888',
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.skipCutscene())
      .on('pointerover', () => this.skipButton.setColor('#ffffff'))
      .on('pointerout', () => this.skipButton.setColor('#888888'));

    // 다음 버튼 (우하단)
    this.nextButton = this.add.text(width - 100, boxY + boxHeight - 40, '다음 ▶', {
      fontSize: '16px',
      color: '#cccccc',
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.advanceDialogue());

    // ── 키보드 입력 ──
    this.input.keyboard?.on('keydown-SPACE', () => this.advanceDialogue());
    this.input.keyboard?.on('keydown-ENTER', () => this.advanceDialogue());
    this.input.keyboard?.on('keydown-ESC', () => this.skipCutscene());

    // 클릭으로도 진행
    this.input.on('pointerdown', (_pointer: Phaser.Input.Pointer) => {
      // 버튼 영역 클릭은 제외 (버튼 자체 핸들러에서 처리)
    });

    // ── BGM 재생 ──
    if (this.sound.get(this.config.bgm)) {
      this.sound.play(this.config.bgm, { loop: true, volume: 0.4 });
    }

    // ── 첫 대화 표시 ──
    this.showDialogue(0);
  }

  /** 대화 표시 */
  private showDialogue(index: number): void {
    if (index >= this.config.dialogue.length) {
      this.endCutscene();
      return;
    }

    this.currentIndex = index;
    const line = this.config.dialogue[index];

    // 화자 + 텍스트 갱신
    this.speakerText.setText(line.speaker);
    this.bodyText.setText(line.text);

    // 포트레이트 처리 (TODO: 캐릭터 이미지 로드 시스템 연동)
    // if (line.portrait && this.textures.exists(line.portrait)) { ... }

    // 자동 진행 타이머
    if (this.autoTimer) {
      this.autoTimer.destroy();
    }
    const delay = line.delay ?? 4000;
    if (this.isAutoPlay) {
      this.autoTimer = this.time.delayedCall(delay, () => {
        this.advanceDialogue();
      });
    }

    // 진행 표시
    const progress = `${index + 1}/${this.config.dialogue.length}`;
    this.nextButton.setText(`다음 ▶  (${progress})`);
  }

  /** 다음 대화로 진행 */
  private advanceDialogue(): void {
    this.showDialogue(this.currentIndex + 1);
  }

  /** 컷씬 스킵 */
  private skipCutscene(): void {
    this.endCutscene();
  }

  /** 컷씬 종료 → 원래 씬 복귀 */
  private endCutscene(): void {
    // BGM 정지
    if (this.sound.get(this.config.bgm)) {
      this.sound.stopByKey(this.config.bgm);
    }

    // 자동 타이머 정리
    if (this.autoTimer) {
      this.autoTimer.destroy();
    }

    // 페이드 아웃 후 씬 전환
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(this.config.returnScene, this.config.returnData);
    });
  }
}
