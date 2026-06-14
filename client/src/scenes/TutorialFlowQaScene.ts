import * as Phaser from 'phaser';
import {
  TutorialFlowManager,
  preloadTutorialFlowUiFrameTextures,
} from '../ui/TutorialFlowManager';

export class TutorialFlowQaScene extends Phaser.Scene {
  private tutorial?: TutorialFlowManager;

  constructor() {
    super({ key: 'TutorialFlowQaScene' });
  }

  preload(): void {
    preloadTutorialFlowUiFrameTextures(this);
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#111827');

    this.add.text(24, 24, 'Tutorial Flow Frame QA', {
      fontSize: '24px',
      color: '#d7f8ff',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });
    this.add.text(24, 58, 'Aseprite UI-HUD-005-DEF tutorial panel frame', {
      fontSize: '14px',
      color: '#9fb4d0',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });

    this.add.rectangle(width / 2, height / 2, 620, 320, 0x1d2a3f, 0.28)
      .setStrokeStyle(1, 0x5d7599, 0.5);

    try {
      localStorage.removeItem('aeterna_tutorial_progress');
    } catch (_error) {
      // QA route는 localStorage 차단 환경에서도 첫 스텝 렌더를 계속 검증한다.
    }

    this.tutorial = new TutorialFlowManager(this, { frameQa: true });
    this.tutorial.start();

    this.time.delayedCall(250, () => this.tutorial?.writeFrameQaProbe('ready'));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyTutorial());
  }

  private destroyTutorial(): void {
    this.tutorial?.writeFrameQaProbe('hidden');
    this.tutorial?.destroy();
    this.tutorial = undefined;
  }
}
