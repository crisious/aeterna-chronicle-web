import * as Phaser from 'phaser';
import {
  CoachmarkOverlay,
  preloadCoachmarkUiFrameTextures,
} from '../ui/onboarding/CoachmarkOverlay';
import type { CoachmarkSpec } from '../ui/onboarding/types';

const QA_COACHMARK: CoachmarkSpec = {
  id: 'coachmark.frame.qa',
  system: 'movement',
  phase: 'opening_cinematic',
  title: '첫 이동 안내',
  body: 'WASD로 이동하고 화면의 상호작용 대상을 확인하세요.',
  highlight: { x: 0.07, y: 0.84, w: 0.24, h: 0.1 },
  advanceOn: { kind: 'click' },
  skippable: true,
  replayable: true,
};

export class CoachmarkQaScene extends Phaser.Scene {
  private overlay?: CoachmarkOverlay;

  constructor() {
    super({ key: 'CoachmarkQaScene' });
  }

  preload(): void {
    preloadCoachmarkUiFrameTextures(this);
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0c1422');

    this.add.text(24, 24, 'Coachmark Frame QA', {
      fontSize: '24px',
      color: '#d7f8ff',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });
    this.add.text(24, 58, 'Aseprite UI-HUD-005-DEF panel + UI-BTN-006-DEF action buttons', {
      fontSize: '14px',
      color: '#9fb4d0',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });

    this.add.rectangle(width * 0.19, height * 0.89, width * 0.24, height * 0.1, 0x17324a, 0.9)
      .setStrokeStyle(2, 0x6fd4ff, 0.6);
    this.add.text(width * 0.09, height * 0.875, '[WASD] 이동', {
      fontSize: '20px',
      color: '#c9f6ff',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });

    this.overlay = new CoachmarkOverlay({
      scene: this,
      frameQa: true,
    });
    this.overlay.show(QA_COACHMARK);

    this.time.delayedCall(120, () => this.overlay?.writeFrameQaProbe('ready'));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyOverlay());
  }

  private destroyOverlay(): void {
    this.overlay?.writeFrameQaProbe('hidden');
    this.overlay?.destroy();
    this.overlay = undefined;
  }
}
