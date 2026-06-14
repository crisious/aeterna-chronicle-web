import * as Phaser from 'phaser';
import {
  SceneTransitionManager,
  preloadTransitionLoadingUiFrameTextures,
} from './TransitionEffects';

export class TransitionLoadingQaScene extends Phaser.Scene {
  private transitionManager?: SceneTransitionManager;
  private indicator?: { destroy: () => void };

  constructor() {
    super({ key: 'TransitionLoadingQaScene' });
  }

  preload(): void {
    preloadTransitionLoadingUiFrameTextures(this);
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyIndicator());
  }

  private destroyIndicator(): void {
    this.indicator?.destroy();
    this.indicator = undefined;
    this.transitionManager?.writeLoadingFrameQaProbe('hidden');
    this.transitionManager = undefined;
  }
}
