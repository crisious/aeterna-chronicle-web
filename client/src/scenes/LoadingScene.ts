/**
 * LoadingScene.ts — 에셋 로딩 화면
 * 
 * 2단계 로딩:
 * Phase 1 (preload): 배경 이미지 1장만 로드
 * Phase 2 (create): UI 구성 → 나머지 에셋 큐 등록 → 수동 load.start()
 */

import * as Phaser from 'phaser';
import { AssetManager, LOADING_TIPS } from '../assets/AssetManager';
import { SoundManager } from '../sound/SoundManager';

interface LoadingSceneData {
  nextScene: string;
  nextSceneData?: unknown;
  zoneId?: string;
}

export class LoadingScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Rectangle;
  private progressText!: Phaser.GameObjects.Text;
  private loadingDotsText!: Phaser.GameObjects.Text;
  private tipText!: Phaser.GameObjects.Text;
  private sceneData!: LoadingSceneData;
  private dotCount = 0;

  constructor() {
    super({ key: 'LoadingScene' });
  }

  init(data: LoadingSceneData): void {
    this.sceneData = data ?? { nextScene: 'MainMenuScene' };
  }

  // Phase 1: 배경 이미지만 로드
  preload(): void {
    this.load.image('loading_bg', 'assets/generated/environment/backgrounds/ABY-BG-FAR-NIGHT.png');
    this.load.on('loaderror', () => { /* 무시 */ });
  }

  // Phase 2: UI 구성 → 에셋 등록 → 수동 start
  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#050510');

    // ── 배경 ──
    if (this.textures.exists('loading_bg')) {
      const bg = this.add.image(width / 2, height / 2, 'loading_bg');
      bg.setDisplaySize(width, height).setAlpha(0.4);
    }
    this.add.rectangle(width / 2, height / 2, width, height, 0x050510, 0.5);

    // ── 타이틀 ──
    this.add.text(width / 2, height * 0.28, 'AETERNA CHRONICLE', {
      fontSize: '32px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#d4a8ff',
      stroke: '#6a20c0', strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.36, '에테르나 크로니클', {
      fontSize: '14px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#7777aa',
    }).setOrigin(0.5);

    // ── 프로그레스 바 ──
    const barW = 440, barH = 14;
    const barX = (width - barW) / 2, barY = height * 0.56;

    this.add.rectangle(barX + barW / 2, barY, barW + 4, barH + 4, 0x1a1a3e)
      .setStrokeStyle(1, 0x3a3a6e);
    this.add.rectangle(barX + barW / 2, barY, barW, barH, 0x0f0f2a);

    this.progressBar = this.add.rectangle(barX + 2, barY, 0, barH - 2, 0x7733cc)
      .setOrigin(0, 0.5);

    this.progressText = this.add.text(width / 2, barY + 20, '0%', {
      fontSize: '13px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#9977cc',
    }).setOrigin(0.5);

    this.loadingDotsText = this.add.text(width / 2, barY - 22, 'LOADING', {
      fontSize: '10px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#555577', letterSpacing: 4,
    }).setOrigin(0.5);

    // ── 팁 ──
    this.add.text(width / 2, height * 0.72, '─── TIP ───', {
      fontSize: '9px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#444466',
    }).setOrigin(0.5);

    this.tipText = this.add.text(width / 2, height * 0.78, '', {
      fontSize: '12px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#8888aa',
      wordWrap: { width: 520 }, align: 'center',
    }).setOrigin(0.5);
    this._showRandomTip();

    // 팁 순환
    this.time.addEvent({ delay: 6000, loop: true, callback: () => this._showRandomTip() });
    // 점 애니메이션
    this.time.addEvent({
      delay: 400, loop: true,
      callback: () => {
        this.dotCount = (this.dotCount + 1) % 4;
        this.loadingDotsText?.setText('LOADING' + '.'.repeat(this.dotCount));
      },
    });

    // ── 에셋 큐 등록 ──
    this.load.on('progress', (v: number) => {
      const fill = 436 * v;
      this.progressBar.width = fill;
      this.progressText.setText(`${Math.round(v * 100)}%`);
    });

    this.load.on('complete', () => {
      this.progressText.setText('100%');
      this.loadingDotsText.setText('COMPLETE');
      this.loadingDotsText.setColor('#cc88ff');

      this.time.delayedCall(600, () => {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start(this.sceneData.nextScene, this.sceneData.nextSceneData as object | undefined);
        });
      });
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[LoadingScene] 로드 실패 (무시): ${file.key}`);
    });

    // 에셋 매니저
    const am = new AssetManager(this);
    am.preloadAtlases();
    am.preloadAudio(this.sceneData.zoneId);
    am.preloadCharacters();
    am.createPlaceholders();
    am.preloadAllVisuals();

    // 사운드 매니저
    const sm = new SoundManager(this);
    sm.preloadAll();

    // 🔑 수동 start — create() 안에서 등록한 에셋은 자동 시작 안 됨
    this.load.start();
  }

  private _showRandomTip(): void {
    const tip = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
    this.tipText?.setText(`💡 ${tip}`);
  }
}
