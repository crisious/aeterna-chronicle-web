import * as Phaser from 'phaser';
import {
  TutorialManager,
  preloadTutorialManagerUiFrameTextures,
} from '../ui/TutorialManager';

export class TutorialManagerQaScene extends Phaser.Scene {
  private tutorial?: TutorialManager;

  constructor() {
    super({ key: 'TutorialManagerQaScene' });
  }

  preload(): void {
    preloadTutorialManagerUiFrameTextures(this);
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0e1828');

    this.add.text(24, 24, 'Tutorial Manager Frame QA', {
      fontSize: '24px',
      color: '#d7f8ff',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });
    this.add.text(24, 58, 'Aseprite UI-HUD-005-DEF panel + UI-BTN-006-DEF action buttons', {
      fontSize: '14px',
      color: '#9fb4d0',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });

    this.add.rectangle(width * 0.5, height * 0.5, width * 0.4, height * 0.4, 0x17324a, 0.42)
      .setStrokeStyle(2, 0x6fd4ff, 0.38);

    try {
      localStorage.removeItem('aeterna_tutorial_step');
    } catch (_error) {
      // QA route는 localStorage 차단 환경에서도 첫 스텝 렌더를 계속 검증한다.
    }

    this.tutorial = new TutorialManager(this, 'http://127.0.0.1:1', { frameQa: true });
    this.tutorial.start();

    this.time.delayedCall(180, () => this.tutorial?.writeFrameQaProbe('ready'));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyTutorial());
  }

  private destroyTutorial(): void {
    this.tutorial?.writeFrameQaProbe('hidden');
    this.tutorial?.stop();
    this.tutorial = undefined;
  }
}
