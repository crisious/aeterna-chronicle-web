import * as Phaser from 'phaser';
import { ComboUI, preloadComboUiFrameTextures } from '../ui/ComboUI';

export class ComboUiQaScene extends Phaser.Scene {
  private comboUi?: ComboUI;

  constructor() {
    super({ key: 'ComboUiQaScene' });
  }

  preload(): void {
    preloadComboUiFrameTextures(this);
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x07101f, 1);
    this.add.text(24, 24, 'ComboUI Frame QA', {
      fontSize: '24px',
      color: '#d8ecff',
      fontFamily: 'NanumGothic, sans-serif',
    }).setDepth(10);
    this.add.text(24, 58, 'Aseprite UI-BTN-005 chain gauge frame', {
      fontSize: '14px',
      color: '#8aa1b8',
      fontFamily: 'NanumGothic, sans-serif',
    }).setDepth(10);

    this.add.rectangle(width - 740, 140, 360, 150, 0x1d2a3f, 0.28)
      .setStrokeStyle(1, 0x31516f, 0.5);

    this.comboUi = new ComboUI(this, { frameQa: true });
    this.comboUi.updateHitCount(24, 1.75);
    this.comboUi.updateHints([
      { comboName: '전격 강타', nextSkill: 'ek_shield_bash', progress: 0.8 },
      { comboName: '에테르 폭쇄', nextSkill: 'ek_ether_explode_sword', progress: 0.4 },
    ], {
      ek_shield_bash: '방패 강타',
      ek_ether_explode_sword: '에테르 폭발검',
    });
    this.comboUi.showComboAchieved({
      comboName: '전격 강타',
      damageBonus: 40,
      bonusDescription: '+40% 데미지',
    });

    this.time.delayedCall(120, () => this.comboUi?.writeFrameQaProbe('ready'));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyComboUi());
  }

  update(_time: number, delta: number): void {
    this.comboUi?.update(delta);
  }

  private destroyComboUi(): void {
    this.comboUi?.writeFrameQaProbe('hidden');
    this.comboUi?.destroy();
    this.comboUi = undefined;
  }
}
