import * as Phaser from 'phaser';
import {
  DialogueBox,
  preloadDialogueBoxUiFrameTextures,
} from '../ui/DialogueBox';

export class DialogueBoxQaScene extends Phaser.Scene {
  private dialogueBox?: DialogueBox;

  constructor() {
    super({ key: 'DialogueBoxQaScene' });
  }

  preload(): void {
    preloadDialogueBoxUiFrameTextures(this);
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const isNextIndicatorQa = typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).get('dialogueBoxNextIndicatorQa') === '1';
    this.cameras.main.setBackgroundColor('#121725');

    this.add.text(24, 24, 'Dialogue Box Frame QA', {
      fontSize: '24px',
      color: '#f8e6a0',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });
    this.add.text(24, height - 48, 'Aseprite UI-HUD-006-DEF panel + UI-BTN-006-DEF choice buttons + skill_mw_arrow next indicator', {
      fontSize: '14px',
      color: '#aeb8d6',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });

    this.add.rectangle(width / 2, height / 2, 640, 300, 0x233047, 0.28)
      .setStrokeStyle(1, 0x6b7da0, 0.5);

    this.dialogueBox = new DialogueBox(this, {
      width: 860,
      height: 220,
      typingSpeed: 1,
      frameQa: true,
    });

    const options = isNextIndicatorQa ? [] : [
      { id: 'trade', text: '거래한다' },
      { id: 'relic', text: '의귀 물건을 얻는다' },
      { id: 'leave', text: '지금은 시간이 없어.' },
    ];

    this.dialogueBox.showNode(
      {
        id: 'dialogue-box-frame-qa',
        speaker: '유령 상인 고로디',
        text: isNextIndicatorQa
          ? 'Aseprite 다음 표시기 아이콘이 텍스트 glyph 대신 먼저 렌더되는지 확인합니다.'
          : 'Aseprite 대화창 프레임과 선택지 버튼 프레임이 절차 사각형 대신 먼저 렌더되는지 확인합니다.',
        isEnd: false,
      },
      options,
      () => undefined,
      () => undefined,
    );

    this.time.delayedCall(350, () => this.dialogueBox?.writeFrameQaProbe('ready'));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyDialogueBox());
  }

  private destroyDialogueBox(): void {
    this.dialogueBox?.destroy();
    this.dialogueBox = undefined;
  }
}
