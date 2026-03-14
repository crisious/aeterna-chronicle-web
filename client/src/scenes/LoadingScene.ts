/**
 * LoadingScene.ts — 에셋 로딩 화면 (P25-12)
 *
 * - 에셋 로딩 진행률 바
 * - 랜덤 게임 팁 표시
 * - 로딩 완료 후 다음 씬으로 전환
 */

import * as Phaser from 'phaser';
import { AssetManager } from '../assets/AssetManager';

interface LoadingSceneData {
  /** 로딩 완료 후 전환할 씬 키 */
  nextScene: string;
  /** 다음 씬에 전달할 데이터 */
  nextSceneData?: unknown;
  /** 존 ID (존별 에셋 선택 로딩) */
  zoneId?: string;
}

export class LoadingScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Rectangle;
  private progressBarBg!: Phaser.GameObjects.Rectangle;
  private progressText!: Phaser.GameObjects.Text;
  private tipText!: Phaser.GameObjects.Text;
  private assetManager!: AssetManager;
  private sceneData!: LoadingSceneData;

  constructor() {
    super({ key: 'LoadingScene' });
  }

  init(data: LoadingSceneData): void {
    this.sceneData = data ?? { nextScene: 'MainMenuScene' };
  }

  preload(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0a0a1e');

    // 타이틀
    this.add.text(width / 2, height * 0.3, 'AETHERNA CHRONICLE', {
      fontSize: '28px', fontFamily: 'monospace', color: '#c8a2ff',
      stroke: '#4a0080', strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.38, '에테르나 크로니클', {
      fontSize: '14px', fontFamily: 'monospace', color: '#8888cc',
    }).setOrigin(0.5);

    // 진행률 바
    const barWidth = 400;
    const barHeight = 20;
    const barX = (width - barWidth) / 2;
    const barY = height * 0.55;

    this.progressBarBg = this.add.rectangle(
      barX + barWidth / 2, barY, barWidth, barHeight, 0x222244,
    ).setStrokeStyle(1, 0x444488);

    this.progressBar = this.add.rectangle(
      barX + 2, barY, 0, barHeight - 4, 0x6644aa,
    ).setOrigin(0, 0.5);

    // 퍼센트 텍스트
    this.progressText = this.add.text(width / 2, barY + 24, '0%', {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaaacc',
    }).setOrigin(0.5);

    // 팁 텍스트
    this.tipText = this.add.text(width / 2, height * 0.75, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#888899',
      wordWrap: { width: 500 }, align: 'center',
    }).setOrigin(0.5);

    this._showRandomTip();

    // 에셋 로딩
    this.assetManager = new AssetManager(this);
    this.assetManager.setupLoadingProgress(
      (value) => this._onProgress(value),
      () => this._onComplete(),
    );

    // 에셋 preload 실행
    this.assetManager.preloadAtlases();
    this.assetManager.preloadAudio(this.sceneData.zoneId);
    this.assetManager.preloadCharacters();
    this.assetManager.createPlaceholders();

    // 팁 순환 (5초마다)
    this.time.addEvent({
      delay: 5000,
      loop: true,
      callback: () => this._showRandomTip(),
    });
  }

  private _onProgress(value: number): void {
    const barWidth = 396;
    this.progressBar.width = barWidth * value;
    this.progressText.setText(`${Math.round(value * 100)}%`);
  }

  private _onComplete(): void {
    this.progressText.setText('100%');

    // 0.5초 대기 후 전환
    this.time.delayedCall(500, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start(
          this.sceneData.nextScene,
          this.sceneData.nextSceneData as object | undefined,
        );
      });
    });
  }

  private _showRandomTip(): void {
    const tip = AssetManager.getRandomTip();
    this.tipText.setText(`💡 ${tip}`);
  }
}
