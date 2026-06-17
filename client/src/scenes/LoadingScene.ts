/**
 * LoadingScene.ts — 에셋 로딩 화면
 * 
 * 2단계 로딩:
 * Phase 1 (preload): 배경 이미지 1장만 로드
 * Phase 2 (create): UI 구성 → 나머지 에셋 큐 등록 → 수동 load.start()
 */

import * as Phaser from 'phaser';
import { AssetManager, LOADING_TIPS } from '../assets/AssetManager';
import { getSpriteResourceForSkillIcon } from '../assets/spriteResourceManifest';
import { SoundManager } from '../sound/SoundManager';

interface LoadingSceneData {
  nextScene: string;
  nextSceneData?: unknown;
  zoneId?: string;
  qaHold?: boolean;
}

const LOADING_UI_FRAME_TEXTURES = {
  panel: {
    key: 'ui_frame_UI-HUD-005-DEF',
    path: 'assets/generated/ui/frames/UI-HUD-005-DEF.png',
  },
  progressTrack: {
    key: 'ui_frame_UI-BTN-005-DEF',
    path: 'assets/generated/ui/frames/UI-BTN-005-DEF.png',
  },
} as const;

const LOADING_TIP_ICON_ID = 'skill_mw_bolt';
const LOADING_TIP_ICON_RESOURCE = getSpriteResourceForSkillIcon(LOADING_TIP_ICON_ID);
const LOADING_TIP_ICON_SIZE = 18;

export class LoadingScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Rectangle;
  private progressText!: Phaser.GameObjects.Text;
  private loadingDotsText!: Phaser.GameObjects.Text;
  private tipText!: Phaser.GameObjects.Text;
  private tipIcon: Phaser.GameObjects.Image | null = null;
  private tipIconFallbackRendered = false;
  private missingTipIconKeys: string[] = [];
  private sceneData!: LoadingSceneData;
  private dotCount = 0;

  constructor() {
    super({ key: 'LoadingScene' });
  }

  init(data: LoadingSceneData): void {
    this.sceneData = data ?? { nextScene: 'MainMenuScene' };
    this.tipIcon = null;
    this.tipIconFallbackRendered = false;
    this.missingTipIconKeys = [];
  }

  // Phase 1: 배경 이미지만 로드
  preload(): void {
    this.load.image('loading_bg', 'assets/generated/environment/backgrounds/ABY-BG-FAR-NIGHT.png');
    for (const texture of Object.values(LOADING_UI_FRAME_TEXTURES)) {
      if (!this.textures.exists(texture.key)) {
        this.load.image(texture.key, texture.path);
      }
    }
    if (LOADING_TIP_ICON_RESOURCE && !this.textures.exists(LOADING_TIP_ICON_RESOURCE.key)) {
      this.load.image(LOADING_TIP_ICON_RESOURCE.key, LOADING_TIP_ICON_RESOURCE.path);
    }
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
    this._addLoadingFrame(width / 2, height * 0.54, 720, 620, LOADING_UI_FRAME_TEXTURES.panel);

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

    this._addLoadingFrame(barX + barW / 2, barY, barW + 34, barH + 26, LOADING_UI_FRAME_TEXTURES.progressTrack);
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

    const tipY = height * 0.78;
    this._addLoadingTipIcon(width / 2 - 270, tipY);
    this.tipText = this.add.text(this.tipIcon?.active === true ? width / 2 + 12 : width / 2, tipY, '', {
      fontSize: '12px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#8888aa',
      wordWrap: { width: this.tipIcon?.active === true ? 500 : 520 }, align: 'center',
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
      if (this.sceneData.qaHold === true) {
        return;
      }

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

  private _addLoadingFrame(
    x: number,
    y: number,
    width: number,
    height: number,
    texture: typeof LOADING_UI_FRAME_TEXTURES[keyof typeof LOADING_UI_FRAME_TEXTURES],
  ): void {
    if (this.textures.exists(texture.key)) {
      this.add.image(x, y, texture.key)
        .setDisplaySize(width, height)
        .setAlpha(0.9);
      this.add.rectangle(x, y, width, height, 0x000000, 0)
        .setStrokeStyle(1, 0x4a4a6a);
      return;
    }

    // Aseprite loading UI frame 로드 실패 시에만 사용하는 안전 fallback.
    this.add.rectangle(x, y, width, height, 0x0a0a2e, 0.66)
      .setStrokeStyle(1, 0x4a4a6a);
  }

  private _addLoadingTipIcon(x: number, y: number): void {
    if (!LOADING_TIP_ICON_RESOURCE || !this.textures.exists(LOADING_TIP_ICON_RESOURCE.key)) {
      this.tipIconFallbackRendered = true;
      this.missingTipIconKeys.push(LOADING_TIP_ICON_RESOURCE?.key ?? 'loading_tip_icon');
      return;
    }

    this.tipIcon = this.add.image(x, y, LOADING_TIP_ICON_RESOURCE.key)
      .setName('loading_tip_icon')
      .setAlpha(0.94);
    this.tipIcon.setDisplaySize(LOADING_TIP_ICON_SIZE, LOADING_TIP_ICON_SIZE);
    this.tipIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  private _showRandomTip(): void {
    const tip = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
    this.tipIconFallbackRendered = this.tipIcon?.active !== true;
    this.tipText?.setText(this.tipIcon?.active === true ? tip : `💡 ${tip}`);
    this._writeLoadingFrameQaProbe();
  }

  private _isLoadingFrameQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('debugScene') === 'loading' || params.get('loadingFrameQa') === '1';
  }

  private _writeLoadingFrameQaProbe(): void {
    if (!this._isLoadingFrameQaRoute() || typeof document === 'undefined') return;

    const tipLabel = this.tipText?.text ?? '';
    document.body.dataset.aeternaLoadingFrameQa = JSON.stringify({
      status: 'ready',
      tipIcon: {
        iconId: LOADING_TIP_ICON_ID,
        expectedKey: LOADING_TIP_ICON_RESOURCE?.key ?? null,
        renderedCount: this.tipIcon?.active === true ? 1 : 0,
        renderedKey: this.tipIcon?.active === true ? this.tipIcon.texture.key : null,
        displayWidth: this.tipIcon?.active === true ? this.tipIcon.displayWidth : 0,
        displayHeight: this.tipIcon?.active === true ? this.tipIcon.displayHeight : 0,
        fallbackRendered: this.tipIconFallbackRendered,
        legacyGlyphPresent: tipLabel.includes('💡'),
        label: tipLabel,
      },
      missingTipIconKeys: this.missingTipIconKeys,
    });
  }
}
