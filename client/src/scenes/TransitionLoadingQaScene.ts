import * as Phaser from 'phaser';
import {
  SceneTransitionManager,
  VfxPlayer,
  getVfxFallbackTextureForType,
  preloadVfxFallbackTextures,
  preloadTransitionLoadingUiFrameTextures,
  type VfxType,
} from './TransitionEffects';

const TRANSITION_VFX_FALLBACK_QA_TYPES = new Set<VfxType>([
  'hit_slash',
  'hit_blunt',
  'hit_magic',
  'hit_critical',
  'skill_fire',
  'skill_ice',
  'skill_lightning',
  'skill_shadow',
  'skill_heal',
  'levelup',
  'enhance_success',
  'enhance_fail',
  'death_dissolve',
  'revive_glow',
]);

export class TransitionLoadingQaScene extends Phaser.Scene {
  private transitionManager?: SceneTransitionManager;
  private indicator?: { destroy: () => void };

  constructor() {
    super({ key: 'TransitionLoadingQaScene' });
  }

  preload(): void {
    preloadTransitionLoadingUiFrameTextures(this);
    preloadVfxFallbackTextures(this);
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#07111f');

    this.add.text(24, 24, 'Transition Loading Frame QA', {
      fontSize: '24px',
      color: '#d7f8ff',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });
    this.add.text(24, 58, 'Aseprite UI-HUD-005-DEF panel + UI-BTN-005-DEF spinner track', {
      fontSize: '14px',
      color: '#9fb4d0',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });
    this.add.rectangle(width / 2, height / 2, 520, 300, 0x203248, 0.24)
      .setStrokeStyle(1, 0x6688aa, 0.34);

    this.transitionManager = new SceneTransitionManager(this, { frameQa: true });
    this.indicator = this.transitionManager.showLoadingIndicator();

    this.time.delayedCall(180, () => this.transitionManager?.writeLoadingFrameQaProbe('ready'));
    this.startTransitionVfxFallbackQaIfNeeded();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyIndicator());
  }

  private startTransitionVfxFallbackQaIfNeeded(): void {
    const type = this.readTransitionVfxFallbackQaType();
    if (!type) return;

    const { width, height } = this.cameras.main;
    const expectedTexture = getVfxFallbackTextureForType(type);
    const sprite = new VfxPlayer(this).play(type, width / 2, height / 2 + 116, { scale: 1.35 });

    sprite?.setDepth(10000);

    this.time.delayedCall(80, () => {
      if (typeof document === 'undefined' || !document.body) return;

      const renderedTextureKey = sprite?.texture.key ?? null;
      const fallbackImageRendered = sprite?.active === true && renderedTextureKey === expectedTexture.key;

      document.body.dataset.aeternaTransitionVfxFallbackQa = JSON.stringify({
        status: fallbackImageRendered ? 'ready' : 'missing-vfx',
        type,
        expectedTextureKey: expectedTexture.key,
        renderedTextureKey,
        fallbackImageRendered,
        proceduralFallbackRendered: sprite === null,
        displayWidth: sprite?.displayWidth ?? 0,
        displayHeight: sprite?.displayHeight ?? 0,
        missingTextureKeys: this.textures.exists(expectedTexture.key) ? [] : [expectedTexture.key],
        visibleCanvasCount: document.querySelectorAll('canvas').length,
      });
    });
  }

  private readTransitionVfxFallbackQaType(): VfxType | null {
    if (typeof window === 'undefined') return null;

    const rawType = new URLSearchParams(window.location.search).get('transitionVfxFallbackQa');
    if (!rawType || !TRANSITION_VFX_FALLBACK_QA_TYPES.has(rawType as VfxType)) return null;

    return rawType as VfxType;
  }

  private destroyIndicator(): void {
    this.indicator?.destroy();
    this.indicator = undefined;
    this.transitionManager?.writeLoadingFrameQaProbe('hidden');
    this.transitionManager = undefined;
  }
}
