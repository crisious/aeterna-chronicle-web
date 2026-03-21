/**
 * LoadingScene.ts — 에셋 로딩 화면 (P25-12 → P33-B 비주얼 강화)
 *
 * - 에레보스 배경 이미지 + 파티클 오버레이
 * - 스타일링된 진행률 바 (그라데이션 + 글로우)
 * - 랜덤 게임 팁 표시
 * - 로딩 완료 후 페이드 전환
 */

import * as Phaser from 'phaser';
import { AssetManager, LOADING_TIPS } from '../assets/AssetManager';
import { SoundManager } from '../sound/SoundManager';

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
  private progressBarGlow!: Phaser.GameObjects.Rectangle;
  private progressText!: Phaser.GameObjects.Text;
  private tipText!: Phaser.GameObjects.Text;
  private loadingDotsText!: Phaser.GameObjects.Text;
  private assetManager!: AssetManager;
  private sceneData!: LoadingSceneData;
  private dotCount = 0;

  constructor() {
    super({ key: 'LoadingScene' });
  }

  init(data: LoadingSceneData): void {
    this.sceneData = data ?? { nextScene: 'MainMenuScene' };
  }

  preload(): void {
    // ── UI를 먼저 구성 (로딩 바 표시용) ──
    this._buildUI();

    // ── 프로그레스 바 콜백 등록 ──
    this.load.on('progress', (value: number) => this._onProgress(value));
    this.load.on('complete', () => this._onComplete());
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[LoadingScene] 에셋 로드 실패 (무시): ${file.key}`);
    });

    // ── 배경 이미지 ──
    this.load.image('loading_bg', 'assets/generated/environment/backgrounds/ABY-BG-FAR-NIGHT.png');

    // ── 모든 게임 에셋 큐 등록 ──
    this.assetManager = new AssetManager(this);
    this.assetManager.preloadAtlases();
    this.assetManager.preloadAudio(this.sceneData.zoneId);
    this.assetManager.preloadCharacters();
    this.assetManager.createPlaceholders();

    // SoundManager 오디오 (soundManifest 기반)
    const soundMgr = new SoundManager(this);
    soundMgr.preloadAll();

    // 비주얼 에셋 (VFX, 아이콘, 코스메틱, 전직)
    this.assetManager.preloadAllVisuals();

    // Phaser가 preload() 종료 후 자동으로 load.start() 호출
  }

  create(): void {
    // preload 완료 후 도달 — 아무것도 안 해도 됨 (_onComplete에서 씬 전환)
  }

  private _buildUI(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#050510');

    // ── 배경 이미지 ──────────────────────────────────
    if (this.textures.exists('loading_bg')) {
      const bg = this.add.image(width / 2, height / 2, 'loading_bg');
      bg.setDisplaySize(width, height);
      bg.setAlpha(0.4);
    }

    // ── 어둡게 오버레이 ──────────────────────────────
    this.add.rectangle(width / 2, height / 2, width, height, 0x050510, 0.5);

    // ── 에테르 파티클 효과 ────────────────────────────
    this._spawnFloatingParticles(width, height);

    // ── 타이틀 ───────────────────────────────────────
    const titleGlow = this.add.text(width / 2, height * 0.28, 'AETHERNA CHRONICLE', {
      fontSize: '32px', fontFamily: 'monospace', color: '#6a3aaa',
      stroke: '#2a0050', strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0.3);

    const title = this.add.text(width / 2, height * 0.28, 'AETHERNA CHRONICLE', {
      fontSize: '32px', fontFamily: 'monospace', color: '#d4a8ff',
      stroke: '#6a20c0', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    this.add.text(width / 2, height * 0.36, '에테르나 크로니클', {
      fontSize: '14px', fontFamily: 'monospace', color: '#7777aa',
    }).setOrigin(0.5).setAlpha(0);

    // 타이틀 페이드인
    this.tweens.add({ targets: [title], alpha: 1, duration: 800, ease: 'Sine.easeIn' });

    // 타이틀 글로우 펄스
    this.tweens.add({
      targets: titleGlow, alpha: { from: 0.15, to: 0.4 },
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // ── 진행률 바 ────────────────────────────────────
    const barWidth = 440;
    const barHeight = 14;
    const barX = (width - barWidth) / 2;
    const barY = height * 0.56;

    // 바 외곽 프레임
    this.add.rectangle(barX + barWidth / 2, barY, barWidth + 4, barHeight + 4, 0x1a1a3e)
      .setStrokeStyle(1, 0x3a3a6e);

    // 바 배경
    this.progressBarBg = this.add.rectangle(
      barX + barWidth / 2, barY, barWidth, barHeight, 0x0f0f2a,
    );

    // 글로우 레이어
    this.progressBarGlow = this.add.rectangle(
      barX + 2, barY, 0, barHeight + 4, 0x8844dd, 0.15,
    ).setOrigin(0, 0.5);

    // 진행률 바
    this.progressBar = this.add.rectangle(
      barX + 2, barY, 0, barHeight - 2, 0x7733cc,
    ).setOrigin(0, 0.5);

    // 퍼센트 텍스트
    this.progressText = this.add.text(width / 2, barY + 20, '0%', {
      fontSize: '13px', fontFamily: 'monospace', color: '#9977cc',
    }).setOrigin(0.5);

    // 로딩 중... 텍스트
    this.loadingDotsText = this.add.text(width / 2, barY - 22, 'LOADING', {
      fontSize: '10px', fontFamily: 'monospace', color: '#555577',
      letterSpacing: 4,
    }).setOrigin(0.5);

    // ── 팁 영역 ──────────────────────────────────────
    this.add.text(width / 2, height * 0.72, '─── TIP ───', {
      fontSize: '9px', fontFamily: 'monospace', color: '#444466',
    }).setOrigin(0.5);

    this.tipText = this.add.text(width / 2, height * 0.78, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#8888aa',
      wordWrap: { width: 520 }, align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);

    this._showRandomTip();

    // 팁 순환 (6초마다)
    this.time.addEvent({
      delay: 6000, loop: true,
      callback: () => this._showRandomTip(),
    });

    // 로딩 점 애니메이션
    this.time.addEvent({
      delay: 400, loop: true,
      callback: () => {
        this.dotCount = (this.dotCount + 1) % 4;
        this.loadingDotsText.setText('LOADING' + '.'.repeat(this.dotCount));
      },
    });
  }

  private _onProgress(value: number): void {
    const barWidth = 436;
    const fill = barWidth * value;
    this.progressBar.width = fill;
    this.progressBarGlow.width = fill;
    this.progressText.setText(`${Math.round(value * 100)}%`);

    // 색상 변화: 보라색 → 연보라
    const r = Math.floor(0x77 + (0xcc - 0x77) * value);
    const g = Math.floor(0x33 + (0x88 - 0x33) * value);
    const b = Math.floor(0xcc + (0xff - 0xcc) * value);
    this.progressBar.setFillStyle((r << 16) | (g << 8) | b);
  }

  private _onComplete(): void {
    this.progressText.setText('100%');
    this.loadingDotsText.setText('COMPLETE');
    this.loadingDotsText.setColor('#cc88ff');

    // 0.6초 대기 후 페이드 전환
    this.time.delayedCall(600, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start(
          this.sceneData.nextScene,
          this.sceneData.nextSceneData as object | undefined,
        );
      });
    });
  }

  private _showRandomTip(): void {
    const tip = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
    this.tipText.setText(`💡 ${tip}`);
    this.tipText.setAlpha(0);
    this.tweens.add({ targets: this.tipText, alpha: 1, duration: 500 });
  }

  private _spawnFloatingParticles(width: number, height: number): void {
    // 부유하는 에테르 입자 (간단한 사각형 파티클)
    for (let i = 0; i < 20; i++) {
      const px = Phaser.Math.Between(0, width);
      const py = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(1, 3);
      const particle = this.add.rectangle(px, py, size, size, 0x8855cc, 0.15 + Math.random() * 0.15);

      this.tweens.add({
        targets: particle,
        y: py - Phaser.Math.Between(40, 120),
        alpha: 0,
        duration: Phaser.Math.Between(3000, 8000),
        ease: 'Sine.easeIn',
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        onRepeat: () => {
          particle.x = Phaser.Math.Between(0, width);
          particle.y = Phaser.Math.Between(height * 0.5, height);
          particle.setAlpha(0.15 + Math.random() * 0.15);
        },
      });
    }
  }
}
